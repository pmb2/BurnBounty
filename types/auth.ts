export type AuthIdentityType =
  | 'embedded_wallet'
  | 'external_bch_wallet'
  | 'metamask_snap'
  | 'email'
  | 'guest'
  | 'device';

export type WalletType = 'embedded' | 'external' | 'snap';
export type WalletChallengePurpose = 'login' | 'register' | 'link_wallet' | 'verify_wallet' | 'sensitive_action';
export type WalletProviderKind = 'embedded' | 'external_bch' | 'metamask_snap';
export type WalletSignMode = 'paytaca' | 'electrum' | 'manual' | 'metamask_snap';

export interface UserProfile {
  displayName?: string;
  bio?: string;
}

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'suspended';
  profile: UserProfile;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  type: AuthIdentityType;
  identifier: string;
  verifiedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WalletRecord {
  id: string;
  userId: string | null;
  chain: 'BCH';
  address: string;
  addressStorageKey?: string;
  type: WalletType;
  label?: string;
  isPrimary: boolean;
  verifiedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WalletChallenge {
  id: string;
  address?: string;
  userId?: string;
  challenge: string;
  nonce: string;
  purpose: WalletChallengePurpose;
  walletProvider: WalletProviderKind;
  walletSignMode: WalletSignMode;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SessionPayload {
  sid?: string;
  userId: string;
  primaryAddress?: string | null;
  authMethod: AuthIdentityType;
  exp?: number;
  iat?: number;
}

export interface AuthResult {
  user: User;
  wallets: WalletRecord[];
  primaryWallet: WalletRecord | null;
}
