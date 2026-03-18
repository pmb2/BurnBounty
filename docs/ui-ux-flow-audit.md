# BurnBounty UI/UX Flow Audit (Pass 1)

## Scope
- Audit critical user paths for conversion friction and clarity.
- Align surface styling with existing `public/bg` and `public/cards` visual language.
- Fix reliability issue on reveal flow when WebGL is unavailable.

## Paths Audited

### 1. First Visit -> Onboarding -> First Action
- Start: `/`
- Target: authenticated user reaches `/play?step=commit`

#### Before
- Home presented multiple competing actions (`Commit`, `Reveal`, full wallet auth panel with 3 providers).
- New users had to parse embedded/external/Snap choices immediately.
- Auth intent and next step were not strongly guided.

#### After
- Home has one dominant CTA: `Start Playing` (`/play`).
- Secondary CTA for power users: `I Have A BCH Wallet`.
- Embedded wallet flow remains primary and visually recommended in Auth Hub.
- Advanced wallet methods are explicitly hidden behind a toggle.
- Successful auth now continues to `next` path (default `/commit`).

### 2. Reveal Reliability
- Start: `/play?step=reveal`
- Target: user can always complete reveal flow UI even without GPU/WebGL.

#### Before
- 3D reveal depended on WebGL context; failure produced runtime errors in some clients.

#### After
- `PackReveal3D` now checks WebGL capability client-side.
- If unavailable, UI falls back to deterministic 2D card placeholders/reveal summary.
- Core reveal loop remains usable without 3D rendering support.

### 3. Persistent Wallet State Clarity
- Header now shows auth state badge:
  - `Not signed in`
  - `Embedded: <short address>` or `External: <short address>`
- Gameplay WIF input is collapsed behind `Gameplay Key` to reduce persistent header clutter.
- Copy distinguishes auth signature flows from gameplay key usage.

## Friction Count Snapshot (Current)

### New User (recommended path)
1. Home: click `Start Playing`
2. Play hub: access panel -> create embedded account
3. Auto-continue to commit step in `/play`

Decision points:
- Primary: 1 (`Start Playing`)
- Optional: advanced wallet choice only if user explicitly opens advanced section

### Power User (external wallet path)
1. Home: click `I Have A BCH Wallet`
2. Auth: open External BCH section (preselected by query mode)
3. Create challenge
4. Sign in wallet
5. Paste signature + verify
6. Auto-redirect to `/play?step=commit`

## Visual Style Alignment Applied

Asset-driven style updates:
- Normalized `public/bg` assets to clean names:
  - `burnbounty-board.png`
  - `burnbounty-board-alt.png`
  - `burnbounty-loop.mp4`
  - `burnbounty-loop-alt.mp4`
- Added themed surface utilities in `app/globals.css`:
  - `.bounty-board-bg`
  - `.bounty-panel`
  - `.bounty-paper`
- Applied themed containers on Home/Auth/Commit/Reveal.

## Remaining UI/UX Work (Next Pass)
1. Finalize unified global stepper (`Access -> Commit -> Reveal -> Armory`) in shared layout.
2. Add signed-message helper modal for external wallets with wallet-specific examples.
3. Mobile pass on bottom-nav reachability and modal stacking.
4. Add route-level UX smoke script (Playwright) once MCP browser transport is stable.
