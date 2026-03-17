# Testnet Wallet Setup

This guide covers everything needed to create a chipnet/testnet wallet and use it with BurnBounty.

Use this for:

- local demo mode testing
- full chipnet contract flow testing

## 1. Pick Your Mode

BurnBounty supports two testing modes.

1. Demo mode (fastest, default)
- `ENABLE_CHAIN_CALLS=false`
- Uses mock chain data
- Requires a syntactically valid testnet/chipnet WIF in the UI
- No real contract spend is required

2. Real chipnet mode (full chain flow)
- `ENABLE_CHAIN_CALLS=true`
- Uses deployed contracts and real chipnet transaction flow
- Requires funded chipnet/testnet WIF and config

## 2. Create a Chipnet/Testnet WIF (Electron Cash Recommended)

1. Install and open Electron Cash.
2. Start it in testnet/chipnet mode (not mainnet).
3. Create a new wallet:
- `Standard wallet`
- `Create new seed`
4. Open receiving tab and copy your testnet/chipnet address.
5. Export the private key:
- `Wallet` -> `Private keys` -> `Export`
6. Copy only the raw WIF string.

Expected:

- testnet/chipnet WIF usually starts with `c` or `9`
- mainnet WIF often starts with `K` or `L` and should not be used for this demo

## 3. Common WIF Input Mistakes

The UI only accepts a raw WIF value.

Do not paste:

- prefixes like `!pw`
- labels like `WIF:`
- quotes around the key
- leading/trailing spaces

Correct example:

```text
cV8...your_raw_testnet_wif...XYZ
```

## 4. Optional: Generate a Testnet WIF by CLI

From repo root:

```bash
node -e "const b=require('bitcore-lib-cash'); const k=new b.PrivateKey(undefined,b.Networks.testnet); console.log('WIF:',k.toWIF()); console.log('Address:',k.toAddress(b.Networks.testnet).toString());"
```

This prints:

- a valid testnet WIF you can paste in BurnBounty
- the matching testnet address

## 5. Run BurnBounty Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## 6. Connect Wallet in App

1. Go to `/commit`
2. Paste chipnet/testnet WIF
3. Click `Connect WIF`
4. If valid, address is shown and you can click `Lock Bounty Pack`

If you see `Invalid WIF`:

- remove prefixes/whitespace
- verify key is chipnet/testnet format
- generate a fresh testnet key (Section 4)

## 7. Run Full User Flow (Demo Mode or Real Mode)

1. `/commit` -> Connect WIF -> `Lock Bounty Pack`
2. `/reveal` -> `Reveal & Open`
3. `/collection` -> Redeem/Burn card
4. `/dashboard` -> Check totals

## 8. Enable Real Chipnet Calls

Edit `.env.local`:

```env
ENABLE_CHAIN_CALLS=true
DEPLOYER_WIF=<chipnet_wif>
HOUSE_WIF=<chipnet_wif>
HOUSE_PKH=<house_public_key_hash_hex>
PRIZE_POOL_PKH=<pool_or_house_public_key_hash_hex>
CHIPNET_ELECTRUM=chipnet.imaginary.cash:50004
```

Then run:

```bash
npm run contracts:compile
npm run contracts:deploy
npm run dev
```

Now commit/reveal/redeem attempts will use chain contract calls.

## 9. Funding Test BCH (Real Chipnet Mode)

For real chain tests you need test BCH.

- Use active BCH chipnet/testnet faucets.
- If faucet availability changes, use BCH dev community channels for chipnet coins.

## 10. Security Notes

- Never paste mainnet/private production keys into demo builds.
- BurnBounty wallet connect is for demo/testing only.
- Rotate/discard demo keys after public demos.

