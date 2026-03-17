// @ts-nocheck
import crypto from 'node:crypto';
import type { Tier } from '@/types/cards';

export const ODDS = {
  Bronze: 70,
  Silver: 20,
  Gold: 8,
  Diamond: 2
} as const;

export const FACE_VALUE_RANGES: Record<Tier, [number, number]> = {
  Bronze: [10_000, 5_000_000],
  Silver: [100_000_000, 2_000_000_000],
  Gold: [5_000_000_000, 20_000_000_000],
  Diamond: [50_000_000_000, 500_000_000_000]
};

function sha256(data: Buffer | string): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

function hash256(data: Buffer | string): Buffer {
  return sha256(sha256(data));
}

export function hash256Hex(input: string): string {
  return hash256(Buffer.from(input, 'utf8')).toString('hex');
}

export function commitmentFromSeed(userSeed: string, nonce: string): string {
  return hash256Hex(`${userSeed}:${nonce}`);
}

export function deriveEntropyRoot(input: {
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
}): string {
  const data = Buffer.from(
    `${input.userSeed}:${input.nonce}:${input.blockHashN}:${input.blockHashN1}:${input.blockHashN2}:${input.commitTxid}`,
    'utf8'
  );
  return hash256(data).toString('hex');
}

export function mix32Rounds(rootHex: string): string {
  let state = Buffer.from(rootHex, 'hex');
  for (let i = 0; i < 32; i++) {
    const round = Buffer.allocUnsafe(4);
    round.writeUInt32BE(i, 0);

    const roundHash = sha256(Buffer.concat([round, state]));
    const mixed = Buffer.alloc(state.length);
    for (let j = 0; j < state.length; j++) mixed[j] = state[j] ^ roundHash[j];
    state = sha256(Buffer.concat([mixed, round]));
  }
  return state.toString('hex');
}

function expandStream(seedHex: string, minBytes: number): Buffer {
  const chunks: Buffer[] = [];
  let counter = 0;
  while (Buffer.concat(chunks).length < minBytes) {
    const c = Buffer.allocUnsafe(4);
    c.writeUInt32BE(counter++, 0);
    chunks.push(sha256(Buffer.concat([Buffer.from(seedHex, 'hex'), c])));
  }
  return Buffer.concat(chunks);
}

function drawUniform(stream: Buffer, cursor: { i: number }, maxExclusive: number): number {
  const uint32Max = 0x1_0000_0000;
  const threshold = uint32Max - (uint32Max % maxExclusive);

  for (;;) {
    if (cursor.i + 4 > stream.length) throw new Error('Entropy stream exhausted');
    const value = stream.readUInt32BE(cursor.i);
    cursor.i += 4;
    if (value < threshold) return value % maxExclusive;
  }
}

function tierFromRoll(roll: number): Tier {
  if (roll < ODDS.Bronze) return 'Bronze';
  if (roll < ODDS.Bronze + ODDS.Silver) return 'Silver';
  if (roll < ODDS.Bronze + ODDS.Silver + ODDS.Gold) return 'Gold';
  return 'Diamond';
}

export type GeneratedCard = {
  tier: Tier;
  faceValueSats: number;
};

export function generateCardsFromEntropy(entropyRootHex: string, cardCount = 5): GeneratedCard[] {
  const mixedHex = mix32Rounds(entropyRootHex);
  const stream = expandStream(mixedHex, cardCount * 16);
  const cursor = { i: 0 };

  const cards: GeneratedCard[] = [];
  for (let i = 0; i < cardCount; i++) {
    const roll = drawUniform(stream, cursor, 100);
    const tier = tierFromRoll(roll);
    const [min, max] = FACE_VALUE_RANGES[tier];
    const span = max - min + 1;
    const faceValueSats = min + drawUniform(stream, cursor, span);
    cards.push({ tier, faceValueSats });
  }

  return cards;
}

export function generateBatchCards(entropyRoots: string[], cardCount = 5): GeneratedCard[][] {
  return entropyRoots.map((root) => generateCardsFromEntropy(root, cardCount));
}
