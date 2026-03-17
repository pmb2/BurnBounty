# RNG Design and Security

## Objective

Generate 5-card pack outcomes that are:

- deterministic and reproducible
- publicly auditable
- difficult to manipulate by user, house, or miner in normal conditions

## Commit-Reveal Scheme

Commit step:

- user picks `userSeed` and `nonce`
- user computes `commitmentHash = hash256(userSeed:nonce)`
- commitment hash is submitted before reveal

Reveal step:

- user submits `userSeed` + `nonce`
- backend/contract path verifies commitment match
- reveal must occur within bounded window

## Entropy Inputs

Entropy root uses:

- block hash `N`
- block hash `N-1`
- block hash `N-2`
- commit txid (represented by tx-hash-linked input source)
- `userSeed` and `nonce`

Computed in `deriveEntropyRoot`.

## Mixing Function

`mix32Rounds` applies 32 rounds of:

- round-index materialization
- hash expansion
- bytewise XOR mixing
- rehashing

This reduces structure and provides robust pseudorandom diffusion for small input perturbations.

## Card Generation

1. Expand mixed seed into byte stream.
2. Draw unbiased integers using rejection sampling.
3. Map first draw to tier odds:
- Bronze 70
- Silver 20
- Gold 8
- Diamond 2
4. Draw face value from tier range using unbiased draw.
5. Repeat for 5 cards.

## Why Rejection Sampling

Naive `value % n` can bias outcomes if `2^32` is not divisible by `n`.
Rejection sampling discards out-of-range values before modulo mapping, reducing distribution skew.

## Reveal Window

Current policy: 6 blocks.

Security impact:

- limits extended timing/grinding attempts
- constrains delayed reveal manipulation opportunities

## Public Verifier

`lib/verify.ts` reproduces on-chain/off-chain generation parity.

Inputs:

- `userSeed`
- `nonce`
- `blockHashN`
- `blockHashN1`
- `blockHashN2`
- `commitTxid`

Output:

- `entropyRoot`
- deterministic 5-card set (`tier`, `faceValueSats`)

## Batch Reveal Support

`verifyBatchCardGeneration` supports multi-pack verification by deriving entropy roots for each commit transcript and generating card sets deterministically.

## Threat Model Summary

Mitigated:

- post-commit house prediction before reveal
- simple user grinding after commitment (bounded window + fixed preimage)
- basic modulo-bias exploitation

Not fully mitigated in POC:

- sophisticated chain-level timing assumptions without full indexed block references
- production custody and anti-MEV operational controls

## Production Hardening Recommendations

- enforce canonical block reference lookup in backend indexer
- commit UTXO proof persistence
- external observer endpoint returning reveal transcript hash
- formal statistical test suite in CI (NIST/Dieharder style adapters)

## Demo Showcase Override

For recording/demo purposes, the app supports an explicit non-fairness override:

- `DEMO_SHOWCASE_MODE=true`
- optional `DEMO_SHOWCASE_FORCE_TIER`
- optional `DEMO_SHOWCASE_FACE_SATS`

When enabled, one card per reveal is deterministically replaced for showcase output.
Keep this disabled for fairness/integrity demonstrations.
