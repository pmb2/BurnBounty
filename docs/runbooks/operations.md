# Operations Runbook

## Day-0 Setup

1. Configure chipnet keys in `.env.local`.
2. Compile contracts.
3. Generate and review deployment addresses.
4. Launch app and test commit/reveal/redeem flow.

## Routine Checks

- `npm run typecheck`
- `npm run build`
- test flow script against local server

## Incident: Reveal Mismatch Report

1. Request full reveal transcript from user.
2. Recompute output via `verifyCardGeneration`.
3. Compare entropy root and derived cards.
4. Check block hash and commit txid source correctness.
5. Publish findings with reproducible script output.

## Incident: Pool/Payout Failure

1. Confirm available pool liquidity.
2. Inspect redemption API logs.
3. Reproduce with same card payload.
4. Verify commitment encoding and payout split math.
5. Pause redeem UI if deterministic bug detected.

## Incident: Stuck Pending Reveals

1. Validate reveal window status (`commitHeight + 6`).
2. If expired, present explicit UI error and remediation text.
3. Add operator alert if pending reveal count spikes.

## Production TODOs

- add persistent DB for pending packs and redemptions
- add observability metrics and structured logging
- add key management and signer isolation
- add full chain-index-based block reference retrieval
