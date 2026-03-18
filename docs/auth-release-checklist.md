# Auth Release Checklist

Use this checklist before promoting auth changes to live.

## 1) Preconditions

1. `AUTH_JWT_SECRET` is set and rotated per environment policy.
2. Postgres/Supabase DB connectivity is verified.
3. `DATABASE_URL` (or `SUPABASE_DB_URL`) is present in runtime env.
4. Deployment window avoids mixed-version auth rollouts.

## 2) Required Commands (Local/CI)

Run and require passing:

```bash
npm run db:migrate:test
npm run test:auth
npm run typecheck
npm run build
```

Optional one-shot gate:

```bash
npm run release:auth-gate
```

## 3) Pre-Deploy Safety

1. DB backup/snapshot taken.
2. Migration SQL reviewed:
   - `db/migrations/20260319_auth_production.sql`
3. Legacy compatibility routes status reviewed:
   - `/api/auth/challenge` (deprecated)
   - `/api/auth/verify` (deprecated)

## 4) Deploy Order

1. Apply migration:

```bash
npm run db:migrate
```

2. Deploy application version.
3. Confirm containers/instances healthy.

## 5) Post-Deploy Smoke Tests

1. Register embedded account.
2. Login embedded account.
3. `GET /api/auth/me` returns authenticated user.
4. External wallet challenge -> verify succeeds.
5. Reuse same challenge -> fails with `challenge_used`.
6. Logout then `GET /api/auth/me` with old cookie -> `session_revoked` or `session_invalid`.
7. Embedded export request without recent-auth -> `recent_auth_required`.
8. Verify-wallet challenge then export request -> success.
9. Wallet link conflict across users -> `wallet_already_bound`.
10. Trading listing create with revoked session -> denied.

## 6) Immediate Monitoring (First 30–60 min)

Watch `auth_audit_events` for spikes in:

- `challenge_failed`
- `login_failed`
- `wallet_link_failed`
- `wallet_unlink_failed`
- `sensitive_action_reauth_failed`
- `rate_limited` response volume (from app logs/metrics)

## 7) Rollback Triggers

Rollback if:

1. Auth endpoints return persistent 5xx.
2. Valid sessions are broadly rejected unexpectedly.
3. Challenge verification replay safety breaks.
4. Wallet linking creates cross-account conflicts.

## 8) Rollback Procedure

1. Stop rollout.
2. Revert app to prior DB-compatible auth build.
3. Keep DB schema in place (do not drop auth tables during incident rollback).
4. Re-run smoke tests.
5. Invalidate active sessions if token format changed between builds.

## 9) Mixed-Version Safety

Unsafe:

- any instance still relying on in-memory auth state while others use durable DB-backed auth.

Safe:

- all live instances on DB-backed auth version with same challenge/session semantics.

## 10) Multi-Instance Notes

Auth correctness is multi-instance safe when all instances share the same Postgres DB:

- challenge consume state
- wallet uniqueness constraints
- session revocation checks
- rate-limit counters
