// @ts-nocheck
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CARD_TEMPLATES } from '@/data/cards';
import { encodeCommitment, satsToBch } from '@/lib/cards';
import { commitmentFromSeed, ODDS } from '@/lib/rng';
import { verifyBatchCardGeneration, verifyCardGeneration } from '@/lib/verify';
import type { CardAsset, CommitPackResult, PendingPack, RevealPackResult } from '@/types/cards';

const PACK_PRICE_SATS = Number(process.env.PACK_PRICE_SATS || 100_000);
const PACK_HOUSE_CUT_SATS = Math.floor(PACK_PRICE_SATS * 0.2);
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

function asCardAssets(cards: Array<{ tier: string; faceValueSats: number }>): CardAsset[] {
  return cards.map((entry, i) => {
    const templatePool = CARD_TEMPLATES.filter((c) => c.tier === entry.tier);
    const template = templatePool[i % templatePool.length];
    const tierByte = entry.tier === 'Bronze' ? 1 : entry.tier === 'Silver' ? 2 : entry.tier === 'Gold' ? 3 : 4;
    const commitmentHex = encodeCommitment(tierByte, entry.faceValueSats);
    const nftId = crypto.createHash('sha256').update(`${TOKEN_CATEGORY}:${commitmentHex}:${i}`).digest('hex');
    return {
      nftId,
      categoryId: TOKEN_CATEGORY,
      commitmentHex,
      name: template.name,
      tier: entry.tier,
      faceValueSats: entry.faceValueSats,
      payoutSats: Math.floor(entry.faceValueSats * 0.8),
      payoutBch: satsToBch(Math.floor(entry.faceValueSats * 0.8)),
      serial: nftId.slice(0, 12).toUpperCase(),
      image: template.image,
      bcmrUri: `ipfs://bafkrei-burnbounty-poc/cards/${template.id}.json`
    };
  });
}

function applyDemoShowcaseRig(
  cards: Array<{ tier: string; faceValueSats: number }>,
  entropyRoot: string
): Array<{ tier: string; faceValueSats: number }> {
  if (!DEMO_SHOWCASE_MODE) return cards;

  // Deterministic showcase index for repeatable demo recordings.
  const idx = parseInt(entropyRoot.slice(0, 2), 16) % cards.length;
  const next = [...cards];
  next[idx] = {
    tier: DEMO_SHOWCASE_FORCE_TIER,
    faceValueSats: DEMO_SHOWCASE_FACE_SATS
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

export async function commitPackOnChipnet(input: { userWif: string; commitmentHash: string }): Promise<CommitPackResult> {
  const commitHeight = MOCK_CHAIN_HEIGHT;
  const commitTxid = crypto.createHash('sha256').update(`${input.commitmentHash}:${Date.now()}`).digest('hex');
  const userAddr = `demo-user-${crypto.createHash('sha256').update(input.userWif).digest('hex').slice(0, 24)}`;

  const pending: CommitPackResult = {
    commitTxid,
    commitHeight,
    commitmentHash: input.commitmentHash,
    userAddress: userAddr,
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
      const revealContract = new Contract(revealArtifact, [REVEAL_WINDOW_BLOCKS, PRIZE_POOL_PKH, TOKEN_CATEGORY, PACK_HOUSE_CUT_SATS], { provider });
      const commitContract = new Contract(commitArtifact, [PACK_PRICE_SATS, revealContract.bytecode], { provider });
      await commitContract.unlock.commit(input.commitmentHash, commitHeight).to(revealContract.address, PACK_PRICE_SATS).send();
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
    commitTxid: input.pending.commitTxid
  });

  const mintedCards = asCardAssets(applyDemoShowcaseRig(cards, entropyRoot));

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
      const contract = new Contract(revealArtifact, [REVEAL_WINDOW_BLOCKS, PRIZE_POOL_PKH, TOKEN_CATEGORY, PACK_HOUSE_CUT_SATS], { provider });
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

  const payout = Math.floor(card.faceValueSats * 0.8);
  const houseCut = card.faceValueSats - payout;

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
      const tx = await contract.unlock.redeem(userPk, signer, payout, houseCut).to(userAddr, payout).to(poolAddress, houseCut).send();
      txid = typeof tx === 'string' ? tx : tx.txid;
    } catch {
      // Offline fallback.
    }
  }

  return { txid, payout, houseCut };
}

