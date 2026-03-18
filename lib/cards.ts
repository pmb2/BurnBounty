import type { CardAsset, PackSeries, Tier } from '@/types/cards';

export function tierClass(tier: Tier) {
  switch (tier) {
    case 'Diamond':
      return 'border-cyan-300 shadow-diamond';
    case 'Gold':
      return 'border-yellow-300 shadow-gold';
    case 'Silver':
      return 'border-slate-300 shadow-silver';
    default:
      return 'border-amber-700 shadow-bronze';
  }
}

export function satsToBch(sats: number): number {
  return sats / 100_000_000;
}

const LEGACY_FALLBACK_MINT_HEIGHT = 1_740_005;

const DRIFT_RANGE_BY_TIER: Record<Tier, [number, number]> = {
  Bronze: [-3, 1],
  Silver: [-2, 4],
  Gold: [-1, 6],
  Diamond: [1, 8]
};

const CAP_RANGE_BY_TIER: Record<Tier, [number, number]> = {
  Bronze: [0, 52],
  Silver: [26, 104],
  Gold: [78, 182],
  Diamond: [130, 260]
};

const SERIES_MIN_DRIFT: Record<PackSeries, number> = {
  GENESIS_BETA: 5,
  FOUNDER_EDITION: 1,
  NORMAL: -3
};

function bytesToHex(bytes: Uint8Array) {
  let hex = '';
  for (const value of bytes) hex += value.toString(16).padStart(2, '0');
  return hex;
}

function hexToBytes(hex: string) {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex encoding');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return out;
}

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deterministicRange(seed: string, min: number, max: number) {
  const span = max - min + 1;
  return min + (fnv1a32(seed) % span);
}

function tierFromByte(byte: number): Tier {
  if (byte === 2) return 'Silver';
  if (byte === 3) return 'Gold';
  if (byte === 4) return 'Diamond';
  return 'Bronze';
}

function tierToByte(tier: Tier): number {
  if (tier === 'Silver') return 2;
  if (tier === 'Gold') return 3;
  if (tier === 'Diamond') return 4;
  return 1;
}

export function encodeCommitment(
  tier: number,
  faceValueSats: number,
  weeklyDriftMilli: number,
  randomCapWeeks: number,
  mintBlockHeight: number
): string {
  const buf = new Uint8Array(17);
  buf[0] = tier;
  const view = new DataView(buf.buffer);
  view.setBigUint64(1, BigInt(faceValueSats));
  view.setInt16(9, weeklyDriftMilli);
  view.setUint16(11, randomCapWeeks);
  view.setUint32(13, mintBlockHeight);
  return bytesToHex(buf);
}

export function parseCommitmentHexFlexible(hex: string): {
  tierByte: number;
  faceValueSats: number;
  weeklyDriftMilli?: number;
  randomCapWeeks?: number;
  mintBlockHeight?: number;
} {
  const raw = hexToBytes(hex);
  if (raw.length < 9) throw new Error('Invalid commitment length');
  const tierByte = raw[0];
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const faceValueSats = Number(view.getBigUint64(1));
  if (raw.length >= 17) {
    const weeklyDriftMilli = view.getInt16(9);
    const randomCapWeeks = view.getUint16(11);
    const mintBlockHeight = view.getUint32(13);
    return { tierByte, faceValueSats, weeklyDriftMilli, randomCapWeeks, mintBlockHeight };
  }
  return { tierByte, faceValueSats };
}

export function deriveLegacyDecayProfile(tier: Tier, entropyKey: string, series: PackSeries = 'NORMAL') {
  const [driftMin, driftMax] = DRIFT_RANGE_BY_TIER[tier];
  const [capMin, capMax] = CAP_RANGE_BY_TIER[tier];
  const weeklyDriftMilli = Math.max(
    SERIES_MIN_DRIFT[series],
    deterministicRange(`${entropyKey}:${tier}:drift`, driftMin, driftMax)
  );
  const randomCapWeeks = deterministicRange(`${entropyKey}:${tier}:cap`, capMin, capMax);
  return { weeklyDriftMilli, randomCapWeeks };
}

export function normalizeCardAsset(card: Partial<CardAsset> & Record<string, any>): CardAsset {
  if (!card.nftId) throw new Error('Missing nftId');

  let parsed:
    | {
        tierByte: number;
        faceValueSats: number;
        weeklyDriftMilli?: number;
        randomCapWeeks?: number;
        mintBlockHeight?: number;
      }
    | null = null;

  if (typeof card.commitmentHex === 'string' && card.commitmentHex.length >= 18) {
    try {
      parsed = parseCommitmentHexFlexible(card.commitmentHex);
    } catch {
      parsed = null;
    }
  }

  const tier = (card.tier || (parsed ? tierFromByte(parsed.tierByte) : 'Bronze')) as Tier;
  const series = (card.series || 'NORMAL') as PackSeries;
  const faceValueSats = Number(card.faceValueSats || parsed?.faceValueSats || card.originalFaceValueSats || 0);
  if (!Number.isFinite(faceValueSats) || faceValueSats <= 0) {
    throw new Error('Missing face value for card normalization');
  }

  const originalFaceValueSats = Number(card.originalFaceValueSats || faceValueSats);
  const entropyKey = `${card.nftId}:${card.commitmentHex || 'legacy'}:${tier}`;
  const legacyProfile = deriveLegacyDecayProfile(tier, entropyKey, series);

  const weeklyDriftMilli = Number(
    parsed?.weeklyDriftMilli ?? card.weeklyDriftMilli ?? legacyProfile.weeklyDriftMilli
  );
  const randomCapWeeks = Number(
    parsed?.randomCapWeeks ?? card.randomCapWeeks ?? legacyProfile.randomCapWeeks
  );
  const mintBlockHeight = Number(
    parsed?.mintBlockHeight ?? card.mintBlockHeight ?? LEGACY_FALLBACK_MINT_HEIGHT
  );

  const payoutSats = Number(card.payoutSats || Math.floor(originalFaceValueSats * 0.8));
  const serial = (card.serial || card.nftId.slice(0, 12).toUpperCase()) as string;

  return {
    nftId: card.nftId,
    categoryId: (card.categoryId || 'legacy-category') as string,
    commitmentHex: (card.commitmentHex || '') as string,
    name: (card.name || `${tier} Bounty Card`) as string,
    tier,
    series,
    faceValueSats,
    originalFaceValueSats,
    payoutSats,
    payoutBch: Number(card.payoutBch || satsToBch(payoutSats)),
    weeklyDriftMilli,
    randomCapWeeks,
    mintBlockHeight,
    serial,
    image: (card.image || '/cards/3LjTX.jpg') as string,
    bcmrUri: (card.bcmrUri || `ipfs://burnbounty/legacy/${card.nftId}.json`) as string
  };
}

export function parseCommitmentHex(hex: string): {
  tierByte: number;
  faceValueSats: number;
  weeklyDriftMilli: number;
  randomCapWeeks: number;
  mintBlockHeight: number;
} {
  const parsed = parseCommitmentHexFlexible(hex);
  if (
    typeof parsed.weeklyDriftMilli !== 'number' ||
    typeof parsed.randomCapWeeks !== 'number' ||
    typeof parsed.mintBlockHeight !== 'number'
  ) {
    throw new Error('Invalid commitment length');
  }
  const tierByte = parsed.tierByte;
  const faceValueSats = parsed.faceValueSats;
  const weeklyDriftMilli = parsed.weeklyDriftMilli;
  const randomCapWeeks = parsed.randomCapWeeks;
  const mintBlockHeight = parsed.mintBlockHeight;
  return { tierByte, faceValueSats, weeklyDriftMilli, randomCapWeeks, mintBlockHeight };
}
