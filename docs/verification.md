# Verification Guide

This guide shows how to independently verify reveal outputs.

## Input Transcript Required

Collect the following from reveal payload:

- `userSeed`
- `nonce`
- `blockHashN`
- `blockHashN1`
- `blockHashN2`
- `commitTxid`

## Programmatic Verification

Example Node snippet:

```ts
import { verifyCardGeneration } from './lib/verify';

const result = verifyCardGeneration({
  userSeed,
  nonce,
  blockHashN,
  blockHashN1,
  blockHashN2,
  commitTxid
});

console.log(result.entropyRoot);
console.log(result.cards);
```

Expected:

- `entropyRoot` matches reveal response
- cards (tiers + face values) match reveal response exactly

## Checking NFT Commitments

For each revealed card:

1. map tier to tier byte (`1..4`)
2. encode face value sats as 8-byte big-endian
3. prepend tier byte
4. hex must match `commitmentHex` in response/card metadata

## Batch Verification

Use `verifyBatchCardGeneration` with an array of transcripts to verify multi-pack reveal parity.

## Why This Matters

Independent reproducibility proves the house cannot alter post-commit outcomes without transcript mismatch.
