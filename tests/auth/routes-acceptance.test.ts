import test from 'node:test';
import assert from 'node:assert/strict';
import bitcore from 'bitcore-lib-cash';
import { NextRequest } from 'next/server';
import { resetAuthStoreForTests } from '@/lib/auth/store';
import { signBchAuthMessage } from '@/lib/auth/bch-message';
import { POST as registerPost } from '@/app/api/auth/register/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { POST as walletChallengePost } from '@/app/api/auth/wallet/challenge/route';
import { POST as walletVerifyPost } from '@/app/api/auth/wallet/verify/route';
import { POST as walletUnlinkPost } from '@/app/api/auth/wallet/unlink/route';
import { POST as embeddedCreatePost } from '@/app/api/auth/wallet/embedded/create/route';
import { POST as embeddedExportRequestPost } from '@/app/api/auth/wallet/embedded/export/request/route';
import { POST as legacyChallengePost } from '@/app/api/auth/challenge/route';
import { POST as legacyVerifyPost } from '@/app/api/auth/verify/route';
import { POST as listingsPost } from '@/app/api/trading/listings/route';
import { POST as listingBuyPost } from '@/app/api/trading/listings/[id]/buy/route';

function mkReq(url: string, method: 'GET' | 'POST', body?: unknown, cookie?: string) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', `bb_session=${cookie}`);
  return new NextRequest(
    new Request(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  );
}

function extractSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/bb_session=([^;]+)/);
  return match?.[1] || null;
}

async function readJson<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

test('register -> login -> me -> logout -> revoked session denied', async () => {
  await resetAuthStoreForTests();

  const registerRes = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-user-1',
      passphrase: 'route-passphrase-1234',
      displayName: 'Route User 1'
    })
  );
  assert.equal(registerRes.status, 200);
  const token = extractSessionCookie(registerRes);
  assert.ok(token);

  const meBeforeLogout = await meGet(mkReq('http://localhost/api/auth/me', 'GET', undefined, token!));
  assert.equal(meBeforeLogout.status, 200);

  const logoutRes = await logoutPost(mkReq('http://localhost/api/auth/logout', 'POST', {}, token!));
  assert.equal(logoutRes.status, 200);

  const meAfterLogout = await meGet(mkReq('http://localhost/api/auth/me', 'GET', undefined, token!));
  assert.equal(meAfterLogout.status, 401);
  const meErr = await readJson(meAfterLogout);
  assert.equal(meErr.error, 'session_revoked');

  const loginRes = await loginPost(
    mkReq('http://localhost/api/auth/login', 'POST', {
      username: 'route-user-1',
      passphrase: 'route-passphrase-1234'
    })
  );
  assert.equal(loginRes.status, 200);
});

test('challenge verify replay rejected and concurrent verify single-winner', async () => {
  await resetAuthStoreForTests();
  const key = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = key.toAddress((bitcore as any).Networks.testnet).toString();

  const challengeRes = await walletChallengePost(
    mkReq('http://localhost/api/auth/wallet/challenge', 'POST', {
      actionLabel: 'Login',
      purpose: 'login',
      walletProvider: 'external_bch',
      walletSignMode: 'manual',
      address
    })
  );
  assert.equal(challengeRes.status, 200);
  const challengeBody = await readJson<{ challengeId: string; challenge: string }>(challengeRes);
  const signature = signBchAuthMessage(key.toWIF(), challengeBody.challenge);

  const verifyOnce = await walletVerifyPost(
    mkReq('http://localhost/api/auth/wallet/verify', 'POST', {
      challengeId: challengeBody.challengeId,
      address,
      signature,
      expectedPurpose: 'login'
    })
  );
  assert.equal(verifyOnce.status, 200);

  const replay = await walletVerifyPost(
    mkReq('http://localhost/api/auth/wallet/verify', 'POST', {
      challengeId: challengeBody.challengeId,
      address,
      signature,
      expectedPurpose: 'login'
    })
  );
  assert.equal(replay.status, 410);
  const replayBody = await readJson(replay);
  assert.equal(replayBody.error, 'challenge_used');

  const c2Res = await walletChallengePost(
    mkReq('http://localhost/api/auth/wallet/challenge', 'POST', {
      actionLabel: 'Login',
      purpose: 'login',
      walletProvider: 'external_bch',
      walletSignMode: 'manual',
      address
    })
  );
  const c2Body = await readJson<{ challengeId: string; challenge: string }>(c2Res);
  const sig2 = signBchAuthMessage(key.toWIF(), c2Body.challenge);

  const [v1, v2] = await Promise.all([
    walletVerifyPost(
      mkReq('http://localhost/api/auth/wallet/verify', 'POST', {
        challengeId: c2Body.challengeId,
        address,
        signature: sig2,
        expectedPurpose: 'login'
      })
    ),
    walletVerifyPost(
      mkReq('http://localhost/api/auth/wallet/verify', 'POST', {
        challengeId: c2Body.challengeId,
        address,
        signature: sig2,
        expectedPurpose: 'login'
      })
    )
  ]);
  const statuses = [v1.status, v2.status].sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 410]);
});

test('link conflict across users and canonical legacy shim cannot bypass identity uniqueness', async () => {
  await resetAuthStoreForTests();
  const extKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const cash = extKey.toAddress((bitcore as any).Networks.testnet).toCashAddress();
  const legacy = extKey.toAddress((bitcore as any).Networks.testnet).toLegacyAddress();

  const u1Register = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-link-user-1',
      passphrase: 'route-passphrase-1234'
    })
  );
  const u1Cookie = extractSessionCookie(u1Register)!;

  const u2Register = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-link-user-2',
      passphrase: 'route-passphrase-1234'
    })
  );
  const u2Cookie = extractSessionCookie(u2Register)!;

  const linkChallengeU1 = await walletChallengePost(
    mkReq(
      'http://localhost/api/auth/wallet/challenge',
      'POST',
      {
        actionLabel: 'Link Wallet',
        purpose: 'link_wallet',
        walletProvider: 'external_bch',
        walletSignMode: 'manual',
        address: cash
      },
      u1Cookie
    )
  );
  const lc1 = await readJson<{ challengeId: string; challenge: string }>(linkChallengeU1);
  const s1 = signBchAuthMessage(extKey.toWIF(), lc1.challenge);
  const linkVerifyU1 = await walletVerifyPost(
    mkReq(
      'http://localhost/api/auth/wallet/verify',
      'POST',
      {
        challengeId: lc1.challengeId,
        address: cash,
        signature: s1,
        expectedPurpose: 'link_wallet'
      },
      u1Cookie
    )
  );
  assert.equal(linkVerifyU1.status, 200);

  const linkChallengeU2 = await walletChallengePost(
    mkReq(
      'http://localhost/api/auth/wallet/challenge',
      'POST',
      {
        actionLabel: 'Link Wallet',
        purpose: 'link_wallet',
        walletProvider: 'external_bch',
        walletSignMode: 'manual',
        address: legacy
      },
      u2Cookie
    )
  );
  const lc2 = await readJson<{ challengeId: string; challenge: string }>(linkChallengeU2);
  const s2 = signBchAuthMessage(extKey.toWIF(), lc2.challenge);
  const linkVerifyU2 = await walletVerifyPost(
    mkReq(
      'http://localhost/api/auth/wallet/verify',
      'POST',
      {
        challengeId: lc2.challengeId,
        address: legacy,
        signature: s2,
        expectedPurpose: 'link_wallet'
      },
      u2Cookie
    )
  );
  assert.equal(linkVerifyU2.status, 409);
  const conflict = await readJson(linkVerifyU2);
  assert.equal(conflict.error, 'wallet_already_bound');

  // legacy shim path must map both formats to the same user identity.
  const legacyChallenge1 = await legacyChallengePost(
    mkReq('http://localhost/api/auth/challenge', 'POST', {
      address: legacy,
      walletType: 'electrum'
    })
  );
  const lcLegacy = await readJson<{ challengeId: string; message: string }>(legacyChallenge1);
  const lsig = signBchAuthMessage(extKey.toWIF(), lcLegacy.message);
  const legacyVerify1 = await legacyVerifyPost(
    mkReq('http://localhost/api/auth/verify', 'POST', {
      address: legacy,
      walletType: 'electrum',
      signature: lsig,
      message: lcLegacy.message,
      challengeId: lcLegacy.challengeId
    })
  );
  const lv1 = await readJson<{ user: { id: string } }>(legacyVerify1);

  const legacyChallenge2 = await legacyChallengePost(
    mkReq('http://localhost/api/auth/challenge', 'POST', {
      address: cash,
      walletType: 'electrum'
    })
  );
  const lcCash = await readJson<{ challengeId: string; message: string }>(legacyChallenge2);
  const csig = signBchAuthMessage(extKey.toWIF(), lcCash.message);
  const legacyVerify2 = await legacyVerifyPost(
    mkReq('http://localhost/api/auth/verify', 'POST', {
      address: cash,
      walletType: 'electrum',
      signature: csig,
      message: lcCash.message,
      challengeId: lcCash.challengeId
    })
  );
  const lv2 = await readJson<{ user: { id: string } }>(legacyVerify2);

  assert.equal(lv1.user.id, lv2.user.id);
});

test('embedded export/unlink require recent-auth and pass after verify-wallet', async () => {
  await resetAuthStoreForTests();

  const accountKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const accountAddress = accountKey.toAddress((bitcore as any).Networks.testnet).toString();

  const registerRes = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-sensitive-user',
      passphrase: 'route-passphrase-1234'
    })
  );
  const cookie = extractSessionCookie(registerRes)!;

  const linkEmbeddedRes = await embeddedCreatePost(
    mkReq(
      'http://localhost/api/auth/wallet/embedded/create',
      'POST',
      {
        address: accountAddress,
        walletCreatedAt: new Date().toISOString(),
        walletVersion: 'v1-client-encrypted'
      },
      cookie
    )
  );
  assert.equal(linkEmbeddedRes.status, 200);

  const exportBefore = await embeddedExportRequestPost(
    mkReq('http://localhost/api/auth/wallet/embedded/export/request', 'POST', {}, cookie)
  );
  assert.equal(exportBefore.status, 403);
  const exportBeforeBody = await readJson(exportBefore);
  assert.equal(exportBeforeBody.error, 'recent_auth_required');

  const unlinkBefore = await walletUnlinkPost(
    mkReq('http://localhost/api/auth/wallet/unlink', 'POST', { address: accountAddress }, cookie)
  );
  assert.equal(unlinkBefore.status, 403);
  const unlinkBeforeBody = await readJson(unlinkBefore);
  assert.equal(unlinkBeforeBody.error, 'recent_auth_required');

  const verifyChallenge = await walletChallengePost(
    mkReq(
      'http://localhost/api/auth/wallet/challenge',
      'POST',
      {
        actionLabel: 'Verify Wallet',
        purpose: 'verify_wallet',
        walletProvider: 'external_bch',
        walletSignMode: 'manual',
        address: accountAddress
      },
      cookie
    )
  );
  const verifyChallengeBody = await readJson<{ challengeId: string; challenge: string }>(verifyChallenge);
  const verifySig = signBchAuthMessage(accountKey.toWIF(), verifyChallengeBody.challenge);
  const verifyRes = await walletVerifyPost(
    mkReq(
      'http://localhost/api/auth/wallet/verify',
      'POST',
      {
        challengeId: verifyChallengeBody.challengeId,
        address: accountAddress,
        signature: verifySig,
        expectedPurpose: 'verify_wallet'
      },
      cookie
    )
  );
  assert.equal(verifyRes.status, 200);
  const refreshedCookie = extractSessionCookie(verifyRes) || cookie;

  const exportAfter = await embeddedExportRequestPost(
    mkReq('http://localhost/api/auth/wallet/embedded/export/request', 'POST', {}, refreshedCookie)
  );
  assert.equal(exportAfter.status, 200);

  const unlinkAfter = await walletUnlinkPost(
    mkReq('http://localhost/api/auth/wallet/unlink', 'POST', { address: accountAddress }, refreshedCookie)
  );
  assert.equal(unlinkAfter.status, 200);
});

test('auth-critical trading listing creation requires durable valid session', async () => {
  await resetAuthStoreForTests();
  const key = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const address = key.toAddress((bitcore as any).Networks.testnet).toString();

  const registerRes = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-listing-user',
      passphrase: 'route-passphrase-1234'
    })
  );
  const cookie = extractSessionCookie(registerRes)!;

  const embeddedLink = await embeddedCreatePost(
    mkReq(
      'http://localhost/api/auth/wallet/embedded/create',
      'POST',
      {
        address,
        walletCreatedAt: new Date().toISOString(),
        walletVersion: 'v1-client-encrypted'
      },
      cookie
    )
  );
  assert.equal(embeddedLink.status, 200);

  const createOk = await listingsPost(
    mkReq(
      'http://localhost/api/trading/listings',
      'POST',
      {
        seller_address: address,
        card_id: 'card-1234',
        price_sats: 15000
      },
      cookie
    )
  );
  assert.equal(createOk.status, 200);

  await logoutPost(mkReq('http://localhost/api/auth/logout', 'POST', {}, cookie));
  const createAfterLogout = await listingsPost(
    mkReq(
      'http://localhost/api/trading/listings',
      'POST',
      {
        seller_address: address,
        card_id: 'card-5555',
        price_sats: 18000
      },
      cookie
    )
  );
  assert.equal(createAfterLogout.status, 401);
  const denied = await readJson(createAfterLogout);
  assert.equal(denied.error, 'session_revoked');
});

test('universal market buy: another authenticated user can buy active listing', async () => {
  await resetAuthStoreForTests();

  const sellerKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const sellerAddress = sellerKey.toAddress((bitcore as any).Networks.testnet).toString();
  const buyerKey = new (bitcore as any).PrivateKey(undefined, (bitcore as any).Networks.testnet);
  const buyerAddress = buyerKey.toAddress((bitcore as any).Networks.testnet).toString();

  const sellerRegister = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-market-seller',
      passphrase: 'route-passphrase-1234'
    })
  );
  const sellerCookie = extractSessionCookie(sellerRegister)!;
  await embeddedCreatePost(
    mkReq(
      'http://localhost/api/auth/wallet/embedded/create',
      'POST',
      { address: sellerAddress, walletCreatedAt: new Date().toISOString(), walletVersion: 'v1-client-encrypted' },
      sellerCookie
    )
  );

  const createListingRes = await listingsPost(
    mkReq(
      'http://localhost/api/trading/listings',
      'POST',
      {
        seller_address: sellerAddress,
        card_id: 'card-market-111',
        price_sats: 222222,
        card_snapshot: {
          nftId: 'card-market-111',
          name: 'Market Test Card',
          tier: 'Silver',
          image: '/cards/3LjTX.jpg',
          faceValueSats: 50000000,
          weeklyDriftMilli: 2,
          randomCapWeeks: 30,
          payoutSats: 40000000
        }
      },
      sellerCookie
    )
  );
  assert.equal(createListingRes.status, 200);
  const createdBody = await readJson<{ listing: { id: string } }>(createListingRes);
  assert.ok(createdBody.listing.id);

  const buyerRegister = await registerPost(
    mkReq('http://localhost/api/auth/register', 'POST', {
      username: 'route-market-buyer',
      passphrase: 'route-passphrase-1234'
    })
  );
  const buyerCookie = extractSessionCookie(buyerRegister)!;
  await embeddedCreatePost(
    mkReq(
      'http://localhost/api/auth/wallet/embedded/create',
      'POST',
      { address: buyerAddress, walletCreatedAt: new Date().toISOString(), walletVersion: 'v1-client-encrypted' },
      buyerCookie
    )
  );

  const buyRes = await listingBuyPost(
    mkReq(
      `http://localhost/api/trading/listings/${createdBody.listing.id}/buy`,
      'POST',
      { buyer_address: buyerAddress },
      buyerCookie
    ),
    { params: Promise.resolve({ id: createdBody.listing.id }) }
  );
  assert.equal(buyRes.status, 200);
  const buyBody = await readJson<{ listing: { status: string; buyer_address: string } }>(buyRes);
  assert.equal(buyBody.listing.status, 'sold');
  assert.ok(buyBody.listing.buyer_address);

  const rebuyRes = await listingBuyPost(
    mkReq(
      `http://localhost/api/trading/listings/${createdBody.listing.id}/buy`,
      'POST',
      { buyer_address: buyerAddress },
      buyerCookie
    ),
    { params: Promise.resolve({ id: createdBody.listing.id }) }
  );
  assert.equal(rebuyRes.status, 409);
});
