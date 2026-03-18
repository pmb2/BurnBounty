# Auth Productionization Pass Report

Implemented. The auth productionization pass is now in place with durable Postgres-backed auth state, transactional challenge consumption, DB-enforced wallet uniqueness, embedded-wallet hardening, and updated docs/tests.

## Pre-edit plan + migration risks (executed)

1. Targeted files: auth domain modules (`lib/auth/*`), auth routes (`app/api/auth/**`), DB/migrations (`db/migrations/*`, `lib/db/*`), auth tests (`tests/auth/*`), and auth docs (`README`, `CHANGELOG`, `docs/auth-*`, `docs/api`, deployment docs).
2. Anticipated data risks: existing sessions invalidating under new `sid`/revocation flow, in-memory challenge state being non-migratable, and duplicate wallet bindings failing once canonical unique constraints are enforced.

## Critical crypto review (explicit)

1. Library used: `bitcore-lib-cash` in `lib/auth/bch-message.ts`.
2. It is BCH-specific distribution, but historically derived from Bitcoin tooling lineage.
3. Verification semantics are BCH-correct for this implementation path: deterministic challenge text + compact signed-message verification + network-aware recovered signer address + canonical BCH storage-key comparison.
4. CashAddr/legacy caveat is handled centrally via `lib/auth/bch-address.ts`; all auth comparisons are canonicalized.
5. Current limitation: this path is classic compact signed-message auth, not BIP322. Documented in support matrix and README.

## File-by-file summary

1. `lib/db/postgres.ts`: DB client finalized, migration auto-apply, pg-mem test compatibility, durable test reset via ordered deletes.
2. `db/migrations/20260319_auth_production.sql`: durable auth schema, global canonical wallet uniqueness, single-primary-wallet partial unique index, challenge/session/audit/rate-limit tables.
3. `lib/auth/store.ts`: fully DB-backed auth store, atomic `consumeChallenge`, transactional wallet linking/unlinking, identity metadata patching, canonical address usage.
4. `lib/auth/session.ts`: DB-backed revocable sessions, recent-auth timestamps, secure production secret requirement.
5. `lib/auth/session-edge.ts`: edge token integrity/expiry check retained, production secret handling tightened.
6. `lib/auth/http.ts`: async DB-backed rate-limit integration, better status mapping, optional custom rate-limit key.
7. `lib/auth/rate-limit.ts`: shared DB counter limiter for multi-instance safety.
8. `lib/auth/audit.ts`: durable auth audit events plus safe non-blocking writer helper.
9. `lib/auth/passphrase.ts`: new scrypt-based passphrase digest/verify module with legacy SHA256 compatibility path.
10. `lib/auth/service.ts`: embedded auth now uses scrypt digests, legacy digest upgrade on login, challenge verification + audit integration.
11. `lib/auth/embedded-wallet.ts`: scrypt client KDF, decrypt/export lockout backoff, explicit export-approval boundary, no secret logging.
12. `app/api/auth/login/route.ts`: username-scoped brute-force throttling + safe audit logging.
13. `app/api/auth/register/route.ts`: username-scoped register throttling + safe audit logging.
14. `app/api/auth/logout/route.ts`: explicit secure cookie clearing + DB revocation flow.
15. `app/api/auth/wallet/unlink/route.ts`: recent-auth required before unlink.
16. `app/api/auth/wallet/link/route.ts`: safe audit error path.
17. `app/api/auth/wallet/embedded/create/route.ts`: safe audit error path.
18. `app/api/auth/wallet/embedded/export/request/route.ts`: new sensitive export guard endpoint requiring recent auth.
19. `package.json`: added DB migration script + stable auth test runner config for DB-backed tests.
20. `tests/auth/challenge-lifecycle.test.ts`: async challenge lifecycle and concurrent consume winner test.
21. `tests/auth/store-rules.test.ts`: wallet conflict + embedded login digest behavior.
22. `tests/auth/embedded-parity.test.ts`: embedded/external challenge signature parity.
23. `tests/auth/session-persistence.test.ts`: session issue/validate/revoke + recent-auth checks.
24. Docs updated: `README.md`, `CHANGELOG.md`, `docs/auth-architecture.md`, `docs/auth-schema.md`, `docs/api.md`, `docs/auth-trading.md`, `docs/auth-production-readiness.md`, `docs/wallet-support-matrix.md`, `docs/deployment.md`, `docs/vcs-deploy-flow.md`, `docs/README.md`, `docs/architecture.md`.

## Schema/migration summary

1. Added durable auth schema migration with auth tables for users, identities, wallets, challenges, sessions, audit events, rate limit counters.
2. Enforced canonical BCH wallet uniqueness at DB level with `(chain, address_storage_key)` unique constraint.
3. Added one-primary-wallet-per-user partial unique index.
4. Added challenge/session indexes for operational correctness and query efficiency.
5. Added migration runner script `npm run db:migrate`.

## Session model summary

1. HMAC-signed token contains `sid` and user payload.
2. Session is valid only if token signature verifies and matching DB row exists, unrevoked, unexpired.
3. Logout performs durable revocation (`revoked_at`).
4. Sensitive actions can require `recent_auth_at`.

## Audit event summary

1. Durable events written to `auth_audit_events`.
2. Includes challenge issue/verify/fail, login success/fail, wallet link/unlink, embedded export request, session revocation, sensitive-action reauth fail/success.
3. IP and user-agent are hashed; no key/WIF/seed/decrypted wallet material is logged.
4. Safe write wrapper prevents telemetry failure from crashing auth route error paths.

## Embedded wallet hardening summary

1. Replaced PBKDF2 path with scrypt-based derivation in client wallet encryption/decryption flow.
2. Added failed decrypt/export attempt tracking with timed lockout backoff.
3. Added explicit export-approval boundary (`exportEmbeddedWallet` now requires explicit approval callback).
4. Added server guard endpoint for export request requiring recent-auth session state.

## Tests added/updated

1. `npm run test:auth` now uses DB-backed test mode with pg-mem and single concurrency.
2. Added/updated tests for:
   - deterministic challenge parsing
   - purpose mismatch and replay rejection
   - concurrent challenge verification single-winner behavior
   - session persistence and revocation
   - sensitive-action recent-auth enforcement
   - wallet uniqueness conflict
   - embedded/external signature parity

## Verification run

1. `npm run typecheck` passed.
2. `npm run test:auth` passed (16/16).
3. `npm run build` passed.

## Critical review answers

1. Challenge consumption concurrency safe: Yes (atomic conditional update + concurrent test coverage).
2. Wallet uniqueness DB-enforced: Yes (`unique(chain, address_storage_key)`).
3. Embedded export/reveal protection sufficient: Improved materially (recent-auth export guard endpoint + export approval boundary + lockout), with client-custody caveat.
4. Logout/revocation semantics real: Yes (DB revocation checked during session validation).
5. Multi-instance auth correctness safe: Yes for auth-critical state (DB-backed). Edge middleware still only does token integrity/expiry pre-check; auth-critical authorization remains server-validated.

## Remaining risks

1. Middleware cannot perform DB revocation checks at edge; revoked-cookie UX may pass middleware until server/API validation blocks action.
2. Embedded wallet remains local-custody model; compromised client context can still attack local data.
3. BIP322 auth mode is not yet implemented; classic compact signed-message mode is current supported BCH path.
4. This was integrated into an already dirty branch; review staged commit contents before release.

## Exact steps before production deploy

1. Configure env:
   - `AUTH_JWT_SECRET`
   - `DATABASE_URL` (or `SUPABASE_DB_URL`/`POSTGRES_URL`)
2. Run migration:
   - `npm run db:migrate`
3. Validate locally:
   - `npm run typecheck`
   - `npm run test:auth`
   - `npm run build`
4. Deploy app.
5. Smoke-test auth endpoints:
   - register/login/me/logout
   - wallet challenge/verify
   - link/unlink (ensure recent-auth gate works)
   - export request guard endpoint
6. Monitor `auth_audit_events` for failure spikes (`challenge_failed`, `login_failed`, `sensitive_action_reauth_failed`).
