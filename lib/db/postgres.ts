import { Pool, type PoolClient, type QueryResult } from 'pg';
import { DataType, newDb } from 'pg-mem';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { authError } from '@/lib/auth/errors';

let pool: Pool | null = null;
let migrationApplied = false;

function migrationSql() {
  const file = path.join(process.cwd(), 'db', 'migrations', '20260319_auth_production.sql');
  return fs.readFileSync(file, 'utf8');
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || '';
}

function isTestMode() {
  return process.env.NODE_ENV === 'test' || process.env.AUTH_TEST_USE_INMEM_DB === 'true';
}

function createPool() {
  if (isTestMode()) {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    mem.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => crypto.randomUUID()
    });
    const adapter = mem.adapters.createPg();
    return new adapter.Pool();
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw authError('migration_required', 'DATABASE_URL (or SUPABASE_DB_URL) is required for auth persistence', 503);
  }

  return new Pool({
    connectionString,
    max: 12,
    idleTimeoutMillis: 10_000
  });
}

async function ensureMigrations(client: PoolClient) {
  if (migrationApplied) return;
  const rawSql = migrationSql();
  const sql = isTestMode() ? rawSql.replace(/create extension if not exists pgcrypto;?/i, '') : rawSql;
  await client.query(sql);
  migrationApplied = true;
}

export async function withDb<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) pool = createPool();
  const client = await pool.connect();
  try {
    await ensureMigrations(client);
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function dbQuery<T = unknown>(text: string, values?: any[]): Promise<QueryResult<T>> {
  return withDb((client) => client.query<T>(text, values));
}

export async function dbTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withDb(async (client) => {
    await client.query('begin');
    try {
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback');
      throw err;
    }
  });
}

export async function resetDbForTests() {
  await withDb(async (client) => {
    await client.query(`delete from market_listings`);
    await client.query(`delete from auth_rate_limit_counters`);
    await client.query(`delete from auth_audit_events`);
    await client.query(`delete from auth_sessions`);
    await client.query(`delete from auth_wallet_secrets`);
    await client.query(`delete from auth_wallet_challenges`);
    await client.query(`delete from auth_wallets`);
    await client.query(`delete from auth_identities`);
    await client.query(`delete from auth_users`);
  });
}
