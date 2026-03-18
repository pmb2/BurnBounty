import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import { parseWalletAuthChallengeMessage } from '@/lib/auth/challenge';
import { signBchAuthMessage } from '@/lib/auth/bch-message';
import { createWalletChallenge, verifyWalletChallenge } from '@/lib/auth/service';
import { resetAuthStoreForTests } from '@/lib/auth/store';

test('challenge format is deterministic and parseable', async () => {
  await resetAuthStoreForTests();
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();

  const challenge = await createWalletChallenge({
    actionLabel: 'Login',
    purpose: 'login',
    walletProvider: 'external_bch',
    walletSignMode: 'manual',
    address,
    domain: 'localhost:3000'
  });

  const parsed = parseWalletAuthChallengeMessage(challenge.challenge);
  assert.equal(parsed.purpose, 'login');
  assert.equal(parsed.domain, 'localhost:3000');
  assert.equal(parsed.walletProvider, 'external_bch');
  assert.equal(parsed.walletSignMode, 'manual');
  assert.ok(parsed.nonce.length >= 16);
  assert.ok(parsed.statement.includes('will not cost BCH'));
});

test('challenge rejects purpose mismatch and single-use replay', async () => {
  await resetAuthStoreForTests();
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const challenge = await createWalletChallenge({
    actionLabel: 'Login',
    purpose: 'login',
    walletProvider: 'external_bch',
    walletSignMode: 'manual',
    address,
    domain: 'localhost:3000'
  });
  const signature = signBchAuthMessage(privateKey.toWIF(), challenge.challenge);

  await assert.rejects(
    () =>
      verifyWalletChallenge({
        challengeId: challenge.id,
        address,
        signature,
        expectedPurpose: 'link_wallet'
      }),
    (err: any) => err?.code === 'challenge_purpose_mismatch'
  );

  await verifyWalletChallenge({
    challengeId: challenge.id,
    address,
    signature,
    expectedPurpose: 'login'
  });

  await assert.rejects(
    () =>
      verifyWalletChallenge({
        challengeId: challenge.id,
        address,
        signature,
        expectedPurpose: 'login'
      }),
    (err: any) => err?.code === 'challenge_used'
  );
});

test('challenge consume remains single-winner under concurrent verify attempts', async () => {
  await resetAuthStoreForTests();
  const privateKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = privateKey.toAddress((bitcore as any).Networks.testnet).toString();
  const challenge = await createWalletChallenge({
    actionLabel: 'Login',
    purpose: 'login',
    walletProvider: 'external_bch',
    walletSignMode: 'manual',
    address,
    domain: 'localhost:3000'
  });
  const signature = signBchAuthMessage(privateKey.toWIF(), challenge.challenge);

  const attempts = await Promise.allSettled([
    verifyWalletChallenge({ challengeId: challenge.id, address, signature, expectedPurpose: 'login' }),
    verifyWalletChallenge({ challengeId: challenge.id, address, signature, expectedPurpose: 'login' })
  ]);

  const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
  const rejected = attempts.filter((a) => a.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason?.code, 'challenge_used');
});
