# Wallet Support Matrix

This matrix defines what BurnBounty auth supports today.

## Canonical Auth Signature Model

BurnBounty uses **BCH signed-message challenge verification** for BCH wallet auth.

- challenge text is deterministic and purpose-bound
- signature is verified server-side against canonical normalized BCH address
- auth signing is not a BCH transaction and does not spend funds

## Supported Providers

| Provider | Role | Sign Mode | Status | Notes |
|---|---|---|---|---|
| Embedded Wallet | Primary onboarding | `manual` (internally signed) | Supported | Client-generated wallet, locally encrypted, quickest path for new users |
| External BCH Wallet | Power-user self-custody | `paytaca`, `electrum`, `manual` | Supported | Challenge-sign-verify flow, replay-safe, BCH-first |
| MetaMask Snap | Optional compatibility | `metamask_snap` | Experimental | Isolated path, non-core for BCH identity |

## Signature Mode Compatibility

### BCH Modes (`paytaca`, `electrum`, `manual`)

- Uses BCH-compatible compact signed-message verification (`bitcore-lib-cash` stack).
- Address checks are performed against canonical normalized BCH storage key.
- CashAddr and legacy formats are normalized prior to comparison.

### MetaMask Snap Mode (`metamask_snap`)

- Uses `personal_sign` recovery (`@metamask/eth-sig-util`) in isolated module.
- Treated as optional bridge compatibility only.
- Not used as canonical BCH verification logic.

## BCH Verification Library Notes

Primary library: `bitcore-lib-cash`.

- It is BCH-specific distribution, but historically descended from Bitcoin tooling lineage.
- Verification is constrained by:
  - BCH address normalization module (`lib/auth/bch-address.ts`)
  - network-aware signer derivation
  - canonical storage-key comparison

This avoids false positives from format variance (CashAddr vs legacy) and prevents EVM assumptions from leaking into BCH auth logic.

## Not Supported

- BIP322 wallet-auth verification path (current implementation uses classic compact BCH signed-message verification)
- On-chain transaction signatures as login proofs
- Blind acceptance of EVM signatures for BCH auth paths
- MetaMask as required BCH onboarding

## Test Coverage

Wallet auth tests include:

- address normalization parity
- challenge lifecycle and replay rejection
- BCH signature verification success/failure matrix
- provider containment (Snap cannot bypass BCH-first rules)
- transactional consume behavior under concurrent verify attempts
