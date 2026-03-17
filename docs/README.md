# System Overview

This documentation set describes the full BurnBounty POC implementation and intended operator/developer behavior.

## Project Goals

- Provide a complete chipnet demo for collectible pack opening with deterministic randomness.
- Keep economics auditable and transparent.
- Demonstrate covenant-based redemption with hard payout rules.

## Repository Scope

In scope:

- CashScript contracts for commit, reveal, pool, and redemption paths.
- Next.js frontend for commit/reveal/collection/dashboard.
- API layer mediating user actions to contract flows.
- Deterministic RNG with verifier parity.

Out of scope (for this POC):

- Mainnet production readiness.
- Full trustless state indexing and database persistence.
- Custodial key management hardening.
- Formal legal compliance implementation.

## Core Docs

- [Architecture](./architecture.md)
- [Contract Specifications](./contracts/specifications.md)
- [RNG Design & Security](./rng.md)
- [API Specifications](./api.md)
- [Frontend Flow](./frontend.md)
- [Deployment Guide](./deployment.md)
- [Testnet Wallet Setup](./testnet-wallet-setup.md)
- [Verification Guide](./verification.md)
- [Operations Runbook](./runbooks/operations.md)
- [Open Source Boundary](./open-source-boundary.md)
- [Release Checklist](./release-checklist.md)
- [Legal Notes](./legal.md)

## High-Level Data Flow

1. User generates `userSeed` + `nonce` client-side.
2. Client computes `commitmentHash = hash256(userSeed:nonce)`.
3. `/api/commit-pack` records pending pack and (if possible) submits commit transaction.
4. `/api/reveal-pack` validates commitment, computes entropy root, derives 5 cards deterministically.
5. Frontend stores revealed cards in local storage for collection rendering.
6. `/api/redeem` burns card via covenant path and distributes 80/20 BCH split.

## Source Map

- Contracts: `contracts/*.cash`
- SDK and chain helpers: `lib/cashscript.ts`
- RNG + verifier: `lib/rng.ts`, `lib/verify.ts`
- UI routes: `app/*`
- API routes: `api/*` and app wrappers in `app/api/*`
- Scripts: `scripts/*`

## Versioning

Current package version: `0.4.0`.

This aligns with v0.4 requirements:

- 4 contracts
- commit/reveal flow
- upgraded RNG model
- public verification parity

