import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWalletAuthSignature } from '@/lib/auth/verify';

test('metamask_snap path does not bypass signature verification', () => {
  const result = verifyWalletAuthSignature({
    walletSignMode: 'metamask_snap',
    address: '0x1234567890123456789012345678901234567890',
    message: 'BurnBounty',
    signature: 'invalid-signature'
  });
  assert.equal(result.ok, false);
});

test('bch verification path remains canonical for non-snap sign modes', () => {
  const result = verifyWalletAuthSignature({
    walletSignMode: 'manual',
    address: 'bchtest:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
    message: 'BurnBounty',
    signature: 'invalid-signature'
  });
  assert.equal(result.ok, false);
  assert.notEqual(result.code, 'provider_not_supported');
});

