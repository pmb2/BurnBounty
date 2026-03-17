# Chipnet Setup Guide

1. Get test BCH from faucet(s):
- https://testnet-faucet.bitcoin.com

2. Configure `.env.local` from `.env.example`.

3. Compile and print contract addresses:

```bash
npm run contracts:compile
npm run contracts:deploy
```

4. Start app:

```bash
npm run dev
```

5. Run user flow:
- `/commit` -> `/reveal` -> `/collection` -> `/dashboard`

6. Optional script run:

```bash
TEST_USER_WIF=<chipnet_wif> npm run test:flow
```
