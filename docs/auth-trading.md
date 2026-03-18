# Auth + Trading Setup (v0.7)

## Environment Variables

Add to `.env.local` (dev) and live env as needed:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_JWT_SECRET=
```

## Recommended Supabase Tables

- `profiles`
  - `address text primary key`
  - `display_name text`
  - `bio text`
  - `score int`
  - `created_at timestamptz default now()`

- `collections`
  - `address text primary key`
  - `cards jsonb`
  - `updated_at timestamptz default now()`

- `listings`
  - `id uuid primary key default gen_random_uuid()`
  - `seller_address text`
  - `card_id text`
  - `price_sats bigint`
  - `note text`
  - `expires_at timestamptz`
  - `created_at timestamptz default now()`

## Routes

- `POST /api/auth/challenge`
- `POST /api/auth/verify`
- `POST /api/auth/logout`
- `GET /api/profiles`
- `GET /api/profile/[address]`
- `GET/POST /api/trading/listings`

## Notes

- Electron/Paytaca verification uses bitcore message verify path.
- MetaMask flow now verifies `personal_sign` server-side via address recovery.
- MetaMask path is for EVM-address auth compatibility; BCH wallet auth remains Paytaca/Electron-first.
- Middleware currently protects `/dashboard`, `/collection`, `/trading`.
