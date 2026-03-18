import bitcore from 'bitcore-lib-cash';
import { normalizeBchAddress } from '@/lib/auth/bch-address';
import { buildBitcoinSignedMessageBuffer } from '@/lib/auth/bitcoin-message';
import type { AuthErrorCode, SignatureVerificationResult } from '@/types/auth-errors';

export function signBchAuthMessage(wif: string, message: string): string {
  const privateKey = (bitcore as any).PrivateKey.fromWIF(wif.trim());
  const hash = hashBitcoinSignedMessage(message);
  const signature = (bitcore as any).crypto.ECDSA.sign(hash, privateKey);
  const compactSigned = (bitcore as any).crypto.ECDSA.calci(hash, signature, privateKey.toPublicKey());
  return compactSigned.toCompact().toString('base64');
}

export function verifyBchSignedMessage(input: {
  address: string;
  message: string;
  signature: string;
}): SignatureVerificationResult {
  let normalized;
  try {
    normalized = normalizeBchAddress(input.address);
  } catch {
    return { ok: false, code: 'invalid_address' };
  }

  let compactSig;
  try {
    compactSig = (bitcore as any).crypto.Signature.fromCompact(Buffer.from(input.signature.trim(), 'base64'));
  } catch {
    return { ok: false, code: 'malformed_signature' };
  }

  let recoveredPub;
  try {
    recoveredPub = (bitcore as any).crypto.ECDSA.recoverPublicKey(hashBitcoinSignedMessage(input.message), compactSig);
  } catch {
    return { ok: false, code: 'invalid_signature' };
  }

  try {
    const net =
      normalized.network === 'mainnet'
        ? (bitcore as any).Networks.livenet
        : normalized.network === 'testnet'
          ? (bitcore as any).Networks.testnet
          : normalized.network === 'regtest'
            ? (bitcore as any).Networks.regtest
            : null;

    if (!net) return { ok: false, code: 'invalid_address' };
    const signerAddress = recoveredPub.toAddress(net).toCashAddress().toLowerCase();
    const signerLegacy = recoveredPub.toAddress(net).toLegacyAddress();
    const signerNormalized = normalizeBchAddress(signerAddress);

    if (signerNormalized.storageKey !== normalized.storageKey) {
      return {
        ok: false,
        code: 'address_mismatch',
        normalizedAddress: normalized.canonicalCashAddr,
        signerAddress,
        signerAddressLegacy: signerLegacy
      };
    }

    return {
      ok: true,
      normalizedAddress: normalized.canonicalCashAddr,
      signerAddress,
      signerAddressLegacy: signerLegacy
    };
  } catch {
    return { ok: false, code: 'crypto_verification_failed' };
  }
}

export function classifyBchVerificationError(result: SignatureVerificationResult): AuthErrorCode {
  return result.code || 'crypto_verification_failed';
}

function hashBitcoinSignedMessage(message: string): Buffer {
  const data = buildBitcoinSignedMessageBuffer(Buffer, message);
  return (bitcore as any).crypto.Hash.sha256sha256(data);
}
