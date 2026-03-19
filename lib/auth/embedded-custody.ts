import crypto from 'node:crypto';
import bitcore from 'bitcore-lib-cash';
import { authError } from '@/lib/auth/errors';
import { getWalletSecret, getWalletsForUser, upsertWallet, upsertWalletSecret } from '@/lib/auth/store';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const AAD = Buffer.from('burnbounty.embedded.v2');

function loadMasterKey() {
  const raw = process.env.EMBEDDED_WALLET_MASTER_KEY || '';
  if (!raw && process.env.NODE_ENV === 'production') {
    throw authError('migration_required', 'EMBEDDED_WALLET_MASTER_KEY is required in production', 503);
  }
  if (!raw) {
    return crypto.createHash('sha256').update('burnbounty-dev-embedded-master-key').digest();
  }
  const normalized = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(normalized)) return Buffer.from(normalized, 'hex');
  try {
    const b = Buffer.from(normalized, 'base64');
    if (b.length === 32) return b;
  } catch {
    // fall through
  }
  throw authError('migration_required', 'EMBEDDED_WALLET_MASTER_KEY must be 32-byte hex or base64', 503);
}

function encryptWif(wif: string) {
  const key = loadMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(wif, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    scheme: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

function decryptWif(input: { ciphertext: string; iv: string; authTag: string; scheme: string }) {
  if (input.scheme !== 'aes-256-gcm') throw authError('export_not_allowed', 'Unsupported wallet secret scheme');
  const key = loadMasterKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(input.iv, 'base64'));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

export async function ensureManagedEmbeddedWalletForUser(
  userId: string,
  options?: { makePrimary?: boolean; label?: string; source?: string }
) {
  const wallets = await getWalletsForUser(userId);
  const existing = wallets.find((wallet) => wallet.type === 'embedded' && wallet.metadata?.custody === 'server_managed');
  if (existing) return existing;

  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const wif = privateKey.toWIF();
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();

  const wallet = await upsertWallet({
    userId,
    address,
    type: 'embedded',
    label: options?.label || 'Embedded Wallet',
    verified: true,
    makePrimary: options?.makePrimary !== false,
    provider: 'embedded',
    signMode: 'manual',
    metadata: {
      custody: 'server_managed',
      source: options?.source || 'auto_provision',
      autoProvisionedAt: new Date().toISOString()
    }
  });

  const encrypted = encryptWif(wif);
  await upsertWalletSecret({
    walletId: wallet.id,
    scheme: encrypted.scheme,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    metadata: { source: options?.source || 'auto_provision' }
  });

  await recordAuthAuditEventSafe({
    eventType: 'embedded_wallet_created',
    outcome: 'success',
    userId,
    walletId: wallet.id,
    addressNormalized: wallet.address,
    metadata: { custody: 'server_managed', source: options?.source || 'auto_provision' }
  });

  return wallet;
}

export async function getManagedEmbeddedSignerForUser(userId: string, preferredAddress?: string) {
  const wallets = await getWalletsForUser(userId);
  const pool = wallets.filter((wallet) => wallet.type === 'embedded' && wallet.metadata?.custody === 'server_managed');
  const selected =
    (preferredAddress ? pool.find((wallet) => wallet.address === preferredAddress) : null) ||
    pool.find((wallet) => wallet.isPrimary) ||
    pool[0];

  if (!selected) {
    throw authError('wallet_not_bound', 'No managed embedded wallet available for this account.');
  }

  const secret = await getWalletSecret(selected.id);
  if (!secret) throw authError('export_not_allowed', 'Embedded wallet secret not found');

  const wif = decryptWif(secret);
  return {
    walletId: selected.id,
    address: selected.address,
    wif
  };
}
