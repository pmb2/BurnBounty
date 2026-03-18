# Auth + Trading Setup

## Summary

BurnBounty uses Hybrid Option E auth:

- Embedded wallet onboarding is primary UX
- External BCH signed-challenge auth is the power-user path
- MetaMask Snap is optional/experimental and non-core

Trading surfaces should always rely on authenticated server-side session checks and canonical wallet ownership records.

## Environment Variables

Required for auth persistence:

```env
AUTH_JWT_SECRET=
DATABASE_URL=
# optional alias if preferred by infra:
SUPABASE_DB_URL=
POSTGRES_URL=
```

Optional Supabase client envs for frontend data integration:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`
- `POST /api/auth/wallet/link`
- `POST /api/auth/wallet/unlink`
- `POST /api/auth/wallet/embedded/create`
- `POST /api/auth/wallet/embedded/export/request`

Compatibility shims:

- `POST /api/auth/challenge`
- `POST /api/auth/verify`

## Persistence and Constraints

Auth-critical state is Postgres-backed:

- identities
- wallet bindings
- challenge/nonce lifecycle
- sessions + revocation
- audit events
- auth rate limits

Key invariants:

- wallet identity uniqueness via canonical BCH storage key
- challenge single-use (atomic consume)
- session revocation enforced by DB lookup

## Trading Integration Notes

Trading APIs should:

1. authenticate via `validateSessionToken`
2. resolve wallet ownership from `auth_wallets`
3. reject stale/revoked sessions
4. use audit events for sensitive state changes

`POST /api/trading/listings` now enforces authenticated DB-backed session validation and requires the seller address to be linked to the authenticated user via canonical BCH wallet identity checks.

Escrow settlement remains covenant-based (`contracts/Escrow.cash`) and should be treated as separate from auth proof logic.

## Security Checklist

- Do not log WIF/seed/decrypted wallet material.
- Enforce recent-auth for sensitive wallet operations.
- Keep MetaMask Snap off by default unless intentionally enabled.
- Run DB migrations before deploying auth-dependent releases.
