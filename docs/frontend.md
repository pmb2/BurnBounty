# Frontend Flow

## Routes

- `/` landing page
- `/commit` commitment step
- `/reveal` reveal/open step
- `/collection` owned card actions
- `/dashboard` aggregate counters

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

- Wallet connector is demo WIF only.
- UI explicitly warns against mainnet/private production key use.
- Flow intentionally favors transparency over gamified opacity.

