# API Specifications

API routes are JSON endpoints (mostly POST; `/api/auth/me` is GET).

## 1) `POST /api/commit-pack`

Purpose:

- register pending pack commitment and initialize reveal payload

Request:

```json
{
  "wif": "<chipnet_wif>",
  "commitmentHash": "<64-hex hash256(seed:nonce)>"
}
```

Response:

```json
{
  "commitTxid": "...",
  "commitHeight": 1740005,
  "commitmentHash": "...",
  "userAddress": "...",
  "blockHashN": "...",
  "blockHashN1": "...",
  "blockHashN2": "...",
  "revealDeadline": 1740011
}
```

Errors:

- 400 invalid schema / commit failure

## 2) `POST /api/reveal-pack`

Purpose:

- reveal commitment and derive deterministic cards

Request:

```json
{
  "wif": "<chipnet_wif>",
  "userSeed": "...",
  "nonce": "...",
  "pending": {
    "commitTxid": "...",
    "commitHeight": 1740005,
    "commitmentHash": "...",
    "userAddress": "...",
    "blockHashN": "...",
    "blockHashN1": "...",
    "blockHashN2": "..."
  }
}
```

Response:

```json
{
  "revealTxid": "...",
  "cards": [
    {
      "nftId": "...",
      "tier": "Bronze",
      "faceValueSats": 12345,
      "commitmentHex": "..."
    }
  ],
  "entropyRoot": "...",
  "commitmentHash": "...",
  "seedReveal": {
    "userSeed": "...",
    "nonce": "..."
  },
  "blockHashes": {
    "n": "...",
    "n1": "...",
    "n2": "..."
  }
}
```

Errors:

- 400 commitment mismatch
- 400 reveal window expired
- 400 schema failure

## 3) `POST /api/redeem`

Purpose:

- burn a selected card and distribute payout

Request:

- includes `wif` and full `card` payload from collection

Response:

```json
{
  "txid": "...",
  "payout": 12345,
  "houseCut": 3086
}
```

## Compatibility Wrappers

App router wrappers are in:

- `app/api/commit-pack/route.ts`
- `app/api/reveal-pack/route.ts`
- `app/api/redeem/route.ts`

## 4) Auth and Wallet Endpoints (Hybrid Option E)

### `POST /api/auth/register`

Create embedded account identity and session.

Request:

```json
{
  "username": "hunter1",
  "passphrase": "long-passphrase",
  "displayName": "Hunter One"
}
```

### `POST /api/auth/login`

Login via embedded identity.

### `GET /api/auth/me`

Return current session user and linked wallets.

### `POST /api/auth/wallet/challenge`

Create one-time auth/link challenge.

### `POST /api/auth/wallet/verify`

Verify signature, consume challenge, then login/register/link based on challenge purpose.

Current BCH signer compatibility in this build uses classic compact signed-message verification (not BIP322 yet).

Common auth error codes:

- `invalid_address`
- `malformed_signature`
- `invalid_signature`
- `address_mismatch`
- `challenge_not_found`
- `challenge_expired`
- `challenge_used`
- `challenge_purpose_mismatch`
- `wallet_already_bound`
- `auth_required`
- `session_invalid`
- `session_revoked`
- `recent_auth_required`
- `rate_limited`
- `provider_mode_mismatch`

### `POST /api/auth/wallet/link`

Link wallet metadata for embedded wallet registration path.

### `POST /api/auth/wallet/unlink`

Unlink wallet, with protection against removing last viable auth method.

Also requires recent-auth confirmation (`recent_auth_at`) and returns `recent_auth_required` when stale.

### `POST /api/auth/wallet/embedded/create`

Bind embedded wallet address after client-side wallet generation/encryption.

### `POST /api/auth/wallet/embedded/export/request`

Sensitive-action guard for embedded export/reveal flows.

- requires valid session
- requires recent re-auth marker
- returns no private key material
- records auth audit event

### Backward Compatibility

- `POST /api/auth/challenge`
- `POST /api/auth/verify`

## Operational Notes

- POC returns fallback mock txids if chain call is unavailable.
- For production, replace with strict erroring + reliable chain index persistence.
