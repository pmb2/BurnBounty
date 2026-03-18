# VCS + Environment Promotion Flow

This repo uses a strict two-environment model.

- Local machine = **Dev**
- `https://bb.backus.agency` = **Live**

## Branch Strategy

- `feature/*` -> short-lived branch for work
- `develop` -> integration branch (dev environment baseline)
- `main` -> release/live branch (production baseline)

Recommended promotion path:

1. Build features on `feature/*`
2. Open PR into `develop`
3. Validate locally + CI
4. Open PR from `develop` into `main`
5. Merge to `main` triggers live deploy workflow

## Environment Files

Do not reuse the same env file between dev and live.

- Dev template: `.env.development.example`
- Live template: `.env.live.example`
- Live runtime file on server: `deploy/traefik/.env.live` (gitignored)

## Local Dev Commands

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

## Live Deploy Commands (Server)

One-time prep:

```bash
cp .env.live.example deploy/traefik/.env.live
# fill live values
```

Deploy live stack:

```bash
npm run db:migrate
npm run live:up
```

Stop live stack:

```bash
npm run live:down
```

Or run scripted deploy (pull + rebuild):

```bash
./scripts/deploy-live.sh /path/to/BurnBounty main
```

## GitHub Actions CD

Workflow: `.github/workflows/deploy-live.yml`

Trigger:

- push to `main`
- manual `workflow_dispatch`

Required repo secrets:

- `LIVE_HOST`
- `LIVE_USER`
- `LIVE_SSH_KEY`
- `LIVE_REPO_PATH`
- optional `LIVE_SSH_PORT` (defaults to 22)

Deploy job should run migrations before container promotion:

```bash
npm run db:migrate
```

## Rollback

Use release tags (e.g. `v0.4.0-public`) and redeploy previous commit:

```bash
git checkout <tag-or-commit>
npm run live:up
```

For a full Git-based rollback in live repo:

```bash
git checkout <tag-or-commit>
docker compose -f deploy/traefik/docker-compose.existing-traefik.yml --env-file deploy/traefik/.env.live up -d --build
```

## Guardrails

- Never commit `.env.local` or `.env.live`
- Never store real WIF/seed phrases in repository files
- Keep `main` protected (PR required + CI required)
