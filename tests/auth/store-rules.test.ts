import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import {
  bindExternalWalletLogin,
  linkWalletToExistingUser,
  resetAuthStoreForTests,
  getWalletByAddress
} from '@/lib/auth/store';
import { loginEmbeddedUser, registerEmbedded } from '@/lib/auth/service';

test('embedded register/login works with scrypt passphrase digests', async () => {
  await resetAuthStoreForTests();
  const created = await registerEmbedded({ username: 'hunter1', passphrase: 'strong-passphrase-123', displayName: 'Hunter One' });
  assert.equal(created.user.profile.displayName, 'Hunter One');

  const logged = await loginEmbeddedUser({ username: 'hunter1', passphrase: 'strong-passphrase-123' });
  assert.equal(logged.user.id, created.user.id);
});

test('external wallet cannot be linked to two users', async () => {
  await resetAuthStoreForTests();
  const firstKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const firstAddress = firstKey.toAddress((bitcore as any).Networks.testnet).toString();
  const first = await bindExternalWalletLogin({
    address: firstAddress,
    walletType: 'external',
    signMode: 'manual'
  });
  const secondUser = await registerEmbedded({ username: 'hunter2', passphrase: 'strong-passphrase-456' });

  await assert.rejects(
    () =>
      linkWalletToExistingUser({
        userId: secondUser.user.id,
        address: first.primaryWallet?.address || '',
        walletType: 'external',
        signMode: 'manual'
      }),
    (err: any) => err?.code === 'wallet_already_bound'
  );

  const persisted = await getWalletByAddress(firstAddress);
  assert.equal(persisted?.userId, first.user.id);
});
