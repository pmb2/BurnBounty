# Frontend Flow

## Routes

- `/` landing page
- `/auth` hybrid auth hub
- `/commit` commitment step
- `/reveal` reveal/open step
- `/collection` owned card actions
- `/dashboard` aggregate counters
- `/profile/[address]` public hunter profile
- `/trading` listing board

## Auth Page

Behavior:

1. Embedded wallet quick-start (recommended):
   - register/login with username + passphrase
   - generate encrypted embedded wallet client-side
2. External BCH auth:
   - request nonce challenge
   - sign via wallet
   - verify server-side
3. Optional MetaMask Snap:
   - explicit experimental lane only

Account panel supports wallet link/unlink actions.

## Commit Page

Behavior:

1. Generate `userSeed` and `nonce` client-side.
2. Compute `commitmentHash = hash256(userSeed:nonce)`.
3. Submit to `/api/commit-pack`.
4. Persist pending state in local storage key `burnbounty.pendingReveal`.

## Reveal Page

Behavior:

1. Load pending state from local storage.
2. Submit reveal payload to `/api/reveal-pack`.
3. Display card animation and transparency transcript.
4. Persist cards to `burnbounty.collection`.
5. Clear pending reveal key.

Transparency panel displays:

- reveal txid
- entropy root
- seed + nonce
- block hashes `N`, `N-1`, `N-2`

## Collection Page

Behavior:

- render cards from local storage
- trigger burn via `/api/redeem`
- remove card on success
- increment local totals for redeemed and house profit

## Dashboard Page

Displays local aggregate counters:

- total redeemed (BCH)
- house profit (BCH)

## UX and Safety Notes

- Embedded wallet is primary onboarding path for conversion.
- External BCH wallet auth is power-user/non-custodial path.
- MetaMask Snap is optional and explicitly non-core.
- Legacy WIF connector remains for chipnet gameplay actions only.
- UI explicitly warns against mainnet/private production key use.
- Flow intentionally favors transparency over gamified opacity.

