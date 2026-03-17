# Open Source Boundary

This repository is intended to be mostly public.

## Public (safe to open source)

- contracts
- frontend code
- API schemas and flow logic
- deterministic RNG and verification code
- non-sensitive docs and tests

## Keep Private (recommended)

Do not commit the following:

- real production private keys / WIFs
- bankroll strategy documents with live treasury addresses
- legal memos containing privileged guidance
- incident response contact details and escalation trees
- exchange/custodian integration credentials
- partner agreements and artist licensing contracts

## Private Workspace Convention

Use `private/` for internal materials.
This path is gitignored by default.

## Publish Workflow

1. Keep `.env.example` sanitized.
2. Verify `.gitignore` includes `private/` and secret env files.
3. Run a manual review for addresses/keys in docs.
4. Open source commit only after checklist pass.
