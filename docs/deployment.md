# Deployment Guide

## Prerequisites

- Node.js 20+
- chipnet funds
- configured `.env.local`

## Environment Variables

From `.env.example`:

- `DEPLOYER_WIF`
- `HOUSE_WIF`
- `HOUSE_PKH`
- `PRIZE_POOL_PKH`
- `CHIPNET_ELECTRUM`
- `PACK_PRICE_SATS`
- `TOKEN_CATEGORY`
- `REVEAL_WINDOW_BLOCKS`
- `ENABLE_CHAIN_CALLS` (`false` for demo fallback, `true` for real chipnet calls)
- `DEMO_SHOWCASE_MODE` (`true` only for scripted demo recording)

## Compile Contracts

```bash
npm run contracts:compile
```

Artifacts are written to `artifacts/*.artifact.json`.

## Print Deployment Addresses

```bash
npm run contracts:deploy
```

This outputs:

- `packCommitAddress`
- `packRevealAddress`
- `prizePoolAddress`
- `cardRedeemerAddress`
- odds and parameter summary

## Run App

```bash
npm run dev
```

## Build Check

```bash
npm run typecheck
npm run build
```

## Scripted Functional Test

```bash
TEST_USER_WIF=<chipnet_wif> npm run test:flow
```

## Notes

- POC deploy script prints addresses and config but does not execute full treasury orchestration.
- For production, implement deterministic deployment manifest storage and chain state migration scripts.
