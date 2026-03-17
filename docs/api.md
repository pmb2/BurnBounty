# API Specifications

All API routes are POST JSON endpoints.

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

## Operational Notes

- POC returns fallback mock txids if chain call is unavailable.
- For production, replace with strict erroring + reliable chain index persistence.
