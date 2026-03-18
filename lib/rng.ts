// @ts-nocheck
import crypto from 'node:crypto';
import type { PackSeries, Tier } from '@/types/cards';

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

export const WEEKLY_DRIFT_RANGES_MILLI: Record<Tier, [number, number]> = {
  Bronze: [-3, 1],
  Silver: [-2, 4],
  Gold: [-1, 6],
  Diamond: [1, 8]
};

export const RANDOM_CAP_WEEK_RANGES: Record<Tier, [number, number]> = {
  Bronze: [0, 52],
  Silver: [26, 104],
  Gold: [78, 182],
  Diamond: [130, 260]
};

export const FLOOR_MULTIPLIER_MILLI = 400;
export const BLOCKS_PER_WEEK = 1008;

export const SERIES_CONFIG: Record<PackSeries, { priceSats: number; minDriftMilli: number; label: string }> = {
  GENESIS_BETA: { priceSats: 5_000_000, minDriftMilli: 5, label: 'Genesis Beta (Series 1)' },
  FOUNDER_EDITION: { priceSats: 2_000_000, minDriftMilli: 1, label: 'Founder Edition (Series 2)' },
  NORMAL: { priceSats: 800_000, minDriftMilli: -3, label: 'Normal' }
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

function createEntropySource(seedHex: string) {
  const seed = Buffer.from(seedHex, 'hex');
  let counter = 0;
  let pool = Buffer.alloc(0);
  let offset = 0;

  function refill() {
    const c = Buffer.allocUnsafe(4);
    c.writeUInt32BE(counter++, 0);
    pool = Buffer.concat([pool.subarray(offset), sha256(Buffer.concat([seed, c]))]);
    offset = 0;
  }

  function nextUint32() {
    if (offset + 4 > pool.length) refill();
    const value = pool.readUInt32BE(offset);
    offset += 4;
    return value;
  }

  return { nextUint32 };
}

function drawUniform(source: { nextUint32: () => number }, maxExclusive: number): number {
  const max = BigInt(maxExclusive);
  if (max <= 0n) throw new Error('maxExclusive must be > 0');
  const uint64Max = 1n << 64n;
  const threshold = uint64Max - (uint64Max % max);

  for (;;) {
    const hi = BigInt(source.nextUint32());
    const lo = BigInt(source.nextUint32());
    const value = (hi << 32n) | lo;
    if (value < threshold) return Number(value % max);
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
  weeklyDriftMilli: number;
  randomCapWeeks: number;
};

export function generateCardsFromEntropy(
  entropyRootHex: string,
  cardCount = 5,
  series: PackSeries = 'NORMAL'
): GeneratedCard[] {
  const mixedHex = mix32Rounds(entropyRootHex);
  const source = createEntropySource(mixedHex);
  const seriesMinDrift = SERIES_CONFIG[series].minDriftMilli;

  const cards: GeneratedCard[] = [];
  for (let i = 0; i < cardCount; i++) {
    const roll = drawUniform(source, 100);
    const tier = tierFromRoll(roll);
    const [min, max] = FACE_VALUE_RANGES[tier];
    const span = max - min + 1;
    const faceValueSats = min + drawUniform(source, span);
    const [driftMin, driftMax] = WEEKLY_DRIFT_RANGES_MILLI[tier];
    const driftSpan = driftMax - driftMin + 1;
    const weeklyDriftMilli = Math.max(seriesMinDrift, driftMin + drawUniform(source, driftSpan));
    const [capMin, capMax] = RANDOM_CAP_WEEK_RANGES[tier];
    const capSpan = capMax - capMin + 1;
    const randomCapWeeks = capMin + drawUniform(source, capSpan);
    cards.push({ tier, faceValueSats, weeklyDriftMilli, randomCapWeeks });
  }

  return cards;
}

export function generateBatchCards(entropyRoots: string[], cardCount = 5, series: PackSeries = 'NORMAL'): GeneratedCard[][] {
  return entropyRoots.map((root) => generateCardsFromEntropy(root, cardCount, series));
}
