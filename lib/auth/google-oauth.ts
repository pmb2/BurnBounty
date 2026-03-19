import crypto from 'node:crypto';
import { authError } from '@/lib/auth/errors';

type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

function getSecret() {
  return process.env.AUTH_JWT_SECRET || 'dev-insecure-change-me';
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function mustEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI') {
  const value = process.env[name];
  if (!value) throw authError('migration_required', `${name} is required for Google OAuth`, 503);
  return value;
}

export function createGoogleState(nextPath: string) {
  const payload = {
    nextPath: nextPath.startsWith('/') ? nextPath : '/play',
    nonce: crypto.randomUUID(),
    iat: Date.now()
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function parseGoogleState(state: string | null | undefined) {
  if (!state) throw authError('challenge_invalid', 'Missing OAuth state');
  const [payloadB64, sig] = state.split('.');
  if (!payloadB64 || !sig) throw authError('challenge_invalid', 'Malformed OAuth state');
  const expected = sign(payloadB64);
  if (expected.length !== sig.length) throw authError('challenge_invalid', 'Invalid OAuth state');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    throw authError('challenge_invalid', 'Invalid OAuth state signature');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
    nextPath: string;
    nonce: string;
    iat: number;
  };
  if (!payload?.iat || Date.now() - payload.iat > 10 * 60_000) {
    throw authError('challenge_expired', 'OAuth state expired');
  }
  return payload;
}

export function buildGoogleAuthUrl(state: string) {
  const clientId = mustEnv('GOOGLE_CLIENT_ID');
  const redirectUri = mustEnv('GOOGLE_REDIRECT_URI');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForProfile(code: string): Promise<GoogleProfile> {
  const clientId = mustEnv('GOOGLE_CLIENT_ID');
  const clientSecret = mustEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = mustEnv('GOOGLE_REDIRECT_URI');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code
    })
  });
  if (!tokenRes.ok) throw authError('invalid_credentials', 'Google token exchange failed', 401);
  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  if (!tokenJson.id_token) throw authError('invalid_credentials', 'Google id_token missing', 401);

  const verifyRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`,
    { method: 'GET' }
  );
  if (!verifyRes.ok) throw authError('invalid_credentials', 'Google token verification failed', 401);
  const info = (await verifyRes.json()) as Record<string, string>;
  if (!info.sub || !info.email) throw authError('invalid_credentials', 'Google profile incomplete', 401);
  if (info.aud !== clientId) throw authError('invalid_credentials', 'Google audience mismatch', 401);
  const issuer = info.iss || '';
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(issuer)) {
    throw authError('invalid_credentials', 'Google issuer mismatch', 401);
  }

  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === 'true',
    name: info.name,
    picture: info.picture
  };
}
