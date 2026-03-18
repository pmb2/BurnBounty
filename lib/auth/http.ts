import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { authError, authErrorCode, authErrorStatus, isAuthError } from '@/lib/auth/errors';

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export async function rateLimitOrThrow(
  req: NextRequest,
  scope: string,
  max = 25,
  windowMs = 60_000,
  keyOverride?: string
) {
  const ip = getClientIp(req);
  const key = keyOverride || `${scope}:${ip}`;
  const status = await checkRateLimit({ scope, key, max, windowMs });
  if (!status.allowed) {
    const retrySecs = Math.ceil((status.retryAfterMs || 0) / 1000);
    throw authError('rate_limited', 'Too many requests', 429, { retryAfter: retrySecs });
  }
}

export function jsonAuthError(err: any, fallback = 'Authentication failed') {
  const code = authErrorCode(err);
  const status = Number(isAuthError(err) ? authErrorStatus(err) : mapCodeToStatus(code));
  const body: Record<string, unknown> = {
    ok: false,
    error: code === 'auth_error' ? fallback : code
  };
  if (isAuthError(err) && err.details) body.details = err.details;
  if (isAuthError(err) && err.details?.retryAfter) body.retryAfter = err.details.retryAfter;
  if (err?.retryAfter) body.retryAfter = err.retryAfter;
  return NextResponse.json(body, { status });
}

export function enforceSameOriginOrThrow(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return;
  const originHost = (() => {
    try {
      return new URL(origin).host;
    } catch {
      return '';
    }
  })();
  if (originHost && originHost !== host) {
    const err = new Error('csrf_origin_mismatch');
    (err as any).status = 403;
    throw err;
  }
}

function mapCodeToStatus(code: string): number {
  switch (code) {
    case 'rate_limited':
    case 'RATE_LIMITED':
      return 429;
    case 'csrf_origin_mismatch':
    case 'CSRF_ORIGIN_MISMATCH':
      return 403;
    case 'auth_required':
    case 'session_invalid':
    case 'session_revoked':
    case 'AUTH_REQUIRED':
      return 401;
    case 'invalid_credentials':
    case 'INVALID_CREDENTIALS':
    case 'invalid_signature':
    case 'INVALID_SIGNATURE':
    case 'address_mismatch':
    case 'ADDRESS_MISMATCH':
    case 'purpose_mismatch':
    case 'PURPOSE_MISMATCH':
    case 'challenge_purpose_mismatch':
    case 'malformed_challenge':
    case 'malformed_signature':
    case 'invalid_address':
    case 'provider_mode_mismatch':
    case 'provider_not_supported':
    case 'crypto_verification_failed':
      return 400;
    case 'wallet_already_bound':
    case 'wallet_not_bound':
    case 'identity_already_bound':
    case 'username_taken':
    case 'cannot_remove_last_auth_method':
    case 'WALLET_ALREADY_LINKED':
    case 'USERNAME_TAKEN':
    case 'IDENTITY_ALREADY_BOUND':
      return 409;
    case 'challenge_expired':
    case 'challenge_used':
    case 'challenge_not_found':
    case 'CHALLENGE_EXPIRED':
    case 'CHALLENGE_ALREADY_USED':
    case 'CHALLENGE_NOT_FOUND':
      return 410;
    case 'migration_required':
      return 503;
    default:
      return 400;
  }
}
