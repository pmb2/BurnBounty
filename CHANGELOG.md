# Changelog

All notable changes to this project should be documented in this file.

Format inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added
- v0.7 wallet auth flow (`/auth`) with challenge-sign-verify API
- Paytaca/Electron/MetaMask auth UX paths in homepage + auth page
- public profile API/pages and dashboard \"Other Hunters\" links
- trading listings API and `/trading` page
- escrow settlement contract stub (`Escrow.cash`)
- Supabase integration helpers with local fallback

### Fixed
- middleware-protected route model for trading/dashboard/collection auth gating
- MetaMask auth path now uses strict `personal_sign` recovery verification (removed placeholder acceptance)

## [0.7.0] - 2026-03-18

### Added
- production-oriented wallet authentication architecture (challenge-sign-verify)
- app middleware auth guard and session cookie handling
- wallet auth panel and dedicated auth page
- profile discovery and profile detail pages
- trading post listing flow and API surface
- escrow contract template for atomic token-for-BCH settlement
- handbook modal section for login/profiles/trading explanation

### Changed
- app navigation updated to include Auth and Trading routes
- docs expanded to include auth/trading system design

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
