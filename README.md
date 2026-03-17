# CashBorders POC (Chipnet)

[![CI](https://github.com/pmb2/bch-collections/actions/workflows/ci.yml/badge.svg)](https://github.com/pmb2/bch-collections/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

CashBorders is a BCH CashTokens collectible pack prototype with deterministic commit-reveal randomness and burn redemption utility.

This repository is fully open source (MIT) per Zenlon's requirement.

## Documentation Index

- [System Overview](./docs/README.md)
- [Architecture](./docs/architecture.md)
- [Contract Specifications](./docs/contracts/specifications.md)
- [RNG Design & Security](./docs/rng.md)
- [API Specifications](./docs/api.md)
- [Frontend Flow](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)
- [Verification Guide](./docs/verification.md)
- [Runbooks](./docs/runbooks/operations.md)
- [Open Source Boundary](./docs/open-source-boundary.md)
- [Legal/Compliance Notes](./docs/legal.md)
- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./.github/SECURITY.md)
- [Changelog](./CHANGELOG.md)

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run contracts:compile
npm run contracts:deploy
npm run dev
```

Open `http://localhost:3000`.

## Core User Flow

1. Connect demo chipnet WIF (never use a production/private mainnet key).
2. `Commit` page: create commitment and lock pack purchase.
3. `Reveal` page: reveal seed + nonce; generate 5 deterministic cards.
4. `Collection` page: burn card for 80% payout.
5. `Dashboard` page: inspect aggregate redeemed and house cut stats.

## Odds Table (Public)

| Tier | Odds | Face Value Range |
|---|---:|---|
| Bronze | 70% | $0.01 - $0.50 |
| Silver | 20% | $1 - $20 |
| Gold | 8% | $50 - $200 |
| Diamond | 2% | $500 - $5000 |

## RNG Summary

RNG solved via Commit-Reveal + Block Hash anchoring.

Improvements implemented:

1. Multi-source entropy root (`N`, `N-1`, `N-2`, commit txid, seed+nonce).
2. 32-round PRNG mixing stage.
3. Reveal window enforcement (6 blocks).
4. Off-chain verifier parity (`lib/verify.ts`).
5. Batch reveal verification scaffolding.

## Development Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:deploy
npm run test:flow
```

## Demo-Only Notice

This POC is chipnet-only and not legal advice.
Consult counsel before any public/mainnet launch.
