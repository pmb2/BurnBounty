import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import { signBchAuthMessage, verifyBchSignedMessage } from '@/lib/auth/bch-message';

test('BCH signed message verification passes for valid signer and message', () => {
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const wif = privateKey.toWIF();
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const message = 'BurnBounty auth challenge test';
  const signature = signBchAuthMessage(wif, message);

  const result = verifyBchSignedMessage({ address, message, signature });
  assert.equal(result.ok, true);
});

test('BCH signed message verification fails for mismatched message', () => {
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const wif = privateKey.toWIF();
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const signature = signBchAuthMessage(wif, 'message-one');
  const result = verifyBchSignedMessage({ address, message: 'message-two', signature });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'address_mismatch');
});

test('BCH signed message verification fails for mismatched address', () => {
  const signer = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const other = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const signature = signBchAuthMessage(signer.toWIF(), 'shared-message');
  const result = verifyBchSignedMessage({
    address: other.toAddress((bitcore as any).Networks.testnet).toString(),
    message: 'shared-message',
    signature
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'address_mismatch');
});

test('BCH signed message verification rejects malformed signatures', () => {
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const result = verifyBchSignedMessage({
    address,
    message: 'msg',
    signature: 'not-a-base64-signature'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'malformed_signature');
});

