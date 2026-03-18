import crypto from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function scryptAsync(input: Buffer, salt: Buffer, keylen: number, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      input,
      salt,
      keylen,
      {
        N: n,
        r,
        p,
        maxmem: 64 * 1024 * 1024
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(Buffer.from(derivedKey));
      }
    );
  });
}

function timingSafeHexEquals(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isLegacySha256PassphraseDigest(storedDigest: string): boolean {
  return /^[a-f0-9]{64}$/i.test(storedDigest.trim());
}

export async function derivePassphraseDigest(passphrase: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(Buffer.from(passphrase, 'utf8'), salt, SCRYPT_KEYLEN, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [
    SCRYPT_PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString('base64url'),
    key.toString('base64url')
  ].join('$');
}

export async function verifyPassphraseDigest(passphrase: string, storedDigest: string): Promise<boolean> {
  const digest = storedDigest.trim();
  if (!digest) return false;

  if (isLegacySha256PassphraseDigest(digest)) {
    return timingSafeHexEquals(digest.toLowerCase(), sha256Hex(passphrase));
  }

  const [prefix, nRaw, rRaw, pRaw, saltB64, keyB64] = digest.split('$');
  if (prefix !== SCRYPT_PREFIX || !nRaw || !rRaw || !pRaw || !saltB64 || !keyB64) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(saltB64, 'base64url');
  const expected = Buffer.from(keyB64, 'base64url');
  const actual = await scryptAsync(Buffer.from(passphrase, 'utf8'), salt, expected.length, n, r, p);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
