// @ts-nocheck
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CARD_TEMPLATES } from '@/data/cards';
import { signBchAuthMessage } from '@/lib/auth/bch-message';
import { encodeCommitment, normalizeCardAsset, satsToBch } from '@/lib/cards';
import { BLOCKS_PER_WEEK, commitmentFromSeed, FLOOR_MULTIPLIER_MILLI, ODDS, SERIES_CONFIG } from '@/lib/rng';
import { verifyBatchCardGeneration, verifyCardGeneration } from '@/lib/verify';
import type { CardAsset, CommitPackResult, PackSeries, PendingPack, RevealPackResult } from '@/types/cards';

const PACK_PRICE_SATS = Number(process.env.PACK_PRICE_SATS || SERIES_CONFIG.NORMAL.priceSats);
const HOUSE_PKH = process.env.HOUSE_PKH || '';
const PRIZE_POOL_PKH = process.env.PRIZE_POOL_PKH || HOUSE_PKH;
const TOKEN_CATEGORY = process.env.TOKEN_CATEGORY || '00'.repeat(32);
const CHIPNET_ELECTRUM = process.env.CHIPNET_ELECTRUM || 'chipnet.imaginary.cash:50004';
const MOCK_CHAIN_HEIGHT = Number(process.env.MOCK_CHAIN_HEIGHT || 1740005);
const REVEAL_WINDOW_BLOCKS = 6;
const ENABLE_CHAIN_CALLS = process.env.ENABLE_CHAIN_CALLS === 'true';
const DEMO_SHOWCASE_MODE = process.env.DEMO_SHOWCASE_MODE === 'true';
const DEMO_SHOWCASE_FORCE_TIER = process.env.DEMO_SHOWCASE_FORCE_TIER || 'Diamond';
const DEMO_SHOWCASE_FACE_SATS = Number(process.env.DEMO_SHOWCASE_FACE_SATS || 120_000_000_000);

async function deps() {
  const cashscript = await import('cashscript');
  const bitcore = await import('bitcore-lib-cash');
  const sdk = await import('@cashscript/sdk');
  return { cashscript, bitcore: bitcore.default || bitcore, sdk };
}

function loadArtifact(name: 'PackCommit' | 'PackReveal' | 'PrizePool' | 'CardRedeemer' | 'Escrow') {
  const p = path.join(process.cwd(), 'artifacts', `${name}.artifact.json`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function normalizeHex(hex: string) {
  return hex.replace(/^0x/i, '').toLowerCase();
}

function toBigIntSats(value: bigint | number | string) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  return BigInt(value);
}

function mockBlockHash(offset = 0): string {
  const root = process.env.MOCK_BLOCK_HASH || '00ff11aa22bb33cc44dd55ee66ff77aa88bb99cc00ddeeff1122334455667788';
  return crypto.createHash('sha256').update(`${root}:${offset}`).digest('hex');
}

function packPriceForSeries(series: PackSeries) {
  if (series === 'NORMAL') return PACK_PRICE_SATS;
  return SERIES_CONFIG[series].priceSats;
}

function houseCutForSeries(series: PackSeries) {
  return Math.floor(packPriceForSeries(series) * 0.2);
}

function currentMultiplierMilli(card: Pick<CardAsset, 'weeklyDriftMilli' | 'randomCapWeeks' | 'mintBlockHeight'>, currentBlockHeight: number): number {
  const weeks = Math.max(0, Math.floor((currentBlockHeight - card.mintBlockHeight) / BLOCKS_PER_WEEK));
  const effectiveWeeks = Math.min(weeks, card.randomCapWeeks);
  const raw = 1000 + (card.weeklyDriftMilli * effectiveWeeks);
  return Math.max(FLOOR_MULTIPLIER_MILLI, raw);
}

function asCardAssets(cards: Array<{ tier: string; faceValueSats: number; weeklyDriftMilli: number; randomCapWeeks: number }>, series: PackSeries, mintBlockHeight: number): CardAsset[] {
  return cards.map((entry, i) => {
    const templatePool = CARD_TEMPLATES.filter((c) => c.tier === entry.tier);
    const template = templatePool[i % templatePool.length];
    const tierByte = entry.tier === 'Bronze' ? 1 : entry.tier === 'Silver' ? 2 : entry.tier === 'Gold' ? 3 : 4;
    const commitmentHex = encodeCommitment(tierByte, entry.faceValueSats, entry.weeklyDriftMilli, entry.randomCapWeeks, mintBlockHeight);
    const nftId = crypto.createHash('sha256').update(`${TOKEN_CATEGORY}:${commitmentHex}:${i}`).digest('hex');
    const initialPayout = Math.floor(entry.faceValueSats * 0.8);
    return {
      nftId,
      categoryId: TOKEN_CATEGORY,
      commitmentHex,
      name: template.name,
      tier: entry.tier,
      series,
      faceValueSats: entry.faceValueSats,
      originalFaceValueSats: entry.faceValueSats,
      payoutSats: initialPayout,
      payoutBch: satsToBch(initialPayout),
      weeklyDriftMilli: entry.weeklyDriftMilli,
      randomCapWeeks: entry.randomCapWeeks,
      mintBlockHeight,
      serial: nftId.slice(0, 12).toUpperCase(),
      image: template.image,
      bcmrUri: `ipfs://bafkrei-burnbounty-poc/cards/${template.id}.json`
    };
  });
}

function applyDemoShowcaseRig(
  cards: Array<{ tier: string; faceValueSats: number; weeklyDriftMilli: number; randomCapWeeks: number }>,
  entropyRoot: string
): Array<{ tier: string; faceValueSats: number; weeklyDriftMilli: number; randomCapWeeks: number }> {
  if (!DEMO_SHOWCASE_MODE) return cards;

  // Deterministic showcase index for repeatable demo recordings.
  const idx = parseInt(entropyRoot.slice(0, 2), 16) % cards.length;
  const next = [...cards];
  next[idx] = {
    tier: DEMO_SHOWCASE_FORCE_TIER,
    faceValueSats: DEMO_SHOWCASE_FACE_SATS,
    weeklyDriftMilli: 8,
    randomCapWeeks: 260
  };
  return next;
}

export function getWeightedOdds() {
  return ODDS;
}

export function verifyPackLocally(input: {
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
}) {
  return verifyCardGeneration(input);
}

export async function commitPackOnChipnet(input: { userWif: string; commitmentHash: string; series?: PackSeries }): Promise<CommitPackResult> {
  const series = input.series || 'NORMAL';
  const commitHeight = MOCK_CHAIN_HEIGHT;
  const commitTxid = crypto.createHash('sha256').update(`${input.commitmentHash}:${Date.now()}`).digest('hex');
  const userAddr = `demo-user-${crypto.createHash('sha256').update(input.userWif).digest('hex').slice(0, 24)}`;

  const pending: CommitPackResult = {
    commitTxid,
    commitHeight,
    commitmentHash: input.commitmentHash,
    userAddress: userAddr,
    series,
    packPriceSats: packPriceForSeries(series),
    blockHashN: mockBlockHash(0),
    blockHashN1: mockBlockHash(1),
    blockHashN2: mockBlockHash(2),
    revealDeadline: commitHeight + REVEAL_WINDOW_BLOCKS
  };

  if (ENABLE_CHAIN_CALLS) {
    try {
      const { cashscript } = await deps();
      const { Contract, ElectrumNetworkProvider } = cashscript;
      const revealArtifact = loadArtifact('PackReveal');
      const commitArtifact = loadArtifact('PackCommit');
      const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
      const revealContract = new Contract(revealArtifact, [REVEAL_WINDOW_BLOCKS, PRIZE_POOL_PKH, TOKEN_CATEGORY, houseCutForSeries(series)], { provider });
      const commitContract = new Contract(commitArtifact, [SERIES_CONFIG.GENESIS_BETA.priceSats, SERIES_CONFIG.FOUNDER_EDITION.priceSats, PACK_PRICE_SATS, revealContract.bytecode], { provider });
      await commitContract.unlock.commit(input.commitmentHash, commitHeight, series === 'GENESIS_BETA' ? 1 : series === 'FOUNDER_EDITION' ? 2 : 3).to(revealContract.address, packPriceForSeries(series)).send();
    } catch {
      // Offline/demo fallback.
    }
  }

  return pending;
}

export async function revealPackOnChipnet(input: {
  userWif: string;
  userSeed: string;
  nonce: string;
  pending: PendingPack;
}): Promise<RevealPackResult> {
  if (commitmentFromSeed(input.userSeed, input.nonce) !== input.pending.commitmentHash) {
    throw new Error('Reveal failed: commitment mismatch');
  }
  if (MOCK_CHAIN_HEIGHT > input.pending.commitHeight + REVEAL_WINDOW_BLOCKS) {
    throw new Error('Reveal failed: window expired (6 blocks)');
  }

  const { entropyRoot, cards } = verifyCardGeneration({
    userSeed: input.userSeed,
    nonce: input.nonce,
    blockHashN: input.pending.blockHashN,
    blockHashN1: input.pending.blockHashN1,
    blockHashN2: input.pending.blockHashN2,
    commitTxid: input.pending.commitTxid,
    series: input.pending.series
  });

  const mintedCards = asCardAssets(applyDemoShowcaseRig(cards, entropyRoot), input.pending.series, input.pending.commitHeight);

  let revealTxid = `mock-reveal-${Date.now()}`;
  if (ENABLE_CHAIN_CALLS) {
    try {
      const { cashscript, bitcore } = await deps();
      const { Contract, ElectrumNetworkProvider, SignatureTemplate } = cashscript;
      const userKey = bitcore.PrivateKey.fromWIF(input.userWif);
      const userPk = Buffer.from(userKey.toPublicKey().toBuffer()).toString('hex');
      const userAddr = userKey.toAddress(bitcore.Networks.testnet).toString();
      const revealArtifact = loadArtifact('PackReveal');
      const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
      const contract = new Contract(revealArtifact, [REVEAL_WINDOW_BLOCKS, PRIZE_POOL_PKH, TOKEN_CATEGORY, houseCutForSeries(input.pending.series)], { provider });
      const signer = new SignatureTemplate(input.userWif);
      const commitments = mintedCards.map((c) => c.commitmentHex);
      const revealBytes = Buffer.from(`${input.userSeed}:${input.nonce}`, 'utf8').toString('hex');
      const tx = await contract.unlock
        .reveal(
          input.pending.commitmentHash,
          revealBytes,
          input.pending.commitHeight,
          input.pending.blockHashN1,
          input.pending.blockHashN2,
          entropyRoot,
          ...commitments,
          userPk,
          signer
        )
        .to(userAddr, 1000)
        .send();
      revealTxid = typeof tx === 'string' ? tx : tx.txid;
    } catch {
      // Offline fallback.
    }
  }

  return {
    revealTxid,
    cards: mintedCards,
    entropyRoot,
    commitmentHash: input.pending.commitmentHash,
    seedReveal: { userSeed: input.userSeed, nonce: input.nonce },
    blockHashes: {
      n: input.pending.blockHashN,
      n1: input.pending.blockHashN1,
      n2: input.pending.blockHashN2
    }
  };
}

export function revealBatchLocally(inputs: Array<{
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
}>) {
  return verifyBatchCardGeneration(inputs);
}

export async function redeemCardOnChipnet(userWif: string, card: CardAsset) {
  if (ENABLE_CHAIN_CALLS && !PRIZE_POOL_PKH) throw new Error('Missing PRIZE_POOL_PKH');
  const normalizedCard = normalizeCardAsset(card);

  const multiplierMilli = currentMultiplierMilli(normalizedCard, MOCK_CHAIN_HEIGHT);
  const adjustedFaceValue = Math.floor((normalizedCard.originalFaceValueSats * multiplierMilli) / 1000);
  const payout = Math.floor(adjustedFaceValue * 0.8);
  const houseCut = adjustedFaceValue - payout;

  let txid = `mock-redeem-${Date.now()}`;
  if (ENABLE_CHAIN_CALLS) {
    try {
      const { cashscript, bitcore } = await deps();
      const { Contract, ElectrumNetworkProvider, SignatureTemplate } = cashscript;
      const userKey = bitcore.PrivateKey.fromWIF(userWif);
      const userPk = Buffer.from(userKey.toPublicKey().toBuffer()).toString('hex');
      const userAddr = userKey.toAddress(bitcore.Networks.testnet).toString();
      const artifact = loadArtifact('CardRedeemer');
      const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
      const contract = new Contract(artifact, [PRIZE_POOL_PKH], { provider });
      const signer = new SignatureTemplate(userWif);
      const poolAddress = bitcore.Address.fromPublicKeyHash(Buffer.from(PRIZE_POOL_PKH, 'hex'), bitcore.Networks.testnet).toString();
      const tx = await contract.unlock
        .redeem(
          userPk,
          signer,
          payout,
          houseCut,
          normalizedCard.weeklyDriftMilli,
          normalizedCard.randomCapWeeks,
          normalizedCard.mintBlockHeight
        )
        .to(userAddr, payout)
        .to(poolAddress, houseCut)
        .send();
      txid = typeof tx === 'string' ? tx : tx.txid;
    } catch {
      // Offline fallback.
    }
  }

  return { txid, payout, houseCut, multiplierMilli, adjustedFaceValue };
}

export async function commitMarketIntentOnChipnet(input: {
  walletWif: string;
  action: 'list' | 'buy';
  payload: string;
}) {
  const { cashscript, bitcore } = await deps();
  const key = bitcore.PrivateKey.fromWIF(input.walletWif);
  const walletAddress = key.toAddress(bitcore.Networks.testnet).toString();
  const signatureMessage = `BurnBounty Market ${input.action}\n${input.payload}`;
  const signature = signBchAuthMessage(input.walletWif, signatureMessage);
  const payloadDigest = crypto.createHash('sha256').update(input.payload).digest('hex');

  let txid = crypto
    .createHash('sha256')
    .update(`market:${input.action}:${walletAddress}:${signature}:${payloadDigest}:${Date.now()}`)
    .digest('hex');
  let chainCommitted = false;

  if (ENABLE_CHAIN_CALLS) {
    const { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } = cashscript;
    const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
    const signer = new SignatureTemplate(input.walletWif);
    const utxos = await provider.getUtxos(walletAddress);
    const spendable = utxos
      .filter((utxo: any) => !utxo.token)
      .sort((a: any, b: any) => (a.satoshis === b.satoshis ? 0 : a.satoshis > b.satoshis ? -1 : 1));

    if (!spendable.length) {
      throw new Error('No spendable BCH UTXOs available to commit market intent on chain.');
    }

    const estimateFee = (inputCount: number) => BigInt(12 + inputCount * 148 + 2 * 34 + 80);
    const dust = 546n;
    const selected: any[] = [];
    let total = 0n;
    for (const utxo of spendable) {
      selected.push(utxo);
      total += BigInt(utxo.satoshis);
      const required = estimateFee(selected.length) + dust;
      if (total >= required) break;
    }

    const fee = estimateFee(selected.length);
    const change = total - fee;
    if (change < dust) {
      throw new Error('Insufficient BCH balance for market intent commit fee.');
    }

    const txBuilder = new TransactionBuilder({
      provider,
      maximumFeeSatoshis: 20_000n,
      maximumFeeSatsPerByte: 3
    });

    txBuilder.addInputs(selected, signer.unlockP2PKH());
    txBuilder.addOpReturnOutput([
      'BurnBounty',
      'market-intent',
      input.action,
      `0x${payloadDigest.slice(0, 32)}`,
      `0x${payloadDigest.slice(32)}`
    ]);
    txBuilder.addOutput({ to: walletAddress, amount: change });

    const sent = await txBuilder.send();
    txid = sent.txid;
    chainCommitted = true;
  }

  return { walletAddress, signature, txid, chainCommitted };
}

export async function escrowListCardOnChipnet(input: {
  sellerWif: string;
  sellerAddress?: string;
  tokenCategory: string;
  tokenCommitment: string;
  priceSats: number;
}) {
  if (!ENABLE_CHAIN_CALLS) {
    throw new Error('On-chain escrow listing requires ENABLE_CHAIN_CALLS=true.');
  }

  const { cashscript, bitcore } = await deps();
  const { Contract, ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } = cashscript;
  const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
  const sellerKey = bitcore.PrivateKey.fromWIF(input.sellerWif);
  const sellerAddress = input.sellerAddress || sellerKey.toAddress(bitcore.Networks.testnet).toString();
  const sellerPkh = Buffer.from(bitcore.Address.fromString(sellerAddress).hashBuffer).toString('hex');
  const tokenCategory = normalizeHex(input.tokenCategory);
  const tokenCommitment = normalizeHex(input.tokenCommitment);

  const escrowArtifact = loadArtifact('Escrow');
  const escrowContract = new Contract(escrowArtifact, [sellerPkh, tokenCategory, tokenCommitment], { provider });
  const signer = new SignatureTemplate(input.sellerWif);

  const utxos = await provider.getUtxos(sellerAddress);
  const nftUtxo = utxos.find(
    (utxo: any) =>
      utxo.token &&
      normalizeHex(String(utxo.token.category || '')) === tokenCategory &&
      normalizeHex(String(utxo.token.nft?.commitment || '')) === tokenCommitment
  );
  if (!nftUtxo) {
    throw new Error('Seller token UTXO not found for this card. Ensure the NFT is on-chain in seller wallet.');
  }

  const spendableBch = utxos
    .filter((utxo: any) => !utxo.token && !(utxo.txid === nftUtxo.txid && utxo.vout === nftUtxo.vout))
    .sort((a: any, b: any) => (a.satoshis === b.satoshis ? 0 : a.satoshis > b.satoshis ? -1 : 1));

  const selectedBch: any[] = [];
  let totalIn = toBigIntSats(nftUtxo.satoshis);
  const dust = 546n;
  const estimateFee = (inputCount: number, outputCount: number) => BigInt(12 + inputCount * 148 + outputCount * 34 + 120);

  while (totalIn - dust - estimateFee(1 + selectedBch.length, 2) < dust && spendableBch.length > selectedBch.length) {
    const next = spendableBch[selectedBch.length];
    selectedBch.push(next);
    totalIn += toBigIntSats(next.satoshis);
  }

  const fee = estimateFee(1 + selectedBch.length, 2);
  const change = totalIn - dust - fee;
  if (change < dust) throw new Error('Insufficient BCH to escrow card and cover miner fee.');

  const txBuilder = new TransactionBuilder({
    provider,
    maximumFeeSatoshis: 30_000n,
    maximumFeeSatsPerByte: 4
  });

  txBuilder.addInput(nftUtxo, signer.unlockP2PKH());
  if (selectedBch.length) txBuilder.addInputs(selectedBch, signer.unlockP2PKH());
  txBuilder.addOutput({
    to: escrowContract.address,
    amount: dust,
    token: nftUtxo.token
  });
  txBuilder.addOutput({ to: sellerAddress, amount: change });
  const sent = await txBuilder.send();

  return {
    sellerAddress,
    escrowAddress: escrowContract.address,
    txid: sent.txid,
    vout: 0,
    tokenCategory,
    tokenCommitment,
    chainCommitted: true
  };
}

export async function escrowBuyCardOnChipnet(input: {
  buyerWif: string;
  buyerAddress?: string;
  sellerAddress: string;
  priceSats: number;
  tokenCategory: string;
  tokenCommitment: string;
  escrowTxid: string;
  escrowVout: number;
}) {
  if (!ENABLE_CHAIN_CALLS) {
    throw new Error('On-chain escrow settlement requires ENABLE_CHAIN_CALLS=true.');
  }

  const { cashscript, bitcore } = await deps();
  const { Contract, ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } = cashscript;
  const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);

  const buyerKey = bitcore.PrivateKey.fromWIF(input.buyerWif);
  const buyerAddress = input.buyerAddress || buyerKey.toAddress(bitcore.Networks.testnet).toString();
  const buyerPubHex = Buffer.from(buyerKey.toPublicKey().toBuffer()).toString('hex');

  const sellerAddress = input.sellerAddress;
  const tokenCategory = normalizeHex(input.tokenCategory);
  const tokenCommitment = normalizeHex(input.tokenCommitment);
  const sellerPkh = Buffer.from(bitcore.Address.fromString(sellerAddress).hashBuffer).toString('hex');

  const escrowArtifact = loadArtifact('Escrow');
  const escrowContract = new Contract(escrowArtifact, [sellerPkh, tokenCategory, tokenCommitment], { provider });
  const escrowUtxos = await escrowContract.getUtxos();
  const escrowUtxo = escrowUtxos.find((utxo: any) => utxo.txid === input.escrowTxid && Number(utxo.vout) === Number(input.escrowVout));
  if (!escrowUtxo) {
    throw new Error('Escrow UTXO not found. Listing may already be settled or canceled.');
  }

  const buyerSigner = new SignatureTemplate(input.buyerWif);
  const buyerUtxos = (await provider.getUtxos(buyerAddress))
    .filter((utxo: any) => !utxo.token)
    .sort((a: any, b: any) => (a.satoshis === b.satoshis ? 0 : a.satoshis > b.satoshis ? -1 : 1));

  const price = BigInt(input.priceSats);
  const tokenOutSats = toBigIntSats(escrowUtxo.satoshis);
  const selectedBuyerUtxos: any[] = [];
  let totalBuyer = 0n;
  const estimateFee = (inputCount: number, outputCount: number) => BigInt(12 + inputCount * 148 + outputCount * 34 + 120);
  while (totalBuyer < price + estimateFee(1 + selectedBuyerUtxos.length, 3) && buyerUtxos.length > selectedBuyerUtxos.length) {
    const next = buyerUtxos[selectedBuyerUtxos.length];
    selectedBuyerUtxos.push(next);
    totalBuyer += toBigIntSats(next.satoshis);
  }

  const fee = estimateFee(1 + selectedBuyerUtxos.length, 3);
  const buyerChange = totalBuyer - price - fee;
  if (buyerChange < 546n) throw new Error('Insufficient buyer balance to settle escrow listing.');

  const txBuilder = new TransactionBuilder({
    provider,
    maximumFeeSatoshis: 50_000n,
    maximumFeeSatsPerByte: 5
  });

  txBuilder.addInput(escrowUtxo, escrowContract.unlock.settle(buyerPubHex));
  if (selectedBuyerUtxos.length) txBuilder.addInputs(selectedBuyerUtxos, buyerSigner.unlockP2PKH());

  // Contract-enforced order.
  txBuilder.addOutput({ to: sellerAddress, amount: price });
  txBuilder.addOutput({ to: buyerAddress, amount: tokenOutSats, token: escrowUtxo.token });
  txBuilder.addOutput({ to: buyerAddress, amount: buyerChange });
  const sent = await txBuilder.send();

  return {
    buyerAddress,
    txid: sent.txid,
    chainCommitted: true
  };
}

