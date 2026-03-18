import type { AuthErrorCode } from '@/types/auth-errors';

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: AuthErrorCode, message?: string, status?: number, details?: Record<string, unknown>) {
    super(message || code);
    this.code = code;
    this.status = status || defaultStatusForCode(code);
    this.details = details;
  }
}

export function authError(code: AuthErrorCode, message?: string, status?: number, details?: Record<string, unknown>) {
  return new AuthError(code, message, status, details);
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError;
}

export function authErrorCode(err: unknown): string {
  if (isAuthError(err)) return err.code;
  if (err instanceof Error && err.message) return err.message;
  return 'auth_error';
}

export function authErrorStatus(err: unknown): number {
  if (isAuthError(err)) return err.status;
  return 400;
}

export function defaultStatusForCode(code: AuthErrorCode): number {
  switch (code) {
    case 'rate_limited':
      return 429;
    case 'csrf_origin_mismatch':
      return 403;
    case 'recent_auth_required':
    case 'export_not_allowed':
      return 403;
    case 'auth_required':
    case 'session_invalid':
    case 'session_revoked':
      return 401;
    case 'migration_required':
      return 503;
    case 'wallet_already_bound':
    case 'identity_already_bound':
    case 'username_taken':
      return 409;
    case 'challenge_expired':
    case 'challenge_used':
    case 'challenge_not_found':
      return 410;
    default:
      return 400;
  }
}
