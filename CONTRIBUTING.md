# Contributing

Thanks for contributing to CashBorders.

## Development Setup

1. Install Node.js 20+
2. `npm install`
3. `cp .env.example .env.local`
4. `npm run typecheck && npm run build`

## Branching

- `main`: stable
- `develop`: integration (optional)
- feature branches: `feat/<name>`
- fixes: `fix/<name>`

## Pull Request Expectations

- keep changes scoped
- include docs for behavior changes
- avoid committing secrets/private keys
- ensure CI checks pass

## Commit Style

Recommended prefixes:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`

## Testing

At minimum run:

```bash
npm run typecheck
npm run build
```

If API/flow logic changed:

```bash
TEST_USER_WIF=<chipnet_wif> npm run test:flow
```

## Security

For vulnerabilities, follow `.github/SECURITY.md`.
