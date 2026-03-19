# Changelog

All notable changes to this project should be documented in this file.

Format inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added
- Auth finalization pass:
  - route-level acceptance tests for register/login/me/logout revocation, replay rejection, concurrent verify single-winner semantics, wallet-link conflict, recent-auth enforcement, legacy shim canonical parity, and auth-critical trading listing checks
  - new docs:
    - `docs/auth-release-checklist.md`
    - `docs/auth-operations.md`
    - `docs/auth-production-signoff.md`
  - release command gate: `npm run release:auth-gate`
  - CI gate updates to run auth migration check and auth tests
- UI/UX flow-audit report:
  - `docs/ui-ux-flow-audit.md`
  - onboarding friction map + next-pass priorities
- immersive 3D world scaffolding and pipeline tooling:
  - `components/BountyWorldScene.tsx`
  - `components/ImmersiveAssetStatus.tsx`
  - `data/3d-assets.json`
  - `scripts/validate-3d-assets.ts`
  - `docs/3d-asset-pipeline.md`
  - `public/3d/*` asset directories

### Changed
- core user flow consolidated into hubs:
  - `/play` (access + commit + reveal)
  - `/armory` (inventory + market + ledger)
- legacy route wrappers now redirect:
  - `/commit`, `/reveal`, `/collection`, `/trading`, `/dashboard`
- immersive surfaces upgraded with active telemetry board overlays and motion backdrops.
- immersive scene now reads `data/3d-assets.json` slots and attempts runtime GLB loading with fallback primitives.
- Play and Armory now include a live `Immersive Asset Ops` panel showing scene slot readiness (`Live`, `Missing file`, `Placeholder`).
- Play tab reworked into gameplay hub:
  - deck assembly with inventory-to-deck swaps
  - ranked/unranked queue simulation with match history
  - hunter stats panel (ELO, streak, win rate, total matches)
  - legacy `/commit` and `/reveal` routes now redirect to `/play`
  - auth `next` paths updated from `/play?step=...` to `/play`
- market listing and card presentation updates:
  - listing POST now accepts optional `seller_address` and derives linked wallet safely server-side
  - clearer request validation errors for listing creation
  - trading listings now persist in local Postgres (`market_listings`) with Supabase fallback
  - card UI text now follows rarity color theme (Bronze/Silver/Gold/Diamond)
  - serial/ID line replaced by visible stat summary (drift/cap/burn reward)
  - market tab now renders listing card images and stat snapshots
  - universal buy flow added (`POST /api/trading/listings/[id]/buy`) for authenticated buyers
  - listings now transition `active -> sold` with buyer tracking and buy-button UX
  - market listing form now supports explicit price units (`sats`, `bits`, `mBCH`, `BCH`) with sat/BCH preview
  - listing and purchase actions now use confirmation modals with card imagery and one-click wallet signing
  - market list/buy API now records signed market intent tx markers (`sale_txid`, `buy_txid`) and returns chain commit metadata
- Home onboarding flow now prioritizes one dominant CTA (`Start Playing`) and defers advanced wallet methods.
- Auth Hub now defaults to embedded onboarding and gates external/Snap under explicit advanced options.
- Header wallet state now shows persistent auth status with wallet-type context; gameplay WIF input is collapsed.
- Reveal flow now includes a no-WebGL fallback view so pack reveal remains usable on unsupported clients.
- Navigation labels now reflect gameplay information hierarchy (`Play`, `Inventory`, `Market`, `Profile`).
- Surface styling aligned to BurnBounty board/poster theme using new utility classes (`.bounty-board-bg`, `.bounty-panel`, `.bounty-paper`).
- Legacy compatibility routes now emit explicit deprecation metadata/headers with sunset (`2026-06-30`):
  - `/api/auth/challenge`
  - `/api/auth/verify`
- Trading listing create endpoint now enforces DB-backed authenticated session and canonical wallet ownership checks.
- Auth productionization pass (v0.8 pre-release):
  - durable Postgres-backed auth persistence (`auth_users`, identities, wallets, challenges, sessions, audit events, rate-limits)
  - transactional single-use challenge consumption under concurrent verification
  - DB-enforced canonical BCH wallet uniqueness and single-primary-wallet constraint
  - DB-backed session revocation and recent-auth timestamps for sensitive actions
  - embedded wallet hardening updates:
    - scrypt-based local key derivation (replacing PBKDF2)
    - export/decrypt lockout backoff on repeated failures
    - explicit export-request endpoint requiring recent re-auth
  - new docs:
    - `docs/auth-production-readiness.md`
    - `docs/wallet-support-matrix.md`
  - expanded auth integration tests:
    - concurrent challenge consume winner semantics
    - session issue/validate/revoke lifecycle
    - sensitive-action recent-auth enforcement
- BCH auth cryptography hardening pass:
  - centralized BCH address normalization/equality module
  - dedicated BCH signed-message verification module
  - deterministic challenge parser/validator (v1 format)
  - typed auth error taxonomy across crypto/challenge flows
  - MetaMask Snap verifier isolation module (non-core path)
- extended auth test coverage for:
  - address normalization
  - challenge lifecycle/purpose mismatch/replay
  - BCH signature verification mismatch cases
  - provider containment checks
- Hybrid Option E auth architecture (embedded primary + external BCH signature auth + optional Snap)
- new auth domain model types (`User`, `AuthIdentity`, `WalletRecord`, `WalletChallenge`, `SessionPayload`)
- embedded wallet security module (client-side generation + local encryption/export flow)
- wallet provider abstraction registry (`embedded`, `external_bch`, `metamask_snap`)
- new auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/wallet/challenge`
  - `POST /api/auth/wallet/verify`
  - `POST /api/auth/wallet/link`
  - `POST /api/auth/wallet/unlink`
  - `POST /api/auth/wallet/embedded/create`
- auth test coverage for challenge replay, expiry, signature verification, and wallet-link conflict rules
- v0.7 wallet auth flow (`/auth`) with challenge-sign-verify API
- Paytaca/Electron/MetaMask auth UX paths in homepage + auth page
- public profile API/pages and dashboard \"Other Hunters\" links
- trading listings API and `/trading` page
- escrow settlement contract stub (`Escrow.cash`)
- Supabase integration helpers with local fallback

### Fixed
- legacy card compatibility for redemption:
  - `/api/redeem` now accepts pre-v0.6 card payloads and backfills decay/cap metadata deterministically
  - armory now normalizes older locally stored cards so they display drift/cap data and remain burnable
  - redemption path now normalizes card payloads server-side before payout math/contract invocation
- challenge lifecycle now enforces purpose/domain/nonce integrity via parser validation
- wallet binding compares canonical BCH address keys instead of raw strings
- signature verification logic moved out of route handlers into dedicated primitives
- middleware now verifies signed session payloads (not cookie presence only)
- MetaMask moved to optional experimental lane in UI/docs to remove BCH/EVM architectural confusion
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
