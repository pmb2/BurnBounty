import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import { addressesEqual, isValidBchAddress, normalizeBchAddress } from '@/lib/auth/bch-address';

test('cashaddr and legacy representations normalize to same canonical key', () => {
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const cash = privateKey.toAddress((bitcore as any).Networks.testnet).toCashAddress();
  const legacy = privateKey.toAddress((bitcore as any).Networks.testnet).toLegacyAddress();

  const a = normalizeBchAddress(cash);
  const b = normalizeBchAddress(legacy);

  assert.equal(a.storageKey, b.storageKey);
  assert.equal(addressesEqual(cash, legacy), true);
});

test('invalid addresses fail normalization and validation', () => {
  assert.equal(isValidBchAddress('not-an-address'), false);
  assert.throws(() => normalizeBchAddress('not-an-address'));
});

