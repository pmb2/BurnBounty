# Auth Production Readiness

This document tracks BurnBounty auth readiness for multi-instance production deployment.

## Scope

Auth-critical guarantees covered here:

- durable persistence (no in-memory auth correctness dependency)
- transactional single-use challenge semantics
- canonical BCH wallet uniqueness constraints
- revocable DB-backed sessions
- sensitive-action re-auth gates
- audit event visibility without secret leakage

## Current Readiness

Status: **Production-safe for auth correctness**, with noted operational caveats.

### Completed

1. **Durable auth state**
- `auth_wallet_challenges`, `auth_wallets`, `auth_identities`, `auth_sessions`, `auth_audit_events`, and `auth_rate_limit_counters` are persisted in Postgres.
- Challenge lifecycle no longer depends on process memory.

2. **Transactional challenge single-use**
- Challenge consume is an atomic conditional update:
  - pending
  - unexpired
  - unused
- Concurrent verify attempts yield one success and one `challenge_used`.

3. **DB-enforced wallet uniqueness**
- Unique key on `(chain, address_storage_key)` enforces canonical BCH wallet uniqueness.
- Conflicts are enforced transactionally and surfaced as `wallet_already_bound`.

4. **Session revocation semantics**
- Sessions are persisted with hashed token fingerprints.
- Logout marks `revoked_at`, and revoked sessions fail validation.

5. **Sensitive action posture**
- Session recent-auth marker (`recent_auth_at`) is required for high-risk actions.
- Wallet unlink and embedded export request both enforce recent-auth checks.

6. **Audit trail**
- Auth events are recorded in `auth_audit_events`:
  - challenge issue/verify/fail
  - login success/failure
  - wallet link/unlink
  - embedded wallet creation/export request
  - session revocation
- IP/User-Agent are hashed, not stored raw.

## Authoritative vs Non-Authoritative Trust Paths

Authoritative for privileged/auth-critical decisions:

1. `validateSessionToken` DB-backed validation (`auth_sessions`).
2. Atomic challenge consume transition in `auth_wallet_challenges`.
3. Canonical BCH identity comparisons using normalized storage keys.
4. DB uniqueness constraints for wallet identity binding.

Non-authoritative (coarse filter only):

1. Edge middleware token integrity/expiry check (`verifySessionTokenEdge`).
2. Client-side wallet state/localStorage.

Rule:

- Middleware pass is never sufficient for auth-critical authorization.
- Server route validation is required for all privileged actions.
- This includes non-`/api/auth/*` privileged endpoints such as `POST /api/trading/listings`.

## Required Environment

Set one of:

- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `POSTGRES_URL`

And:

- `AUTH_JWT_SECRET` (required in production)

## Migration / Deploy Sequence

1. Deploy code that includes migration `db/migrations/20260319_auth_production.sql`.
2. Run:

```bash
npm run db:migrate
```

3. Deploy app instances.
4. Confirm auth checks:
- register/login
- wallet challenge/verify
- logout/revocation
- link/unlink conflict paths

## Multi-Instance Notes

- Auth correctness is DB-backed and safe across multiple app instances.
- Rate limits are DB-backed (`auth_rate_limit_counters`) and shared across instances.

## Caveats

1. Edge middleware can only validate signed token integrity and expiry locally.
- Full revocation checks happen in API/session validation against Postgres.
- Keep authorization for sensitive data/actions server-validated.

2. Embedded wallet custody model is **client-encrypted local storage**.
- Export/decrypt is still user-device trust-based.
- Server does not custody decrypted wallet material.

## Operational Monitoring

Track:

- spikes in `challenge_failed` / `login_failed`
- `rate_limited` responses
- repeated `wallet_link_failed` conflicts
- repeated `sensitive_action_reauth_failed`

## Rollback Guidance

Safe rollback requirement:

- do not roll back to builds that depend on in-memory challenge/session logic after migration cutover.

If rollback is required:

1. Keep migrated DB schema intact.
2. Roll back to a build that still supports DB-backed auth tables.
3. Invalidate existing sessions if token format changed.
