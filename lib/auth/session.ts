import crypto from 'node:crypto';
import { dbQuery } from '@/lib/db/postgres';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';
import type { SessionPayload } from '@/types/auth';

export const sessionCookieName = 'bb_session';

function secret() {
  const value = process.env.AUTH_JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw authError('migration_required', 'AUTH_JWT_SECRET must be set in production', 503);
  }
  return 'dev-insecure-change-me';
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifySessionTokenLocal(token?: string | null): null | SessionPayload {
  if (!token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function issueSessionForUser(payload: SessionPayload & { ttlSeconds?: number }) {
  const sid = crypto.randomUUID();
  const body: SessionPayload = {
    ...payload,
    sid,
    iat: Math.floor(Date.now() / 1000),
    exp: payload.exp || Math.floor(Date.now() / 1000) + (payload.ttlSeconds || 60 * 60 * 24 * 7)
  };
  const payloadB64 = b64url(JSON.stringify(body));
  const sig = sign(payloadB64);
  const token = `${payloadB64}.${sig}`;

  await dbQuery(
    `
      insert into auth_sessions (id, user_id, token_hash, expires_at, issued_at, last_seen_at)
      values ($1, $2, $3, $4, now(), now())
    `,
    [sid, payload.userId, tokenHash(token), new Date(body.exp * 1000).toISOString()]
  );

  return { token, payload: body };
}

export async function validateSessionToken(token?: string | null) {
  const payload = verifySessionTokenLocal(token);
  if (!payload?.sid) throw authError('session_invalid');
  const { rows } = await dbQuery(
    `
      select id, user_id, expires_at, revoked_at
      from auth_sessions
      where id = $1 and token_hash = $2
      limit 1
    `,
    [payload.sid, tokenHash(token!)]
  );
  const row = rows[0];
  if (!row) throw authError('session_invalid');
  if (row.revoked_at) throw authError('session_revoked');
  if (Date.parse(row.expires_at) <= Date.now()) throw authError('session_invalid');

  await dbQuery(`update auth_sessions set last_seen_at = now() where id = $1`, [payload.sid]);
  return payload;
}

export async function revokeSessionToken(token?: string | null, reason = 'logout') {
  if (!token) return;
  const payload = verifySessionTokenLocal(token);
  if (!payload?.sid) return;
  await dbQuery(
    `update auth_sessions set revoked_at = now(), revocation_reason = $2 where id = $1 and revoked_at is null`,
    [payload.sid, reason]
  );
  await recordAuthAuditEventSafe({
    eventType: 'session_revoked',
    outcome: 'success',
    userId: payload.userId,
    metadata: { reason }
  });
}

export async function markRecentSessionAuth(sessionId: string) {
  await dbQuery(`update auth_sessions set recent_auth_at = now() where id = $1`, [sessionId]);
}

export async function requireRecentSessionAuth(sessionId: string, withinSeconds = 300) {
  const { rows } = await dbQuery(
    `
      select recent_auth_at
      from auth_sessions
      where id = $1
      limit 1
    `,
    [sessionId]
  );
  const stamp = rows[0]?.recent_auth_at;
  if (!stamp) throw authError('recent_auth_required');
  const delta = (Date.now() - Date.parse(stamp)) / 1000;
  if (!Number.isFinite(delta) || delta > withinSeconds) throw authError('recent_auth_required');
}
