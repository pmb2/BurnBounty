import type { WalletSignMode } from '@/types/auth';
import type { SignatureVerificationResult } from '@/types/auth-errors';
import { verifyBchSignedMessage } from '@/lib/auth/bch-message';
import { verifyMetaMaskSnapAuthSignature } from '@/lib/auth/metamask-snap';

export function verifyWalletAuthSignature(input: {
  walletSignMode: WalletSignMode;
  address: string;
  signature: string;
  message: string;
}): SignatureVerificationResult {
  if (input.walletSignMode === 'metamask_snap') {
    const snap = verifyMetaMaskSnapAuthSignature(input);
    if (!snap.ok) return { ok: false, code: 'invalid_signature' };
    return {
      ok: true,
      normalizedAddress: input.address.trim().toLowerCase(),
      signerAddress: snap.recoveredAddress
    };
  }
  return verifyBchSignedMessage({
    address: input.address,
    message: input.message,
    signature: input.signature
  });
}
