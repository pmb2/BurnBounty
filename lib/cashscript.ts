// @ts-nocheck
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CARD_TEMPLATES } from '@/data/cards';
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

function loadArtifact(name: 'PackCommit' | 'PackReveal' | 'PrizePool' | 'CardRedeemer') {
  const p = path.join(process.cwd(), 'artifacts', `${name}.artifact.json`);
  return JSON.parse(readFileSync(p, 'utf8'));
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

