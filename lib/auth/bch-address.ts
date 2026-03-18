import bitcore from 'bitcore-lib-cash';
import { authError } from '@/lib/auth/errors';

export interface NormalizedBchAddress {
  canonicalCashAddr: string;
  legacyAddress: string;
  network: 'mainnet' | 'testnet' | 'regtest' | 'unknown';
  hashHex: string;
  storageKey: string;
}

function tryParse(input: string) {
  try {
    return (bitcore as any).Address.fromString(input);
  } catch {
    return null;
  }
}

function parseCashAddrWithoutPrefix(input: string) {
  const lower = input.toLowerCase();
  if (!/^[qp][a-z0-9]{41}$/.test(lower)) return null;
  const candidates = ['bitcoincash', 'bchtest', 'bchreg'].map((prefix) => tryParse(`${prefix}:${lower}`)).filter(Boolean);
  if (candidates.length !== 1) return null;
  return candidates[0];
}

function normalizeNetwork(name: string): 'mainnet' | 'testnet' | 'regtest' | 'unknown' {
  if (name === 'livenet') return 'mainnet';
  if (name === 'testnet') return 'testnet';
  if (name === 'regtest') return 'regtest';
  return 'unknown';
}

export function normalizeBchAddress(input: string): NormalizedBchAddress {
  const raw = input.trim();
  const parsed = tryParse(raw) || parseCashAddrWithoutPrefix(raw);
  if (!parsed) {
    throw authError('invalid_address', 'Address is not a valid BCH address');
  }

  const canonicalCashAddr = parsed.toCashAddress().toLowerCase();
  const legacyAddress = parsed.toLegacyAddress();
  const network = normalizeNetwork(parsed.network?.name || 'unknown');
  const hashHex = Buffer.from(parsed.hashBuffer).toString('hex');
  return {
    canonicalCashAddr,
    legacyAddress,
    network,
    hashHex,
    storageKey: `${network}:${hashHex}`
  };
}

export function isValidBchAddress(input: string): boolean {
  try {
    normalizeBchAddress(input);
    return true;
  } catch {
    return false;
  }
}

export function addressesEqual(a: string, b: string): boolean {
  try {
    return normalizeBchAddress(a).storageKey === normalizeBchAddress(b).storageKey;
  } catch {
    return false;
  }
}

export function toDisplayAddress(input: string): string {
  return normalizeBchAddress(input).canonicalCashAddr;
}
