import type { Tier } from '@/types/cards';

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
  return Buffer.from(buf).toString('hex');
}

export function parseCommitmentHex(hex: string): {
  tierByte: number;
  faceValueSats: number;
  weeklyDriftMilli: number;
  randomCapWeeks: number;
  mintBlockHeight: number;
} {
  const raw = Buffer.from(hex, 'hex');
  if (raw.length !== 17) throw new Error('Invalid commitment length');
  const tierByte = raw[0];
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const faceValueSats = Number(view.getBigUint64(1));
  const weeklyDriftMilli = view.getInt16(9);
  const randomCapWeeks = view.getUint16(11);
  const mintBlockHeight = view.getUint32(13);
  return { tierByte, faceValueSats, weeklyDriftMilli, randomCapWeeks, mintBlockHeight };
}
