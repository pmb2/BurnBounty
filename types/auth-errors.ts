export type AuthErrorCode =
  | 'invalid_address'
  | 'invalid_signature'
  | 'address_mismatch'
  | 'challenge_expired'
  | 'challenge_used'
  | 'challenge_not_found'
  | 'challenge_purpose_mismatch'
  | 'malformed_challenge'
  | 'malformed_signature'
  | 'wallet_already_bound'
  | 'wallet_not_bound'
  | 'provider_not_supported'
  | 'crypto_verification_failed'
  | 'rate_limited'
  | 'csrf_origin_mismatch'
  | 'auth_required'
  | 'recent_auth_required'
  | 'export_not_allowed'
  | 'session_invalid'
  | 'session_revoked'
  | 'migration_required'
  | 'identity_already_bound'
  | 'username_taken'
  | 'invalid_credentials'
  | 'cannot_remove_last_auth_method'
  | 'purpose_mismatch'
  | 'provider_mode_mismatch'
  | 'challenge_invalid';

export interface AuthErrorLike {
  code: AuthErrorCode;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface SignatureVerificationResult {
  ok: boolean;
  code?: AuthErrorCode;
  normalizedAddress?: string;
  signerAddress?: string;
  signerAddressLegacy?: string;
}
