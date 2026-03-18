# AGENTS.md

This file defines project-specific operating rules for coding agents working on BurnBounty.

Scope: entire repository.

## Project Identity

- Project name: **BurnBounty**
- Public repo: `https://github.com/pmb2/BurnBounty`
- Live site: `https://bb.backus.agency`
- Positioning: **collectible NFT card packs on BCH**, never marketed as lottery/gambling.

## Source of Truth

- `main` = live/release branch
- `develop` = integration/dev branch
- `feature/*` = short-lived implementation branches

Promotion path:

1. `feature/*` -> PR to `develop`
2. validate + merge to `develop`
3. PR `develop` -> `main`
4. merge to `main` triggers live deploy workflow

Do not bypass this flow unless explicitly requested.

## Environment Model

BurnBounty uses strict environment separation:

- Local machine = **Dev**
- Domain `bb.backus.agency` = **Live**

### Dev Environment

- file: `.env.local`
- template: `.env.development.example`
- command:

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

### Live Environment

- file on server: `deploy/traefik/.env.live`
- template: `.env.live.example`
- deployment compose: `deploy/traefik/docker-compose.existing-traefik.yml`

Live commands:

```bash
npm run live:up
npm run live:down
```

or:

```bash
./scripts/deploy-live.sh /path/to/BurnBounty main
```

## Deployment & CI/CD

- CI workflow: `.github/workflows/ci.yml`
- Live deploy workflow: `.github/workflows/deploy-live.yml`
- Deploy trigger: push to `main` (or manual dispatch)

Required GitHub secrets for deploy:

- `LIVE_HOST`
- `LIVE_USER`
- `LIVE_SSH_KEY`
- `LIVE_REPO_PATH`
- optional `LIVE_SSH_PORT` (default 22)

## Contract + App Invariants

Do not break these without explicit product approval:

1. Four-contract architecture:
- `PackCommit.cash`
- `PackReveal.cash`
- `PrizePool.cash`
- `CardRedeemer.cash`

2. RNG model:
- commit-reveal
- deterministic verifier parity
- reveal window constraints
- public odds transparency

3. Economic behavior:
- burn/redeem payout = 80%
- house/pool cut = 20%

4. Branding/content:
- use **BurnBounty** naming
- avoid lottery/gambling language in UI/docs/marketing copy

## Frontend & Asset Rules

- Card assets in `public/cards` should use current `.jpg` set (legacy `.svg` cards removed).
- Preserve rarity-border-first design language.
- Keep wallet UX clear that demo WIF is test/chipnet only.

## Security & Secret Hygiene

Never commit:

- real WIF keys
- seed phrases
- private API tokens
- live infra credentials
- `.env.local`, `.env.live`, or any secret-bearing env file

Use:

- `.env.example`, `.env.development.example`, `.env.live.example` for placeholders only.
- `private/` (gitignored) for internal-only docs/material.

## Quality Gates Before Push

Minimum checks before proposing merge:

```bash
npm run build
```

Run additional checks when changing contracts/scripts:

```bash
npm run contracts:compile
npm run test:flow
```

If a check cannot run, state why and provide the exact blocker.

## Agent Workflow Expectations

When making changes:

1. explain what will be changed
2. edit minimally and safely
3. verify with build/tests
4. summarize changed files and impact
5. include rollback guidance when touching deploy paths

When touching production/deploy files, include:

- exact commands used
- expected output/status
- how to revert quickly

## Rollback

Use git tag/commit redeploy:

```bash
git checkout <tag-or-commit>
npm run live:up
```

Public release baseline tag: `v0.4.0-public`.

## Useful References

- `README.md`
- `docs/deployment.md`
- `docs/vcs-deploy-flow.md`
- `docs/rng.md`
- `docs/contracts/specifications.md`

