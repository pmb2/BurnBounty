import crypto from 'node:crypto';
import { authError } from '@/lib/auth/errors';
import type { WalletChallengePurpose, WalletProviderKind, WalletSignMode } from '@/types/auth';

const CHALLENGE_HEADER = '[BurnBounty] Wallet Authentication';
const CHALLENGE_STATEMENT =
  'Sign this message to authenticate with BurnBounty. This does not create a blockchain transaction and will not cost BCH.';

export interface WalletAuthChallengeInput {
  domain: string;
  purpose: WalletChallengePurpose;
  walletProvider: WalletProviderKind;
  walletSignMode: WalletSignMode;
  nonce: string;
  issuedAtIso: string;
  address?: string;
}

export interface ParsedWalletAuthChallenge {
  purpose: WalletChallengePurpose;
  domain: string;
  nonce: string;
  issuedAt: string;
  address: string;
  walletProvider: WalletProviderKind;
  walletSignMode: WalletSignMode;
  statement: string;
}

const lineDefs = [
  { key: 'Purpose', target: 'purpose' },
  { key: 'Domain', target: 'domain' },
  { key: 'Nonce', target: 'nonce' },
  { key: 'Issued At', target: 'issuedAt' },
  { key: 'Address', target: 'address' },
  { key: 'Provider', target: 'walletProvider' },
  { key: 'Sign Mode', target: 'walletSignMode' },
  { key: 'Statement', target: 'statement' }
] as const;

export function createNonce(size = 16): string {
  return crypto.randomBytes(size).toString('hex');
}

export function challengeExpiryIso(ttlMs = 10 * 60 * 1000): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

export function buildWalletAuthChallengeMessage(input: WalletAuthChallengeInput): string {
  return [
    CHALLENGE_HEADER,
    `Purpose: ${input.purpose}`,
    `Domain: ${input.domain}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAtIso}`,
    `Address: ${input.address || 'not_provided'}`,
    `Provider: ${input.walletProvider}`,
    `Sign Mode: ${input.walletSignMode}`,
    `Statement: ${CHALLENGE_STATEMENT}`
  ].join('\n');
}

export function parseWalletAuthChallengeMessage(message: string): ParsedWalletAuthChallenge {
  const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 9 || lines[0] !== CHALLENGE_HEADER) {
    throw authError('malformed_challenge', 'Challenge header/line count mismatch');
  }
  const parsed: Record<string, string> = {};
  for (let i = 0; i < lineDefs.length; i += 1) {
    const line = lines[i + 1];
    const { key, target } = lineDefs[i];
    const prefix = `${key}: `;
    if (!line.startsWith(prefix)) throw authError('malformed_challenge', `Missing field: ${key}`);
    parsed[target] = line.slice(prefix.length);
  }
  return {
    purpose: parsed.purpose as WalletChallengePurpose,
    domain: parsed.domain,
    nonce: parsed.nonce,
    issuedAt: parsed.issuedAt,
    address: parsed.address,
    walletProvider: parsed.walletProvider as WalletProviderKind,
    walletSignMode: parsed.walletSignMode as WalletSignMode,
    statement: parsed.statement
  };
}

export function validateParsedWalletAuthChallenge(input: {
  parsed: ParsedWalletAuthChallenge;
  expectedPurpose?: WalletChallengePurpose;
  expectedDomain?: string;
  expectedNonce?: string;
  expectedProvider?: WalletProviderKind;
  expectedSignMode?: WalletSignMode;
}) {
  const allowedPurpose: WalletChallengePurpose[] = ['login', 'register', 'link_wallet', 'verify_wallet', 'sensitive_action'];
  if (!allowedPurpose.includes(input.parsed.purpose)) {
    throw authError('malformed_challenge', 'Challenge purpose is invalid');
  }
  const allowedProviders: WalletProviderKind[] = ['embedded', 'external_bch', 'metamask_snap'];
  if (!allowedProviders.includes(input.parsed.walletProvider)) {
    throw authError('provider_not_supported', 'Challenge provider is invalid');
  }
  const allowedModes: WalletSignMode[] = ['paytaca', 'electrum', 'manual', 'metamask_snap'];
  if (!allowedModes.includes(input.parsed.walletSignMode)) {
    throw authError('provider_not_supported', 'Challenge sign mode is invalid');
  }

  if (input.expectedPurpose && input.parsed.purpose !== input.expectedPurpose) {
    throw authError('challenge_purpose_mismatch', 'Challenge purpose mismatch');
  }
  if (input.expectedDomain && input.parsed.domain !== input.expectedDomain) {
    throw authError('malformed_challenge', 'Challenge domain mismatch');
  }
  if (input.expectedNonce && input.parsed.nonce !== input.expectedNonce) {
    throw authError('challenge_invalid', 'Challenge nonce mismatch');
  }
  if (input.expectedProvider && input.parsed.walletProvider !== input.expectedProvider) {
    throw authError('provider_mode_mismatch', 'Challenge provider mismatch');
  }
  if (input.expectedSignMode && input.parsed.walletSignMode !== input.expectedSignMode) {
    throw authError('provider_mode_mismatch', 'Challenge sign mode mismatch');
  }
  if (input.parsed.statement !== CHALLENGE_STATEMENT) {
    throw authError('malformed_challenge', 'Challenge statement mismatch');
  }
  const issued = Date.parse(input.parsed.issuedAt);
  if (Number.isNaN(issued)) {
    throw authError('malformed_challenge', 'Challenge issued-at timestamp invalid');
  }
}

export function challengeStatement(): string {
  return CHALLENGE_STATEMENT;
}
