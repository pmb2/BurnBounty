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

## HTTPS Deployment on `bb.backus.agency` (Traefik)

This repo now includes Docker + Traefik deployment files for TLS.

- Existing Traefik setup: `deploy/traefik/docker-compose.existing-traefik.yml`
- Standalone Traefik stack: `deploy/traefik/standalone/docker-compose.yml`

### Option A: Use Existing Traefik (recommended if you already run it)

1. Ensure your Traefik instance has:
- entrypoints `web` (80) and `websecure` (443)
- certificate resolver named `letsencrypt`
- docker provider enabled

2. Ensure DNS points `bb.backus.agency` to your server public IP.

3. Ensure a docker network named `traefik_proxy` exists and is shared by Traefik:

```bash
docker network create traefik_proxy
```

4. Deploy BurnBounty behind Traefik:

```bash
docker compose -f deploy/traefik/docker-compose.existing-traefik.yml up -d --build
```

Traefik will issue/manage the TLS certificate and route HTTPS traffic to port `3000` in the app container.

### Option B: Standalone Traefik + App (includes cert management)

1. Point DNS `bb.backus.agency` to this host.
2. Open inbound ports `80` and `443`.
3. Prepare Let’s Encrypt storage:

```bash
mkdir -p deploy/traefik/standalone/letsencrypt
touch deploy/traefik/standalone/letsencrypt/acme.json
chmod 600 deploy/traefik/standalone/letsencrypt/acme.json
```

4. Update email in `deploy/traefik/standalone/traefik.yml` if needed.
5. Start stack:

```bash
docker compose -f deploy/traefik/standalone/docker-compose.yml up -d --build
```

### Verify HTTPS

```bash
curl -I https://bb.backus.agency
```

Expected: HTTP 200 from BurnBounty over TLS with a valid Let’s Encrypt cert.
