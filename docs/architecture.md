# Architecture

## Components

1. Frontend (Next.js App Router)
- `/` landing
- `/commit` pack commit workflow
- `/reveal` deterministic reveal and transparency panel
- `/collection` NFT card gallery + burn action
- `/dashboard` aggregate local metrics

2. API Layer
- `POST /api/commit-pack`
- `POST /api/reveal-pack`
- `POST /api/redeem`
- hybrid auth endpoints (`/api/auth/*`)

3. Contract Layer
- `PackCommit`
- `PackReveal`
- `PrizePool`
- `CardRedeemer`

4. Utility Layer
- RNG generation and entropy handling (`lib/rng.ts`)
- deterministic verifier parity (`lib/verify.ts`)
- CashScript orchestration (`lib/cashscript.ts`)
- auth services/challenge/session logic (`lib/auth/*`)

## State Model

POC state is mixed:

- On-chain/intended covenant state (commit/reveal/redeem paths).
- Local browser state (collection, pending reveal, dashboard counters).

Key local storage keys:

- `burnbounty.wif`
- `burnbounty.embedded.v1.<userId>`
- `burnbounty.pendingReveal`
- `burnbounty.collection`
- `burnbounty.totalRedeemed`
- `burnbounty.houseProfit`

## Trust Boundaries

- User seed + nonce generation occurs client-side.
- API verifies reveal commitment against pending state.
- Deterministic card generation can be independently audited using verifier helpers.
- Embedded wallet private keys are generated client-side and encrypted before local persistence.
- External wallet authentication uses one-time nonce challenges with server-side signature verification.

## Sequence (Commit -> Reveal -> Redeem)

Commit:

1. Client generates seed material.
2. API accepts commitment hash and returns pending pack envelope.
3. Pending state includes mocked block references for deterministic reveal in POC.

Reveal:

1. Client submits seed + nonce + pending payload.
2. API validates commitment and window.
3. RNG derives cards from fixed algorithm.
4. API returns reveal transcript and cards.

Redeem:

1. Client selects card.
2. API computes payout/house cut.
3. Contract call attempts distribution and burn path.
4. UI updates collection and dashboard totals.

## Failure Modes

- Chain call unavailable: fallback mock txid is returned for demo continuity.
- Commitment mismatch: reveal fails explicitly.
- Reveal window expiry: reveal fails explicitly.

## Scaling/Hardening Path

- Persist pending packs and card ownership in server-side DB/indexer.
- Replace mock block hash references with chain-indexed values.
- Add covenant state proofs and strict UTXO tracking.
- Keep raw WIF as gameplay-only compatibility mode while auth uses Hybrid Option E.
- Continue hardening DB-backed auth operations and sensitive-action policy as gameplay scope expands.

