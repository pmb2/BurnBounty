# Changelog

All notable changes to this project should be documented in this file.

Format inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added
- demo showcase mode with deterministic forced high-tier pull for recording
- `test:demo-flow` script for repeatable demo validation
- sustainable decay economy model with per-card weekly drift and random cap windows
- in-app Bounty Hunter Handbook modal (homepage floating trigger + bottom nav handbook entry)
- series-aware pack pricing (Genesis Beta, Founder Edition, Normal)
- card UI metadata line for drift and cap horizon

### Fixed
- corrected RNG rejection sampling to 64-bit draws for large tier ranges
- added demo-safe `ENABLE_CHAIN_CALLS=false` path to avoid runtime chain dependency issues in local testing
- updated docs/env to describe chain-call toggle behavior

## [0.6.0] - 2026-03-18

### Added
- finalized sustainable decay system with:
- weekly drift bands by tier
- random per-card cap windows (up to 260 weeks)
- 40% floor multiplier enforcement
- `PackCommit.cash` series logic (Series 1/2 + normal pricing)
- `PackReveal.cash` drift/cap payload validation and series minimum drift guards
- `CardRedeemer.cash` fixed-point decay/growth payout formula
- `PrizePool.cash` pro-rata safety payout path
- collection sorting controls and decay metadata display
- Bounty Hunter Handbook game guide modal and triggers

### Changed
- card commitment payload expanded for drift/cap/mint-height encoded fields
- commit/reveal API contracts updated to carry series and pricing metadata
- redeem flow returns multiplier data for payout transparency

## [0.4.0] - 2026-03-17

### Added
- 4-contract architecture (`PackCommit`, `PackReveal`, `PrizePool`, `CardRedeemer`)
- commit/reveal UI and API flow
- upgraded deterministic RNG with verifier parity
- extensive docs in `/docs`
- GitHub CI and contribution templates

### Changed
- migrated from direct buy-pack to commit/reveal pack opening path
- updated deployment and test scripts accordingly

### Notes
- chipnet/testnet POC mode with demo key UX
