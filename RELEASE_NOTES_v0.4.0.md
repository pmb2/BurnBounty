## CashBorders v0.4.0

This release delivers the full commit/reveal architecture with upgraded deterministic RNG and complete open-source repo polish.

### Highlights

- Introduced 4-contract model:
  - `PackCommit`
  - `PackReveal`
  - `PrizePool`
  - `CardRedeemer`
- Replaced prior buy-pack flow with explicit two-step `commit -> reveal` UX.
- Upgraded RNG model:
  - multi-source entropy (`N`, `N-1`, `N-2`, commit txid, seed+nonce)
  - 32-round mixing
  - 6-block reveal window enforcement
  - verifier parity in `lib/verify.ts`
  - batch verification scaffolding
- Added extensive docs (`docs/`) covering architecture, contracts, RNG security, API, verification, deployment, legal, and runbooks.
- Added professional OSS governance:
  - CI workflow
  - issue/PR templates
  - contributing, conduct, security policy
  - changelog and release checklist

### Validation

- `npm run typecheck` ✅
- `npm run build` ✅

### Notes

- Chipnet/testnet demo mode.
- Wallet input is raw WIF for POC only. Never use mainnet private keys.
- Legal review required prior to any production/mainnet rollout.
