import { recoverPersonalSignature } from '@metamask/eth-sig-util';

export function verifyMetaMaskSnapAuthSignature(input: {
  address: string;
  message: string;
  signature: string;
}) {
  try {
    const hexMessage = `0x${Buffer.from(input.message, 'utf8').toString('hex')}`;
    const recoveredAddress = recoverPersonalSignature({
      data: hexMessage,
      signature: input.signature.trim()
    });
    return {
      ok: recoveredAddress.toLowerCase() === input.address.trim().toLowerCase(),
      recoveredAddress
    };
  } catch {
    return { ok: false as const };
  }
}
