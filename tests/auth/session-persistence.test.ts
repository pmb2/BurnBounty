import test from 'node:test';
import assert from 'node:assert/strict';
import { issueSessionForUser, markRecentSessionAuth, requireRecentSessionAuth, revokeSessionToken, validateSessionToken } from '@/lib/auth/session';
import { resetAuthStoreForTests } from '@/lib/auth/store';
import { registerEmbedded } from '@/lib/auth/service';

test('db-backed session can be issued, validated, and revoked', async () => {
  await resetAuthStoreForTests();
  const registered = await registerEmbedded({ username: 'sid-hunter', passphrase: 'passphrase-1234' });
  const { token, payload } = await issueSessionForUser({
    userId: registered.user.id,
    authMethod: 'embedded_wallet',
    primaryAddress: null
  });

  const validated = await validateSessionToken(token);
  assert.equal(validated.userId, payload.userId);
  assert.equal(validated.sid, payload.sid);

  await revokeSessionToken(token, 'test');
  await assert.rejects(
    () => validateSessionToken(token),
    (err: any) => err?.code === 'session_revoked'
  );
});

test('recent-auth checks enforce sensitive action posture', async () => {
  await resetAuthStoreForTests();
  const registered = await registerEmbedded({ username: 'reauth-hunter', passphrase: 'passphrase-1234' });
  const { token, payload } = await issueSessionForUser({
    userId: registered.user.id,
    authMethod: 'embedded_wallet',
    primaryAddress: null
  });
  const validated = await validateSessionToken(token);
  assert.ok(validated.sid);

  await assert.rejects(
    () => requireRecentSessionAuth(validated.sid!, 300),
    (err: any) => err?.code === 'recent_auth_required'
  );

  await markRecentSessionAuth(validated.sid!);
  await requireRecentSessionAuth(validated.sid!, 300);
});
