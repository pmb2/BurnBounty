import bitcore from 'bitcore-lib-cash';

export function deriveAddressFromWif(wif: string): string {
  const key = bitcore.PrivateKey.fromWIF(wif);
  return key.toAddress(bitcore.Networks.testnet).toString();
}

export function pkhFromWif(wif: string): string {
  const key = bitcore.PrivateKey.fromWIF(wif);
  return key.toPublicKey().toAddress(bitcore.Networks.testnet).hashBuffer.toString('hex');
}