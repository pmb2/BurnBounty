# Auth Production Signoff

Date: 2026-03-18  
Scope: BurnBounty auth finalization pass

## Signoff Decision

**Decision: Production-ready with caveats.**

Rationale:

- Auth-critical state is durable and DB-backed.
- Challenge replay protection is transactionally enforced.
- Wallet identity uniqueness is DB-enforced with canonical BCH storage keys.
- Session revocation is real and enforced server-side.
- Sensitive actions require recent-auth checks.
- CI now gates auth tests + build/typecheck + migration check.

Caveats are documented below and do not invalidate auth correctness for deployment.

## What Was Verified

1. Auth-critical routes validate sessions through DB-backed `validateSessionToken` before privileged actions.
2. Challenge verification uses deterministic stored challenge text and atomic single-use consume.
3. Wallet identity decisions use canonical normalized BCH address semantics.
4. Legacy shim routes call canonical service path and cannot bypass normalization/verification rules.
5. Session revocation blocks privileged routes after logout.
6. Recent-auth is enforced for embedded export request and wallet unlink.
7. Multi-instance safety exists for auth correctness via shared Postgres state.

## Supported

1. Embedded auth onboarding with scrypt-hardened credentials.
2. External BCH signed-message challenge verification.
3. Optional MetaMask Snap compatibility (experimental, isolated).
4. DB-backed sessions, challenge lifecycle, wallet bindings, audit events, and rate limits.

## Intentionally Unsupported (Current)

1. BIP322 auth-message verification (classic compact BCH signed-message mode is used).
2. Treating edge middleware as authoritative revocation source.
3. Server-custodial guarantees for embedded wallet private key material (client-local custody model).

## Explicit Critical-Question Answers

1. Is there any remaining path that can trust stale session state?  
   - For auth-critical API actions: **No**. They use DB-backed `validateSessionToken`.
   - Edge middleware is only a coarse pre-check.

2. Is there any remaining path that can compare non-canonical BCH wallet identity?  
   - For BCH identity decisions in auth services/store: **No**.
   - Comparisons use canonical normalized storage keys.

3. Can a revoked session still do anything auth-critical?  
   - **No** for server-side auth-critical routes.
   - A revoked token may still pass middleware pre-check until API/session validation denies action.

4. Can a challenge be replayed successfully under concurrency?  
   - **No**. Atomic consume permits one success only; concurrent attempts are rejected as `challenge_used`.

5. Can legacy routes bypass canonical constraints?  
   - **No**. Legacy `/api/auth/challenge` and `/api/auth/verify` route through canonical service verification path.

6. Is the embedded wallet export path protected to the exact degree docs claim?  
   - **Yes** for server-side gate: recent-auth is required for export request.
   - Embedded private key custody remains client-local; compromised client can still compromise local material.

7. Is the system safe to deploy on multiple app instances?  
   - **Yes** for auth correctness, assuming all instances share the same Postgres DB and same JWT secret.

8. Are rollout/rollback instructions complete for an operator who did not build auth?  
   - **Yes**, with checklist in `docs/auth-release-checklist.md` and deployment notes in `docs/deployment.md`.

## Remaining Caveats

1. Edge middleware does not check DB revocation status.
2. Embedded wallet remains client-local trust model.
3. Legacy shims are still present for compatibility; they are deprecated and scheduled for sunset.

## Legacy Shim Decision

Kept temporarily with strict canonical path underneath.

- Endpoints: `/api/auth/challenge`, `/api/auth/verify`
- Status: Deprecated
- Headers: `Deprecation: true`, `Sunset: 2026-06-30`

Removal plan:

1. Monitor usage through sunset window.
2. Remove after client migration is confirmed.

## Release Blockers

None currently blocking deployment of auth subsystem.

## Required Pre-Release Commands

```bash
npm run db:migrate:test
npm run test:auth
npm run typecheck
npm run build
```

For live:

```bash
npm run db:migrate
```
