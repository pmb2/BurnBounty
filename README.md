# BurnBounty

<div align="center">

![BurnBounty Banner](https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=BurnBounty+-+Own+the+Cards.+Burn+for+BCH.)

**Own the cards. Burn for BCH. Or build your legendary collection.**

A fully on-chain digital trading card pack system on **Bitcoin Cash** using native CashTokens and covenants.

**100% open source • Transparent RNG • Instant 80% cash-out • True collectibles**

[![CI](https://github.com/pmb2/BurnBounty/actions/workflows/ci.yml/badge.svg)](https://github.com/pmb2/BurnBounty/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![BCH](https://img.shields.io/badge/Blockchain-Bitcoin_Cash-00B140.svg)](https://bitcoincash.org)
[![CashTokens](https://img.shields.io/badge/Tokens-CashTokens-blue)](https://cashscript.org)
[![Chipnet POC](https://img.shields.io/badge/Status-Working_POC_on_Chipnet-green)](https://github.com/pmb2/BurnBounty)

</div>

---

## What is BurnBounty?

BurnBounty turns **digital collectible cards** into a self-sustaining economy on Bitcoin Cash.

- Buy a **5-card pack** for a fixed BCH price.
- Receive 5 designed NFTs with **embedded BCH face values** and static rarity borders.
- **Instantly burn** any card to receive **80% of its face value** in BCH (house keeps 20% for pool economics).
- Or **hold and trade** ultra-rare cards on the secondary market.

The project is framed and marketed as **collectibles**, never as gambling.

Inspired by physical TCGs + viral digital card culture, built natively on BCH for low fees and ownership.

---

## Core Features

- **Static Rarity Borders** — Bronze, Silver, Gold, Diamond.
- **Embedded Real Value** — Every card has a verifiable BCH face value (pennies -> high-tier hits).
- **Instant Redemption** — One-click burn -> 80% paid immediately via covenant logic.
- **Self-Funding Prize Pool** — 20% house edge feeds reserve pool dynamics.
- **Secondary Market Ready** — Royalty/pool feedback path documented for future phases.
- **Fully Verifiable RNG** — Public deterministic verifier included.

---

## Sustainable Decay & Economy (v0.6)

BurnBounty now uses a sustainable long-horizon value system with controlled growth, controlled decay, and a hard floor.

### Weekly Drift Ranges (x1000 precision)

| Tier | Weekly Drift |
|---|---|
| Bronze | -3 to +1 |
| Silver | -2 to +4 |
| Gold | -1 to +6 |
| Diamond | +1 to +8 |

### Random Growth/Decay Cap Windows

| Tier | Cap Weeks | Approx Years |
|---|---|---|
| Bronze | 0-52 | 0-1 year |
| Silver | 26-104 | 0.5-2 years |
| Gold | 78-182 | 1.5-3.5 years |
| Diamond | 130-260 | 2.5-5 years |

### Floor Rule

- Minimum multiplier floor: **0.40**
- Cards never decay below **40%** of original face value.

### Redemption Formula

```text
weeks = (currentBlockHeight - mintBlockHeight) / 1008
effectiveWeeks = min(weeks, randomCapWeeks)
multiplier = max(0.40, 1 + (weeklyDrift / 1000) * effectiveWeeks)
payout = faceValue * 0.80 * multiplier
```

### Series Pricing

| Series | Pack Price | Drift Perk |
|---|---|---|
| Genesis Beta (Series 1) | 0.05 BCH | min drift +5 |
| Founder Edition (Series 2) | 0.02 BCH | min drift +1 |
| Normal | 0.008 BCH | standard drift rules |

### Pool Safety

- `PrizePool.cash` includes pro-rata payout logic when available reserve is below requested total.

### In-Game Guide

- New **Bounty Hunter Handbook** modal explains decay, cap windows, floor, series perks, and quick math.
- Placeholder screenshot: `docs/assets/game-guide-modal-placeholder.png`

---

## The RNG - Fully Auditable

Randomness uses commit-reveal + chain-linked entropy, implemented with deterministic replayability.

Security layers implemented in this repo:

1. **Multi-source entropy** — block references + commit-linked data + revealed seed/nonce.
2. **32-round PRNG mixing** — repeated hash/xor diffusion pipeline.
3. **6-block reveal window** — limits reveal grinding behavior.
4. **Public verifier parity** — anyone can recompute reveal output from transcript inputs.
5. **Batch verification scaffolding** — multi-pack reveal verification path exists.

See:

- [`lib/rng.ts`](./lib/rng.ts)
- [`lib/verify.ts`](./lib/verify.ts)
- [`docs/rng.md`](./docs/rng.md)

---

## Card Examples

![Gold Diamond Satoshi Card](https://via.placeholder.com/400x560/FFD700/000000?text=DIAMOND+%241000+Satoshi)

![Silver Node Card](https://via.placeholder.com/400x560/C0C0C0/000000?text=SILVER+%2420+Node)

![Bronze Classic Portrait](https://via.placeholder.com/400x560/CD7F32/000000?text=BRONZE+%240.50+Portrait)

*(Replace placeholders with final AI/artist assets for launch media. Borders remain the hero element.)*

---

## Tech Stack

- **Blockchain**: Bitcoin Cash (CashTokens + covenants)
- **Smart Contracts**: CashScript (`PackCommit`, `PackReveal`, `PrizePool`, `CardRedeemer`)
- **Frontend**: Next.js 15 + Tailwind + shadcn/ui + Framer Motion + 3D reveal stack
- **Wallet**: Chipnet/testnet demo WIF mode for POC
- **Randomness**: Commit-Reveal + block-linked deterministic entropy

Current status: **working on chipnet/testnet POC**.

---

## Quick Start (Chipnet Demo)

1. Clone:

```bash
git clone https://github.com/pmb2/BurnBounty.git
cd BurnBounty
```

2. Install and run:

```bash
npm install
cp .env.example .env.local
npm run contracts:compile
npm run contracts:deploy
npm run dev
```

3. Open `http://localhost:3000` and run flow:

- `Commit` -> `Reveal` -> `Burn`.

4. Scripted flow:

```bash
TEST_USER_WIF=<chipnet_wif> npm run test:flow
```

5. Demo-showcase recording mode:

```bash
# in .env.local set DEMO_SHOWCASE_MODE=true
TEST_USER_WIF=<chipnet_wif> npm run test:demo-flow
```

---

## Roadmap

- **POC (current)**: Commit-reveal + redemption flow on chipnet.
- **Next**: Mainnet-hardening, production wallet UX, final art pipeline.
- **Later**: Secondary market hooks, royalty feedback, governance options.

---

## Dev vs Live Environments

- **Dev**: local machine with `.env.local` (from `.env.development.example`)
- **Live**: `https://bb.backus.agency` with `deploy/traefik/.env.live` (from `.env.live.example`)

Local dev:

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

Live deployment (Traefik):

```bash
cp .env.live.example deploy/traefik/.env.live
# edit live values
npm run live:up
```

Live deploy is also VCS-driven via GitHub Actions on push to `main`.

---

## Auth, Profiles & Trading (v0.7)

BurnBounty now includes a non-custodial auth and marketplace foundation:

- **Wallet auth** via signed challenge (`/auth`)
- **Paytaca primary**, **Electron Cash fallback**, **MetaMask BCH secondary**
- **Public profiles** at `/profile/[address]`
- **Trading post** at `/trading` with listing API
- **Escrow contract stub** (`contracts/Escrow.cash`) for atomic token+BCH settlement path

Implementation notes:

- No passwords/custodial accounts in app flow
- Session cookie issued after signature verification
- Supabase-backed storage is supported when env vars are configured
- Safe local fallback data paths are included for dev

---

## Legal & Disclaimer

This is a **collectible NFT project** with utility mechanics.

It is **not marketed as gambling**.

This repository is a technical POC and **not legal advice**.
Consult counsel before any mainnet launch, especially in regulated jurisdictions.

---

## Contributing & Backers

Fully open source (MIT).

Contributions and technical reviews are welcome.

See:

- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./.github/SECURITY.md)
- [Changelog](./CHANGELOG.md)

---

## Documentation Index

- [System Overview](./docs/README.md)
- [Architecture](./docs/architecture.md)
- [Contract Specifications](./docs/contracts/specifications.md)
- [RNG Design & Security](./docs/rng.md)
- [API Specifications](./docs/api.md)
- [Frontend Flow](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)
- [VCS + Deploy Flow](./docs/vcs-deploy-flow.md)
- [Verification Guide](./docs/verification.md)
- [Runbooks](./docs/runbooks/operations.md)
- [Open Source Boundary](./docs/open-source-boundary.md)
- [Legal/Compliance Notes](./docs/legal.md)

---

<div align="center">

**Made for the Bitcoin Cash community**

</div>

