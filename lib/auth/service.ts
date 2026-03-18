import {
  buildWalletAuthChallengeMessage,
  challengeExpiryIso,
  createNonce,
  parseWalletAuthChallengeMessage,
  validateParsedWalletAuthChallenge
} from '@/lib/auth/challenge';
import { normalizeBchAddress, addressesEqual } from '@/lib/auth/bch-address';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEvent } from '@/lib/auth/audit';
import { verifyWalletAuthSignature } from '@/lib/auth/verify';
import {
  bindExternalWalletLogin,
  consumeChallenge,
  ensureEmbeddedUser,
  findIdentity,
  getChallenge,
  withWallets,
  resolveUserFromExternalWallet,
  getUserBySessionPayload,
  issueChallenge,
  linkWalletToExistingUser,
  pruneChallenges,
  unlinkWallet,
  updateIdentityMetadata,
  upsertWallet
} from '@/lib/auth/store';
import { markRecentSessionAuth } from '@/lib/auth/session';
import { derivePassphraseDigest, isLegacySha256PassphraseDigest, verifyPassphraseDigest } from '@/lib/auth/passphrase';
import type {
  AuthResult,
  SessionPayload,
  WalletChallengePurpose,
  WalletProviderKind,
  WalletSignMode,
  WalletType
} from '@/types/auth';

export async function registerEmbedded(input: { username: string; passphrase: string; displayName?: string }): Promise<AuthResult> {
  const passphraseHash = await derivePassphraseDigest(input.passphrase);
  const result = await ensureEmbeddedUser({
    username: input.username.trim().toLowerCase(),
    passphraseHash,
    displayName: input.displayName
  });
  await recordAuthAuditEvent({
    eventType: 'embedded_wallet_created',
    outcome: 'success',
    userId: result.user.id,
    metadata: { source: 'register_embedded' }
  });
  return result;
}

export async function loginEmbeddedUser(input: { username: string; passphrase: string }): Promise<AuthResult> {
  const username = input.username.trim().toLowerCase();
  const identity = await findIdentity('embedded_wallet', username);
  if (!identity) throw authError('invalid_credentials');
  const storedDigest = String(identity.metadata?.passphraseHash || '');
  const valid = await verifyPassphraseDigest(input.passphrase, storedDigest);
  if (!valid) throw authError('invalid_credentials');

  if (isLegacySha256PassphraseDigest(storedDigest)) {
    const upgradedDigest = await derivePassphraseDigest(input.passphrase);
    await updateIdentityMetadata(identity.id, {
      passphraseHash: upgradedDigest,
      passphraseHashUpgradedAt: new Date().toISOString()
    });
  }

  const result = await withWallets(identity.userId);
  await recordAuthAuditEvent({
    eventType: 'login_succeeded',
    outcome: 'success',
    userId: result.user.id,
    metadata: { method: 'embedded_wallet' }
  });
  return result;
}

export async function createWalletChallenge(input: {
  actionLabel: string;
  purpose: WalletChallengePurpose;
  walletProvider: WalletProviderKind;
  walletSignMode: WalletSignMode;
  domain: string;
  address?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  await pruneChallenges();
  const nonce = createNonce();
  const issuedAtIso = new Date().toISOString();
  const domain = input.domain.trim().toLowerCase();
  const requiresAddress = input.walletProvider !== 'embedded';
  if (requiresAddress && !input.address) {
    throw authError('invalid_address', 'Address is required for this challenge');
  }
  const normalizedAddress =
    input.walletProvider === 'external_bch' && input.address
      ? normalizeBchAddress(input.address).canonicalCashAddr
      : input.walletProvider === 'external_bch'
        ? (() => {
            throw authError('invalid_address', 'BCH address is required for external BCH challenge');
          })()
        : input.address?.trim();

  const message = buildWalletAuthChallengeMessage({
    purpose: input.purpose,
    walletProvider: input.walletProvider,
    walletSignMode: input.walletSignMode,
    domain,
    nonce,
    issuedAtIso,
    address: normalizedAddress
  });
  const challenge = await issueChallenge({
    challenge: message,
    nonce,
    purpose: input.purpose,
    walletProvider: input.walletProvider,
    walletSignMode: input.walletSignMode,
    address: normalizedAddress,
    userId: input.userId,
    metadata: {
      ...(input.metadata || {}),
      challengeVersion: 'v1',
      domain
    },
    expiresAt: challengeExpiryIso()
  });
  await recordAuthAuditEvent({
    eventType: 'challenge_issued',
    outcome: 'success',
    userId: input.userId || null,
    addressNormalized: normalizedAddress || null,
    metadata: {
      purpose: input.purpose,
      walletProvider: input.walletProvider,
      walletSignMode: input.walletSignMode
    }
  });
  return challenge;
}

function modeToWalletType(mode: WalletSignMode): WalletType {
  if (mode === 'metamask_snap') return 'snap';
  return 'external';
}

export async function verifyWalletChallenge(input: {
  challengeId: string;
  address: string;
  signature: string;
  expectedPurpose?: WalletChallengePurpose;
  session?: SessionPayload | null;
}): Promise<AuthResult> {
  const challenge = await getChallenge(input.challengeId);
  if (!challenge) throw authError('challenge_not_found');

  const parsed = parseWalletAuthChallengeMessage(challenge.challenge);
  validateParsedWalletAuthChallenge({
    parsed,
    expectedPurpose: input.expectedPurpose || challenge.purpose,
    expectedNonce: challenge.nonce,
    expectedDomain: String(challenge.metadata?.domain || parsed.domain),
    expectedProvider: challenge.walletProvider,
    expectedSignMode: challenge.walletSignMode
  });

  if (input.expectedPurpose && challenge.purpose !== input.expectedPurpose) {
    throw authError('challenge_purpose_mismatch');
  }

  const normalizedAddress =
    challenge.walletSignMode === 'metamask_snap' ? input.address.trim() : normalizeBchAddress(input.address).canonicalCashAddr;
  if (challenge.address) {
    const match =
      challenge.walletSignMode === 'metamask_snap'
        ? challenge.address.trim().toLowerCase() === normalizedAddress.toLowerCase()
        : addressesEqual(challenge.address, normalizedAddress);
    if (!match) throw authError('address_mismatch');
  }

  const verified = verifyWalletAuthSignature({
    walletSignMode: challenge.walletSignMode,
    address: normalizedAddress,
    signature: input.signature,
    message: challenge.challenge
  });
  if (!verified.ok) {
    await recordAuthAuditEvent({
      eventType: 'challenge_failed',
      outcome: 'failure',
      userId: input.session?.userId || challenge.userId || null,
      addressNormalized: normalizedAddress || null,
      metadata: { code: verified.code, purpose: challenge.purpose }
    });
    throw authError(verified.code || 'crypto_verification_failed');
  }

  const consumed = await consumeChallenge(input.challengeId);
  await recordAuthAuditEvent({
    eventType: 'challenge_verified',
    outcome: 'success',
    userId: input.session?.userId || consumed.userId || null,
    addressNormalized: normalizedAddress || null,
    metadata: { purpose: consumed.purpose, provider: consumed.walletProvider }
  });
  if (consumed.purpose === 'link_wallet') {
    if (!input.session?.userId) throw authError('auth_required');
    const result = await linkWalletToExistingUser({
      userId: input.session.userId,
      address: normalizedAddress,
      walletType: modeToWalletType(consumed.walletSignMode),
      signMode: consumed.walletSignMode
    });
    await recordAuthAuditEvent({
      eventType: 'wallet_linked',
      outcome: 'success',
      userId: input.session.userId,
      addressNormalized: normalizedAddress,
      metadata: { signMode: consumed.walletSignMode }
    });
    return result;
  }

  if (consumed.purpose === 'verify_wallet' || consumed.purpose === 'sensitive_action') {
    if (!input.session?.userId) throw authError('auth_required');
    if (input.session.sid) {
      await markRecentSessionAuth(input.session.sid);
    }
    await recordAuthAuditEvent({
      eventType: consumed.purpose === 'sensitive_action' ? 'sensitive_action_reauth_succeeded' : 'challenge_verified',
      outcome: 'success',
      userId: input.session.userId,
      addressNormalized: normalizedAddress,
      metadata: { purpose: consumed.purpose }
    });
    return getUserBySessionPayload(input.session);
  }

  if (consumed.purpose === 'register') {
    const existing =
      consumed.walletSignMode === 'metamask_snap'
        ? await findIdentity('metamask_snap', normalizedAddress)
        : await resolveUserFromExternalWallet(normalizedAddress);
    if (existing) throw authError('wallet_already_bound');
  }

  const loginResult = await bindExternalWalletLogin({
    address: normalizedAddress,
    walletType: modeToWalletType(consumed.walletSignMode),
    signMode: consumed.walletSignMode
  });
  await recordAuthAuditEvent({
    eventType: 'login_succeeded',
    outcome: 'success',
    userId: loginResult.user.id,
    addressNormalized: normalizedAddress,
    metadata: { method: consumed.walletSignMode, purpose: consumed.purpose }
  });
  return loginResult;
}

export function getMe(session: SessionPayload): Promise<AuthResult> {
  return getUserBySessionPayload(session);
}

export async function unlinkUserWallet(input: { session: SessionPayload; address: string }) {
  const address = normalizeBchAddress(input.address).canonicalCashAddr;
  await unlinkWallet(input.session.userId, address);
  await recordAuthAuditEvent({
    eventType: 'wallet_unlinked',
    outcome: 'success',
    userId: input.session.userId,
    addressNormalized: address
  });
  return getUserBySessionPayload(input.session);
}

export async function linkEmbeddedWalletRecord(input: {
  session: SessionPayload;
  address: string;
  label?: string;
  metadata?: Record<string, unknown>;
}): Promise<AuthResult> {
  const normalizedAddress = normalizeBchAddress(input.address).canonicalCashAddr;
  await upsertWallet({
    userId: input.session.userId,
    address: normalizedAddress,
    type: 'embedded',
    label: input.label || 'Embedded Wallet',
    verified: true,
    makePrimary: true,
    metadata: input.metadata
  });
  await recordAuthAuditEvent({
    eventType: 'wallet_linked',
    outcome: 'success',
    userId: input.session.userId,
    addressNormalized: normalizedAddress,
    metadata: { provider: 'embedded' }
  });
  return getUserBySessionPayload(input.session);
}
