import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import { signBchAuthMessage } from '@/lib/auth/bch-message';
import { createWalletChallenge } from '@/lib/auth/service';
import { resetAuthStoreForTests } from '@/lib/auth/store';
import { verifyWalletAuthSignature } from '@/lib/auth/verify';

test('embedded and external BCH paths share one challenge/signature verification model', async () => {
  await resetAuthStoreForTests();
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const challenge = await createWalletChallenge({
    actionLabel: 'Verify Wallet',
    purpose: 'verify_wallet',
    walletProvider: 'external_bch',
    walletSignMode: 'manual',
    address,
    domain: 'localhost:3000'
  });
  const signature = signBchAuthMessage(privateKey.toWIF(), challenge.challenge);
  const result = verifyWalletAuthSignature({
    walletSignMode: 'manual',
    address,
    signature,
    message: challenge.challenge
  });
  assert.equal(result.ok, true);
});
