-- BurnBounty auth productionization schema
-- Run with: npm run db:migrate

create extension if not exists pgcrypto;

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  display_name text,
  bio text,
  avatar_url text,
  rank_label text not null default 'Greenhorn',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table auth_users add column if not exists avatar_url text;
alter table auth_users add column if not exists rank_label text not null default 'Greenhorn';
alter table auth_users add column if not exists status text not null default 'active';
alter table auth_users add column if not exists display_name text;
alter table auth_users add column if not exists bio text;
alter table auth_users add column if not exists created_at timestamptz not null default now();
alter table auth_users add column if not exists updated_at timestamptz not null default now();

create table if not exists auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  type text not null,
  identifier text not null,
  identifier_normalized text not null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (type, identifier_normalized)
);

create table if not exists auth_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth_users(id) on delete set null,
  chain text not null default 'BCH',
  address_normalized text not null,
  address_display text not null,
  address_storage_key text not null,
  type text not null,
  provider text,
  sign_mode text,
  label text,
  is_primary boolean not null default false,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain, address_storage_key)
);

create index if not exists idx_auth_wallets_user_id on auth_wallets(user_id);
create unique index if not exists idx_auth_wallets_single_primary
  on auth_wallets(user_id)
  where user_id is not null and is_primary = true;

create table if not exists auth_wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth_users(id) on delete set null,
  address_normalized text,
  address_storage_key text,
  purpose text not null,
  challenge_text text not null,
  challenge_hash text not null,
  challenge_version text not null default 'v1',
  nonce text not null,
  domain text not null,
  provider text not null,
  sign_mode text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_wallet_challenges_status_expires on auth_wallet_challenges(status, expires_at);
create index if not exists idx_auth_wallet_challenges_user_id on auth_wallet_challenges(user_id);
create index if not exists idx_auth_wallet_challenges_nonce on auth_wallet_challenges(nonce);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  recent_auth_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id on auth_sessions(user_id);
create index if not exists idx_auth_sessions_expires on auth_sessions(expires_at);
create index if not exists idx_auth_sessions_last_seen on auth_sessions(user_id, last_seen_at desc);

create table if not exists auth_wallet_secrets (
  wallet_id uuid primary key references auth_wallets(id) on delete cascade,
  scheme text not null default 'aes-256-gcm',
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_audit_events (
  id bigserial primary key,
  user_id uuid references auth_users(id) on delete set null,
  wallet_id uuid references auth_wallets(id) on delete set null,
  address_normalized text,
  event_type text not null,
  outcome text not null,
  ip_fingerprint text,
  user_agent_fingerprint text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_audit_events_created on auth_audit_events(created_at desc);
create index if not exists idx_auth_audit_events_user on auth_audit_events(user_id);

create table if not exists auth_rate_limit_counters (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  counter integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_start)
);

create table if not exists auth_schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

-- Trading listings (local durable fallback/store)
create table if not exists market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_address text not null,
  card_id text not null,
  price_sats bigint not null check (price_sats > 0),
  token_category text,
  token_commitment text,
  escrow_address text,
  escrow_vout integer,
  card_snapshot jsonb,
  status text not null default 'active',
  buyer_address text,
  sale_txid text,
  buy_txid text,
  sold_at timestamptz,
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table market_listings add column if not exists card_snapshot jsonb;
alter table market_listings add column if not exists status text not null default 'active';
alter table market_listings add column if not exists buyer_address text;
alter table market_listings add column if not exists token_category text;
alter table market_listings add column if not exists token_commitment text;
alter table market_listings add column if not exists escrow_address text;
alter table market_listings add column if not exists escrow_vout integer;
alter table market_listings add column if not exists sale_txid text;
alter table market_listings add column if not exists buy_txid text;
alter table market_listings add column if not exists sold_at timestamptz;

create index if not exists idx_market_listings_created_at on market_listings(created_at desc);
create index if not exists idx_market_listings_seller on market_listings(seller_address);
create index if not exists idx_market_listings_status on market_listings(status);
