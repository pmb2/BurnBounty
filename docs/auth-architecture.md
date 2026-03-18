# Auth Architecture (Hybrid Option E + Production Hardening)

## Why Hybrid for BCH

BurnBounty is BCH-native (UTXO), not EVM-native. The app intentionally avoids treating EVM wallet UX as canonical.

Authentication strategy:

1. Embedded wallet onboarding (primary growth path)
2. External BCH wallet challenge/sign/verify (power-user path)
3. MetaMask Snap compatibility (optional and explicitly non-core)

## Core Separation of Concerns

The auth domain is explicitly split into:

- **auth proof**: one-time signed challenge
- **wallet custody**: embedded local encryption vs external wallet ownership
- **session**: DB-backed revocable login state
- **provider transport**: wallet-specific UX wiring (embedded, external, snap)

## Challenge Spec (Deterministic)

All wallet challenges use exact deterministic format:

```text
[BurnBounty] Wallet Authentication
Purpose: <login|register|link_wallet|verify_wallet|sensitive_action>
Domain: <domain>
Nonce: <nonce>
Issued At: <ISO timestamp>
Address: <cashaddr|legacy|not_provided>
Provider: <embedded|external_bch|metamask_snap>
Sign Mode: <paytaca|electrum|manual|metamask_snap>
Statement: Sign this message to authenticate with BurnBounty. This does not create a blockchain transaction and will not cost BCH.
```

Purpose, provider, sign mode, nonce, domain, and statement are validated server-side.

## BCH Address Canonicalization

All comparisons pass through `lib/auth/bch-address.ts`:

- parse cashaddr or legacy formats
- derive canonical lowercase cashaddr for display/storage
- derive `address_storage_key = <network>:<hash160>`
- compare by storage key, not raw user strings

This removes CashAddr-vs-legacy mismatch bugs.

## BCH Signature Verification

Module: `lib/auth/bch-message.ts`

- verifies BCH compact signed-message payloads
- network-aware signer recovery
- canonical normalized address comparison
- typed failure codes (`invalid_address`, `malformed_signature`, `address_mismatch`, etc.)

Library in use: `bitcore-lib-cash`.

- BCH-specific package
- historically descended from BTC tooling lineage
- correctness guarded by BCH address normalization + network-constrained signer matching

## Challenge Lifecycle and Replay Safety

Persistent table: `auth_wallet_challenges`.

Verification flow:

1. Fetch challenge by id
2. Validate deterministic challenge fields/purpose
3. Verify signature
4. Atomically consume challenge:
   - conditional update pending -> used
   - requires unexpired and unused

Concurrent verify attempts are single-winner.

## Session Model

Session token is HMAC-signed payload + DB-backed revocation row.

- cookie: `bb_session`
- payload includes `sid`, `userId`, `authMethod`, `iat`, `exp`
- DB row contains token hash, expiry, revoked state, recent auth timestamp

Auth-critical validation occurs in server session validation (`validateSessionToken`).

## Embedded Wallet Trust Model

Embedded wallet is generated client-side and encrypted in local storage.

- encryption key derived via scrypt (interactive cost parameters)
- decrypt/export attempts are lockout-throttled client-side
- sensitive export flows require recent server-side re-auth confirmation

Server does not store decrypted private keys or seed phrases.

## Sensitive Action Re-Verification

Challenge purpose supports:

- `verify_wallet`
- `sensitive_action`

Server tracks `recent_auth_at` in session records. High-risk actions (e.g. wallet unlink, export request) require recent re-auth.

## MetaMask Snap Containment

MetaMask/Snap path is isolated in dedicated module:

- `lib/auth/metamask-snap.ts`

It does not replace BCH verification primitives and is not default onboarding.

## Multi-Instance Safety

Auth correctness is safe for multi-instance deployment because:

- challenges, sessions, rate limits, wallets, and audit events are durable in Postgres
- uniqueness and single-use semantics are DB-enforced
- no auth-critical state depends on process memory

## Known Limitation

Edge middleware validates token integrity/expiry, but full revocation checks are done server-side against Postgres. Authorization for sensitive operations must always go through server/session validation.
