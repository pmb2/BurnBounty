import crypto from 'node:crypto';
import { dbQuery } from '@/lib/db/postgres';

function windowStartDate(windowMs: number) {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  return new Date(start);
}

function hashKey(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function checkRateLimit(input: { scope: string; key: string; max: number; windowMs: number }) {
  const start = windowStartDate(input.windowMs);
  const now = new Date();
  const keyHash = hashKey(input.key);
  const { rows } = await dbQuery(
    `
      insert into auth_rate_limit_counters (scope, key_hash, window_start, counter, updated_at)
      values ($1, $2, $3, 1, $4)
      on conflict (scope, key_hash, window_start)
      do update set counter = auth_rate_limit_counters.counter + 1, updated_at = excluded.updated_at
      returning counter
    `,
    [input.scope, keyHash, start.toISOString(), now.toISOString()]
  );
  const counter = Number(rows[0]?.counter || 0);
  if (counter > input.max) {
    const retryAfterMs = start.getTime() + input.windowMs - Date.now();
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }
  return { allowed: true, remaining: Math.max(input.max - counter, 0) };
}
