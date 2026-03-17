# Changelog

All notable changes to this project should be documented in this file.

Format inspired by Keep a Changelog and semantic versioning.

## [Unreleased]

### Added
- demo showcase mode with deterministic forced high-tier pull for recording
- `test:demo-flow` script for repeatable demo validation

### Fixed
- corrected RNG rejection sampling to 64-bit draws for large tier ranges
- added demo-safe `ENABLE_CHAIN_CALLS=false` path to avoid runtime chain dependency issues in local testing
- updated docs/env to describe chain-call toggle behavior

## [0.4.0] - 2026-03-17

### Added
- 4-contract architecture (`PackCommit`, `PackReveal`, `PrizePool`, `CardRedeemer`)
- commit/reveal UI and API flow
- upgraded deterministic RNG with verifier parity
- extensive docs in `/docs`
- GitHub CI and contribution templates

### Changed
- migrated from direct buy-pack to commit/reveal pack opening path
- updated deployment and test scripts accordingly

### Notes
- chipnet/testnet POC mode with demo key UX
