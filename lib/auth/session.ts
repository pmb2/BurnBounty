import crypto from 'node:crypto';

const SESSION_COOKIE = 'bb_session';

function secret() {
  return process.env.AUTH_JWT_SECRET || 'dev-insecure-change-me';
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

export function createSessionToken(payload: { address: string; walletType: string; exp?: number }) {
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: payload.exp || Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  };
  const payloadB64 = b64url(JSON.stringify(body));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token?: string | null): null | { address: string; walletType: string; exp: number } {
  if (!token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export const sessionCookieName = SESSION_COOKIE;
