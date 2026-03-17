# Contract Specifications

This document describes contract intent, invariants, and interfaces.

## 1. PackCommit.cash

Purpose:

- Accept pack payment and buyer commitment hash.
- Forward value into PackReveal path for subsequent reveal execution.

Constructor:

- `packPriceSats: int`
- `packRevealLockingBytecode: bytes`

Function:

- `commit(bytes32 commitmentHash, int commitHeight)`

Invariants:

- commitment hash must be non-zero.
- output 0 must lock to reveal covenant bytecode.
- output value must be at least `packPriceSats`.
- no token allowed in commit forwarding output.

## 2. PackReveal.cash

Purpose:

- Validate commitment reveal.
- Enforce reveal window.
- Validate entropy root binding.
- Enforce fanout structure for house cut and 5 NFT commitments.

Constructor:

- `revealWindowBlocks: int`
- `prizePoolPkh: pubkey`
- `categoryId: bytes`
- `houseCutSats: int`

Function:

- `reveal(commitmentHash, userSeed, commitHeight, prevBlockHash1, prevBlockHash2, rngRoot, c1..c5, buyerPk)`

Invariants:

- `hash256(userSeed) == commitmentHash`
- `tx.time <= commitHeight + revealWindowBlocks`
- `hash256(userSeed + prevBlockHash1 + prevBlockHash2 + tx.hashPrevouts) == rngRoot`
- output 0 = exact house cut to prize pool
- outputs 1..5 lock to buyer, same category, unique commitments

## 3. PrizePool.cash

Purpose:

- Hold reserve and house cuts.
- Restrict forward path into CardRedeemer or admin emergency withdrawal.

Constructor:

- `adminPkh: pubkey`
- `cardRedeemerLockingBytecode: bytes`

Functions:

- `forwardToRedeemer(amount)`
- `adminWithdraw(adminPk, adminSig, amount)`

Invariants:

- forward output must lock to redeemer bytecode and carry no token.
- admin path requires valid signature and P2PKH destination.

## 4. CardRedeemer.cash

Purpose:

- Parse NFT commitment face value.
- Enforce 80/20 split and token burn.

Constructor:

- `prizePoolPkh: pubkey`

Function:

- `redeem(redeemerPk, redeemerSig, payout, houseCut)`

Invariants:

- commitment length is 9 bytes
- face value parsed from bytes[1..8]
- payout = 80%, house = 20%
- output 0 payout in BCH only
- output 1 house cut in BCH only

## Commitment Encoding

NFT commitment format is fixed:

- byte 0: tier byte (`1=Bronze`, `2=Silver`, `3=Gold`, `4=Diamond`)
- bytes 1-8: `faceValueSats` (uint64 big-endian)

## Notes

- Contract interfaces are designed for transparent auditability.
- Some advanced fully on-chain PRNG routines are documented as post-upgrade migration steps.
