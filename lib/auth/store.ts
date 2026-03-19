import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { normalizeBchAddress } from '@/lib/auth/bch-address';
import { authError } from '@/lib/auth/errors';
import { dbQuery, dbTx, resetDbForTests } from '@/lib/db/postgres';
import type {
  AuthIdentity,
  AuthIdentityType,
  AuthResult,
  SessionPayload,
  User,
  WalletChallenge,
  WalletChallengePurpose,
  WalletProviderKind,
  WalletRecord,
  WalletSignMode,
  WalletType
} from '@/types/auth';

function identityKey(type: AuthIdentityType, identifier: string) {
  return `${type}:${identifier.trim().toLowerCase()}`;
}

function isUniqueConstraintError(err: unknown): boolean {
  const code = (err as any)?.code;
  const message = String((err as any)?.message || '').toLowerCase();
  return code === '23505' || message.includes('duplicate key value violates unique constraint');
}

function mapUser(row: any): User {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString?.() || row.created_at,
    updatedAt: row.updated_at.toISOString?.() || row.updated_at,
    status: row.status,
    profile: {
      displayName: row.display_name || undefined,
      bio: row.bio || undefined,
      avatarUrl: row.avatar_url || undefined,
      rankLabel: row.rank_label || 'Greenhorn'
    }
  };
}

function mapWallet(row: any): WalletRecord {
  return {
    id: row.id,
    userId: row.user_id,
    chain: 'BCH',
    address: row.address_normalized,
    addressStorageKey: row.address_storage_key,
    type: row.type,
    label: row.label || undefined,
    isPrimary: !!row.is_primary,
    verifiedAt: row.verified_at?.toISOString?.() || row.verified_at || undefined,
    createdAt: row.created_at.toISOString?.() || row.created_at,
    metadata: row.metadata || {}
  };
}

function mapIdentity(row: any): AuthIdentity {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    identifier: row.identifier,
    verifiedAt: row.verified_at?.toISOString?.() || row.verified_at || undefined,
    createdAt: row.created_at.toISOString?.() || row.created_at,
    metadata: row.metadata || {}
  };
}

function mapChallenge(row: any): WalletChallenge {
  return {
    id: row.id,
    address: row.address_normalized || undefined,
    userId: row.user_id || undefined,
    challenge: row.challenge_text,
    nonce: row.nonce,
    purpose: row.purpose,
    walletProvider: row.provider,
    walletSignMode: row.sign_mode,
    expiresAt: row.expires_at.toISOString?.() || row.expires_at,
    usedAt: row.used_at?.toISOString?.() || row.used_at || undefined,
    createdAt: row.created_at.toISOString?.() || row.created_at,
    metadata: row.metadata || {}
  };
}

async function createUserTx(client: PoolClient, profileName?: string): Promise<User> {
  const displayName = profileName?.trim() || `Hunter-${Math.floor(1000 + Math.random() * 9000)}`;
  const { rows } = await client.query(
    `
      insert into auth_users (display_name, rank_label)
      values ($1, 'Greenhorn')
      returning *
    `,
    [displayName]
  );
  return mapUser(rows[0]);
}

export async function createUserProfile(input: {
  displayName?: string;
  avatarUrl?: string;
  rankLabel?: string;
}): Promise<User> {
  const displayName = input.displayName?.trim() || `Hunter-${Math.floor(1000 + Math.random() * 9000)}`;
  const avatarUrl = input.avatarUrl?.trim() || null;
  const rankLabel = input.rankLabel?.trim() || 'Greenhorn';
  const { rows } = await dbQuery(
    `
      insert into auth_users (display_name, avatar_url, rank_label)
      values ($1, $2, $3)
      returning *
    `,
    [displayName, avatarUrl, rankLabel]
  );
  return mapUser(rows[0]);
}

export async function updateUserProfile(input: {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  rankLabel?: string;
}): Promise<User> {
  const { rows } = await dbQuery(
    `
      update auth_users
      set display_name = coalesce($2, display_name),
          avatar_url = coalesce($3, avatar_url),
          rank_label = coalesce($4, rank_label),
          updated_at = now()
      where id = $1
      returning *
    `,
    [input.userId, input.displayName || null, input.avatarUrl || null, input.rankLabel || null]
  );
  if (!rows[0]) throw authError('auth_required', 'User not found');
  return mapUser(rows[0]);
}

export async function resetAuthStoreForTests() {
  await resetDbForTests();
}

export async function getUser(userId: string): Promise<User | null> {
  const { rows } = await dbQuery('select * from auth_users where id = $1 limit 1', [userId]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createIdentity(input: {
  userId: string;
  type: AuthIdentityType;
  identifier: string;
  metadata?: Record<string, unknown>;
  verified?: boolean;
}): Promise<AuthIdentity> {
  const normalized = identityKey(input.type, input.identifier);
  const { rows: existingRows } = await dbQuery(
    `select * from auth_identities where type = $1 and identifier_normalized = $2 limit 1`,
    [input.type, normalized]
  );
  if (existingRows[0]) {
    const existing = mapIdentity(existingRows[0]);
    if (existing.userId !== input.userId) throw authError('identity_already_bound');
    return existing;
  }

  const { rows } = await dbQuery(
    `
      insert into auth_identities (
        user_id, type, identifier, identifier_normalized, verified_at, metadata
      ) values ($1, $2, $3, $4, $5, $6::jsonb)
      returning *
    `,
    [
      input.userId,
      input.type,
      input.identifier.trim(),
      normalized,
      input.verified ? new Date() : null,
      JSON.stringify(input.metadata || {})
    ]
  );
  return mapIdentity(rows[0]);
}

export async function findIdentity(type: AuthIdentityType, identifier: string): Promise<AuthIdentity | null> {
  const normalized = identityKey(type, identifier);
  const { rows } = await dbQuery(
    `select * from auth_identities where type = $1 and identifier_normalized = $2 limit 1`,
    [type, normalized]
  );
  return rows[0] ? mapIdentity(rows[0]) : null;
}

export async function updateIdentityMetadata(identityId: string, metadata: Record<string, unknown>): Promise<AuthIdentity> {
  const { rows } = await dbQuery(
    `
      update auth_identities
      set metadata = metadata || $2::jsonb
      where id = $1
      returning *
    `,
    [identityId, JSON.stringify(metadata || {})]
  );
  if (!rows[0]) throw authError('auth_required', 'Identity not found');
  return mapIdentity(rows[0]);
}

export async function ensureEmbeddedUser(input: {
  username: string;
  passphraseHash: string;
  displayName?: string;
}): Promise<AuthResult> {
  const existing = await findIdentity('embedded_wallet', input.username);
  if (existing) throw authError('username_taken');

  const user = await dbTx(async (client) => {
    const created = await createUserTx(client, input.displayName || input.username);
    await client.query(
      `
        insert into auth_identities (
          user_id, type, identifier, identifier_normalized, verified_at, metadata
        ) values ($1, 'embedded_wallet', $2, $3, now(), $4::jsonb)
      `,
      [
        created.id,
        input.username,
        identityKey('embedded_wallet', input.username),
        JSON.stringify({ passphraseHash: input.passphraseHash })
      ]
    );
    return created;
  });

  return withWallets(user.id);
}

export async function upsertWallet(input: {
  userId: string;
  address: string;
  type: WalletType;
  label?: string;
  metadata?: Record<string, unknown>;
  verified?: boolean;
  makePrimary?: boolean;
  provider?: string;
  signMode?: string;
}): Promise<WalletRecord> {
  const normalized = normalizeBchAddress(input.address);
  const result = await dbTx(async (client) => {
    const { rows: existingRows } = await client.query(
      `select * from auth_wallets where chain = 'BCH' and address_storage_key = $1 limit 1 for update`,
      [normalized.storageKey]
    );

    if (existingRows[0]) {
      const existing = existingRows[0];
      if (existing.user_id && existing.user_id !== input.userId) throw authError('wallet_already_bound');
      const { rows } = await client.query(
        `
          update auth_wallets
          set user_id = $1,
              address_normalized = $2,
              address_display = $3,
              type = $4,
              provider = coalesce($5, provider),
              sign_mode = coalesce($6, sign_mode),
              label = coalesce($7, label),
              verified_at = case when $8 then now() else verified_at end,
              metadata = metadata || $9::jsonb,
              updated_at = now()
          where id = $10
          returning *
        `,
        [
          input.userId,
          normalized.canonicalCashAddr,
          normalized.legacyAddress,
          input.type,
          input.provider || null,
          input.signMode || null,
          input.label || null,
          !!input.verified,
          JSON.stringify(input.metadata || {}),
          existing.id
        ]
      );
      if (input.makePrimary) {
        await setPrimaryWalletTx(client, input.userId, normalized.storageKey);
      }
      return rows[0];
    }

    const { rows } = await client.query(
      `
        insert into auth_wallets (
          user_id, chain, address_normalized, address_display, address_storage_key,
          type, provider, sign_mode, label, is_primary, verified_at, metadata
        ) values (
          $1, 'BCH', $2, $3, $4, $5, $6, $7, $8, false, $9, $10::jsonb
        )
        returning *
      `,
      [
        input.userId,
        normalized.canonicalCashAddr,
        normalized.legacyAddress,
        normalized.storageKey,
        input.type,
        input.provider || null,
        input.signMode || null,
        input.label || null,
        input.verified ? new Date() : null,
        JSON.stringify(input.metadata || {})
      ]
    );
    const inserted = rows[0];
    const { rows: walletCountRows } = await client.query(
      `select count(*)::int as c from auth_wallets where user_id = $1`,
      [input.userId]
    );
    const shouldPrimary = input.makePrimary || Number(walletCountRows[0]?.c || 0) === 1;
    if (shouldPrimary) {
      await setPrimaryWalletTx(client, input.userId, normalized.storageKey);
      const { rows: refreshedRows } = await client.query(`select * from auth_wallets where id = $1`, [inserted.id]);
      return refreshedRows[0];
    }
    return inserted;
  });

  return mapWallet(result);
}

async function setPrimaryWalletTx(client: PoolClient, userId: string, storageKey: string) {
  await client.query(
    `update auth_wallets set is_primary = false, updated_at = now() where user_id = $1`,
    [userId]
  );
  await client.query(
    `update auth_wallets set is_primary = true, updated_at = now() where user_id = $1 and address_storage_key = $2`,
    [userId, storageKey]
  );
}

export async function getWalletByAddress(address: string): Promise<WalletRecord | null> {
  let normalized;
  try {
    normalized = normalizeBchAddress(address);
  } catch {
    return null;
  }
  const { rows } = await dbQuery(
    `select * from auth_wallets where chain = 'BCH' and address_storage_key = $1 limit 1`,
    [normalized.storageKey]
  );
  return rows[0] ? mapWallet(rows[0]) : null;
}

export async function getWalletsForUser(userId: string): Promise<WalletRecord[]> {
  const { rows } = await dbQuery(
    `select * from auth_wallets where user_id = $1 order by is_primary desc, created_at asc`,
    [userId]
  );
  return rows.map(mapWallet);
}

export async function upsertWalletSecret(input: {
  walletId: string;
  scheme: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  metadata?: Record<string, unknown>;
}) {
  await dbQuery(
    `
      insert into auth_wallet_secrets (
        wallet_id, scheme, ciphertext, iv, auth_tag, metadata, updated_at
      ) values ($1, $2, $3, $4, $5, $6::jsonb, now())
      on conflict (wallet_id)
      do update set
        scheme = excluded.scheme,
        ciphertext = excluded.ciphertext,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        metadata = auth_wallet_secrets.metadata || excluded.metadata,
        updated_at = now()
    `,
    [
      input.walletId,
      input.scheme,
      input.ciphertext,
      input.iv,
      input.authTag,
      JSON.stringify(input.metadata || {})
    ]
  );
}

export async function getWalletSecret(walletId: string): Promise<{
  scheme: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  metadata: Record<string, unknown>;
} | null> {
  const { rows } = await dbQuery(
    `select scheme, ciphertext, iv, auth_tag, metadata from auth_wallet_secrets where wallet_id = $1 limit 1`,
    [walletId]
  );
  if (!rows[0]) return null;
  return {
    scheme: rows[0].scheme,
    ciphertext: rows[0].ciphertext,
    iv: rows[0].iv,
    authTag: rows[0].auth_tag,
    metadata: rows[0].metadata || {}
  };
}

export async function listRecentSessions(userId: string, limit = 12) {
  const { rows } = await dbQuery(
    `
      select id, issued_at, last_seen_at, recent_auth_at, expires_at, revoked_at, revocation_reason, metadata
      from auth_sessions
      where user_id = $1
      order by issued_at desc
      limit $2
    `,
    [userId, Math.max(1, Math.min(limit, 50))]
  );
  return rows.map((row: any) => ({
    id: row.id,
    issuedAt: row.issued_at?.toISOString?.() || row.issued_at,
    lastSeenAt: row.last_seen_at?.toISOString?.() || row.last_seen_at || null,
    recentAuthAt: row.recent_auth_at?.toISOString?.() || row.recent_auth_at || null,
    expiresAt: row.expires_at?.toISOString?.() || row.expires_at,
    revokedAt: row.revoked_at?.toISOString?.() || row.revoked_at || null,
    revocationReason: row.revocation_reason || null,
    metadata: row.metadata || {}
  }));
}

export async function setPrimaryWallet(userId: string, address: string) {
  const normalized = normalizeBchAddress(address);
  await dbTx(async (client) => setPrimaryWalletTx(client, userId, normalized.storageKey));
}

export async function unlinkWallet(userId: string, address: string) {
  const normalized = normalizeBchAddress(address);
  await dbTx(async (client) => {
    const { rows } = await client.query(
      `select * from auth_wallets where user_id = $1 and address_storage_key = $2 limit 1 for update`,
      [userId, normalized.storageKey]
    );
    if (!rows[0]) throw authError('wallet_not_bound');

    const { rows: walletCountRows } = await client.query(
      `select count(*)::int as c from auth_wallets where user_id = $1`,
      [userId]
    );
    const walletCount = Number(walletCountRows[0]?.c || 0);
    const { rows: identityRows } = await client.query(`select type from auth_identities where user_id = $1`, [userId]);
    const hasNonWalletIdentity = identityRows.some((r: any) => ['embedded_wallet', 'email', 'device', 'guest'].includes(r.type));
    if (walletCount <= 1 && !hasNonWalletIdentity) {
      throw authError('cannot_remove_last_auth_method');
    }

    await client.query(
      `update auth_wallets set user_id = null, is_primary = false, updated_at = now() where id = $1`,
      [rows[0].id]
    );
  });
}

export async function issueChallenge(input: {
  challenge: string;
  nonce: string;
  purpose: WalletChallengePurpose;
  walletProvider: WalletProviderKind;
  walletSignMode: WalletSignMode;
  expiresAt: string;
  address?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<WalletChallenge> {
  const normalized = input.address ? normalizeBchAddress(input.address) : null;
  const challengeHash = crypto.createHash('sha256').update(input.challenge).digest('hex');
  const { rows } = await dbQuery(
    `
      insert into auth_wallet_challenges (
        user_id, address_normalized, address_storage_key, purpose, challenge_text, challenge_hash,
        nonce, domain, provider, sign_mode, issued_at, expires_at, metadata
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11, $12::jsonb
      )
      returning *
    `,
    [
      input.userId || null,
      normalized?.canonicalCashAddr || null,
      normalized?.storageKey || null,
      input.purpose,
      input.challenge,
      challengeHash,
      input.nonce,
      String(input.metadata?.domain || 'unknown'),
      input.walletProvider,
      input.walletSignMode,
      input.expiresAt,
      JSON.stringify(input.metadata || {})
    ]
  );
  return mapChallenge(rows[0]);
}

export async function getChallenge(id: string): Promise<WalletChallenge | null> {
  const { rows } = await dbQuery(`select * from auth_wallet_challenges where id = $1 limit 1`, [id]);
  return rows[0] ? mapChallenge(rows[0]) : null;
}

export async function consumeChallenge(id: string): Promise<WalletChallenge> {
  const { rows } = await dbQuery(
    `
      update auth_wallet_challenges
      set used_at = now(), status = 'used'
      where id = $1 and used_at is null and expires_at > now() and status = 'pending'
      returning *
    `,
    [id]
  );
  if (rows[0]) return mapChallenge(rows[0]);

  const { rows: staleRows } = await dbQuery(`select used_at, expires_at from auth_wallet_challenges where id = $1 limit 1`, [id]);
  if (!staleRows[0]) throw authError('challenge_not_found');
  if (staleRows[0].used_at) throw authError('challenge_used');
  throw authError('challenge_expired');
}

export async function pruneChallenges() {
  await dbQuery(
    `
      update auth_wallet_challenges
      set status = 'expired'
      where status = 'pending' and used_at is null and expires_at <= now()
    `
  );
}

export async function resolveUserFromExternalWallet(address: string): Promise<User | null> {
  const normalized = normalizeBchAddress(address);
  const { rows } = await dbQuery(
    `
      select u.*
      from auth_wallets w
      join auth_users u on u.id = w.user_id
      where w.chain = 'BCH' and w.address_storage_key = $1 and w.user_id is not null
      limit 1
    `,
    [normalized.storageKey]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function bindExternalWalletLogin(input: {
  address: string;
  walletType: WalletType;
  signMode: WalletSignMode;
}): Promise<AuthResult> {
  if (input.signMode === 'metamask_snap') {
    const existingIdentity = await findIdentity('metamask_snap', input.address);
    if (existingIdentity) return withWallets(existingIdentity.userId);

    const user = await dbTx(async (client) => {
      const created = await createUserTx(client);
      await client.query(
        `
          insert into auth_identities (user_id, type, identifier, identifier_normalized, verified_at, metadata)
          values ($1, 'metamask_snap', $2, $3, now(), $4::jsonb)
        `,
        [created.id, input.address.trim(), identityKey('metamask_snap', input.address), JSON.stringify({ signMode: input.signMode, experimental: true })]
      );
      return created;
    });
    return withWallets(user.id);
  }

  const existingOwner = await resolveUserFromExternalWallet(input.address);
  if (existingOwner) return withWallets(existingOwner.id);

  let user: User;
  try {
    user = await dbTx(async (client) => {
      const created = await createUserTx(client);
      await client.query(
        `
          insert into auth_identities (user_id, type, identifier, identifier_normalized, verified_at, metadata)
          values ($1, 'external_bch_wallet', $2, $3, now(), $4::jsonb)
        `,
        [created.id, input.address.trim(), identityKey('external_bch_wallet', input.address), JSON.stringify({ signMode: input.signMode })]
      );
      return created;
    });
  } catch (err: any) {
    if (isUniqueConstraintError(err)) {
      const owner = await resolveUserFromExternalWallet(input.address);
      if (owner) return withWallets(owner.id);

      const existingIdentity = await findIdentity('external_bch_wallet', input.address);
      if (existingIdentity) return withWallets(existingIdentity.userId);
    }
    throw err;
  }

  try {
    await upsertWallet({
      userId: user.id,
      address: input.address,
      type: input.walletType,
      verified: true,
      makePrimary: true,
      provider: 'external_bch',
      signMode: input.signMode,
      metadata: { signMode: input.signMode }
    });
  } catch (err: any) {
    if (err?.code === 'wallet_already_bound') {
      const owner = await resolveUserFromExternalWallet(input.address);
      if (owner) return withWallets(owner.id);
    }
    throw err;
  }
  return withWallets(user.id);
}

export async function linkWalletToExistingUser(input: {
  userId: string;
  address: string;
  walletType: WalletType;
  signMode: WalletSignMode;
}): Promise<AuthResult> {
  if (input.signMode === 'metamask_snap') {
    const existingIdentity = await findIdentity('metamask_snap', input.address);
    if (existingIdentity && existingIdentity.userId !== input.userId) throw authError('wallet_already_bound');
    await createIdentity({
      userId: input.userId,
      type: 'metamask_snap',
      identifier: input.address,
      verified: true,
      metadata: { signMode: input.signMode, experimental: true }
    });
    return withWallets(input.userId);
  }

  const existing = await resolveUserFromExternalWallet(input.address);
  if (existing && existing.id !== input.userId) throw authError('wallet_already_bound');
  await upsertWallet({
    userId: input.userId,
    address: input.address,
    type: input.walletType,
    verified: true,
    makePrimary: false,
    provider: 'external_bch',
    signMode: input.signMode,
    metadata: { signMode: input.signMode }
  });
  await createIdentity({
    userId: input.userId,
    type: 'external_bch_wallet',
    identifier: input.address,
    verified: true,
    metadata: { signMode: input.signMode }
  });
  return withWallets(input.userId);
}

export async function withWallets(userId: string): Promise<AuthResult> {
  const user = await getUser(userId);
  if (!user) throw authError('auth_required');
  const wallets = await getWalletsForUser(userId);
  const primary = wallets.find((w) => w.isPrimary) || wallets[0] || null;
  return { user, wallets, primaryWallet: primary };
}

export async function getUserBySessionPayload(payload: SessionPayload): Promise<AuthResult> {
  return withWallets(payload.userId);
}
