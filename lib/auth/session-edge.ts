import type { SessionPayload } from '@/types/auth';

const enc = new TextEncoder();
const dec = new TextDecoder();

function secret() {
  const value = process.env.AUTH_JWT_SECRET;
  if (value) return value;
  return process.env.NODE_ENV === 'production' ? '' : 'dev-insecure-change-me';
}

async function hmacSha256(message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function verifySessionTokenEdge(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = await hmacSha256(payloadB64);
  if (expected !== sig) return null;
  const payload = JSON.parse(dec.decode(fromBase64Url(payloadB64)));
  if (!payload?.sid || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
