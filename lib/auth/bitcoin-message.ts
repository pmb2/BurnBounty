export function buildBitcoinSignedMessageBuffer(B: any, message: string): Buffer {
  const prefix = B.from('Bitcoin Signed Message:\n', 'utf8');
  const msg = B.from(message, 'utf8');
  return B.concat([encodeVarInt(B, prefix.length), prefix, encodeVarInt(B, msg.length), msg]);
}

export function encodeVarInt(B: any, value: number): Buffer {
  if (value < 0xfd) return B.from([value]);
  if (value <= 0xffff) {
    const out = B.allocUnsafe(3);
    out[0] = 0xfd;
    out.writeUInt16LE(value, 1);
    return out;
  }
  if (value <= 0xffffffff) {
    const out = B.allocUnsafe(5);
    out[0] = 0xfe;
    out.writeUInt32LE(value, 1);
    return out;
  }
  const out = B.allocUnsafe(9);
  out[0] = 0xff;
  out.writeBigUInt64LE(BigInt(value), 1);
  return out;
}
