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

export function encodeCommitment(tier: number, faceValueSats: number): string {
  const buf = new Uint8Array(9);
  buf[0] = tier;
  const view = new DataView(buf.buffer);
  view.setBigUint64(1, BigInt(faceValueSats));
  return Buffer.from(buf).toString('hex');
}

export function parseCommitmentHex(hex: string): { tierByte: number; faceValueSats: number } {
  const raw = Buffer.from(hex, 'hex');
  if (raw.length !== 9) throw new Error('Invalid commitment length');
  const tierByte = raw[0];
  const faceValueSats = Number(raw.readBigUInt64BE(1));
  return { tierByte, faceValueSats };
}