# Auth Schema

BurnBounty auth persistence is Postgres-backed (Supabase/Postgres compatible).

Migration source:

- `db/migrations/20260319_auth_production.sql`

## Tables

## `auth_users`

- `id uuid pk`
- `status text`
- `display_name text`
- `bio text`
- `created_at timestamptz`
- `updated_at timestamptz`

## `auth_identities`

- `id uuid pk`
- `user_id uuid fk auth_users(id)`
- `type text`
- `identifier text`
- `identifier_normalized text`
- `verified_at timestamptz null`
- `metadata jsonb`
- `created_at timestamptz`

Constraints:

- `unique (type, identifier_normalized)`

## `auth_wallets`

- `id uuid pk`
- `user_id uuid null fk auth_users(id)`
- `chain text` (`BCH`)
- `address_normalized text` (canonical cashaddr)
- `address_display text` (legacy display fallback)
- `address_storage_key text` (`<network>:<hash160>`)
- `type text` (`embedded|external|snap`)
- `provider text`
- `sign_mode text`
- `label text`
- `is_primary bool`
- `verified_at timestamptz null`
- `metadata jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Constraints/indexes:

- `unique (chain, address_storage_key)` (global wallet uniqueness)
- partial unique index: one primary per user:
  - `unique (user_id) where user_id is not null and is_primary = true`

## `auth_wallet_challenges`

- `id uuid pk`
- `user_id uuid null fk auth_users(id)`
- `address_normalized text null`
- `address_storage_key text null`
- `purpose text`
- `challenge_text text`
- `challenge_hash text`
- `challenge_version text`
- `nonce text`
- `domain text`
- `provider text`
- `sign_mode text`
- `issued_at timestamptz`
- `expires_at timestamptz`
- `used_at timestamptz null`
- `status text` (`pending|used|expired`)
- `metadata jsonb`
- `created_at timestamptz`

Indexes:

- status/expiry query index
- user index
- nonce index

## `auth_sessions`

- `id uuid pk`
- `user_id uuid fk auth_users(id)`
- `token_hash text unique`
- `issued_at timestamptz`
- `expires_at timestamptz`
- `revoked_at timestamptz null`
- `revocation_reason text null`
- `recent_auth_at timestamptz null`
- `last_seen_at timestamptz null`
- `metadata jsonb`
- `created_at timestamptz`

## `auth_audit_events`

- `id bigserial pk`
- `user_id uuid null fk auth_users(id)`
- `wallet_id uuid null fk auth_wallets(id)`
- `address_normalized text null`
- `event_type text`
- `outcome text`
- `ip_fingerprint text null` (sha256 hash)
- `user_agent_fingerprint text null` (sha256 hash)
- `metadata_json jsonb`
- `created_at timestamptz`

## `auth_rate_limit_counters`

- `scope text`
- `key_hash text`
- `window_start timestamptz`
- `counter integer`
- `updated_at timestamptz`

PK:

- `(scope, key_hash, window_start)`

## Invariants

1. **Challenge single-use**
- enforced by conditional update from pending -> used.

2. **Wallet uniqueness**
- canonical address storage key is globally unique for BCH.

3. **Session revocation**
- session token must validate signature and match non-revoked DB row.

4. **Sensitive action re-auth**
- `recent_auth_at` required for operations like wallet unlink/export request.

## Migration Notes

Legacy in-memory challenge/session state cannot be migrated and expires naturally on restart.

Durable records already in Postgres are preserved by idempotent migration DDL (`create table if not exists` + indexes).
