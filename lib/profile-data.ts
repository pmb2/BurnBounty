import type { CardAsset } from '@/types/cards';
import { getSupabaseAdmin } from '@/lib/supabase';
import { dbQuery, dbTx } from '@/lib/db/postgres';

export type MarketCardSnapshot = {
  nftId: string;
  name: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  image: string;
  faceValueSats: number;
  weeklyDriftMilli: number;
  randomCapWeeks: number;
  payoutSats?: number;
};

export type MarketListing = {
  id: string;
  seller_address: string;
  buyer_address?: string | null;
  card_id: string;
  price_sats: number;
  token_category?: string | null;
  token_commitment?: string | null;
  escrow_address?: string | null;
  escrow_vout?: number | null;
  sale_txid?: string | null;
  buy_txid?: string | null;
  note?: string | null;
  expires_at?: string | null;
  created_at?: string;
  sold_at?: string | null;
  status?: 'active' | 'sold' | string;
  card_snapshot?: MarketCardSnapshot | null;
};

const fallbackProfiles = [
  { address: 'bitcoincash:qzsamplehunter1', display_name: 'Dust Ranger', bio: 'Bronze grinder on the frontier.', score: 42 },
  { address: 'bitcoincash:qzsamplehunter2', display_name: 'Silver Marshal', bio: 'Value hunter, long hold strategy.', score: 84 },
  { address: 'bitcoincash:qzsamplehunter3', display_name: 'Diamond Outlaw', bio: 'Chases high-cap cards.', score: 133 }
];

const fallbackCards: CardAsset[] = [];

export async function listProfiles() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackProfiles;
  const { data } = await supabase.from('profiles').select('address,display_name,bio,score').limit(24);
  return data || fallbackProfiles;
}

export async function getProfile(address: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const profile = fallbackProfiles.find((p) => p.address === address) || { address, display_name: 'Unknown Hunter', bio: 'No profile yet.', score: 0 };
    return { profile, cards: fallbackCards };
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('address', address).maybeSingle();
  const { data: cards } = await supabase.from('collections').select('cards').eq('address', address).maybeSingle();
  return {
    profile: profile || { address, display_name: 'Unknown Hunter', bio: 'No profile yet.', score: 0 },
    cards: cards?.cards || []
  };
}

export async function listTradingListings(includeSold = false): Promise<MarketListing[]> {
  try {
    const { rows } = await dbQuery(
      `select id::text, seller_address, buyer_address, card_id, price_sats::text as price_sats,
              token_category, token_commitment, escrow_address, escrow_vout,
              sale_txid, buy_txid, note, expires_at, created_at, sold_at, status, card_snapshot
       from market_listings
       where ($1::boolean = true or status = 'active')
       order by created_at desc
       limit 50`,
      [includeSold]
    );
    return rows.map((row: any) => ({
      ...row,
      price_sats: Number(row.price_sats)
    }));
  } catch {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];
    const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
  }
}

export async function getTradingListingById(listingId: string): Promise<MarketListing | null> {
  const { rows } = await dbQuery(
    `select id::text, seller_address, buyer_address, card_id, price_sats::text as price_sats,
            token_category, token_commitment, escrow_address, escrow_vout,
            sale_txid, buy_txid, note, expires_at, created_at, sold_at, status, card_snapshot
     from market_listings
     where id = $1
     limit 1`,
    [listingId]
  );
  if (!rows[0]) return null;
  const row: any = rows[0];
  return { ...row, price_sats: Number(row.price_sats) };
}

export async function createTradingListing(input: {
  seller_address: string;
  card_id: string;
  price_sats: number;
  token_category?: string;
  token_commitment?: string;
  escrow_address?: string;
  escrow_vout?: number;
  sale_txid?: string;
  card_snapshot?: MarketCardSnapshot;
  note?: string;
  expires_at?: string;
}): Promise<MarketListing> {
  try {
    const { rows } = await dbQuery(
      `insert into market_listings (
          seller_address, card_id, price_sats, token_category, token_commitment, escrow_address, escrow_vout,
          sale_txid, card_snapshot, note, expires_at, status
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, 'active')
       returning id::text, seller_address, buyer_address, card_id, price_sats::text as price_sats,
                 token_category, token_commitment, escrow_address, escrow_vout,
                 sale_txid, buy_txid, card_snapshot, note, expires_at, created_at, sold_at, status`,
      [
        input.seller_address,
        input.card_id,
        input.price_sats,
        input.token_category || null,
        input.token_commitment || null,
        input.escrow_address || null,
        Number.isFinite(input.escrow_vout as number) ? input.escrow_vout : null,
        input.sale_txid || null,
        JSON.stringify(input.card_snapshot || null),
        input.note || null,
        input.expires_at || null
      ]
    );
    const row: any = rows[0];
    return { ...row, price_sats: Number(row.price_sats) };
  } catch {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { id: `mock-${Date.now()}`, ...input };
    const { data, error } = await supabase.from('listings').insert(input).select('*').single();
    if (error) throw error;
    return data;
  }
}

export async function buyTradingListing(input: {
  listingId: string;
  buyerAddress: string;
  buyTxid?: string;
}): Promise<MarketListing> {
  return dbTx(async (client) => {
    const { rows } = await client.query(
      `select id::text, seller_address, buyer_address, card_id, price_sats::text as price_sats,
              token_category, token_commitment, escrow_address, escrow_vout,
              sale_txid, buy_txid, card_snapshot, note, expires_at, created_at, sold_at, status
       from market_listings
       where id = $1
       limit 1
       for update`,
      [input.listingId]
    );

    if (!rows[0]) {
      const err = new Error('listing_not_found');
      (err as any).code = 'listing_not_found';
      throw err;
    }

    const listing = rows[0] as any;
    if (listing.status !== 'active') {
      const err = new Error('listing_unavailable');
      (err as any).code = 'listing_unavailable';
      throw err;
    }

    if (String(listing.seller_address) === input.buyerAddress) {
      const err = new Error('cannot_buy_own_listing');
      (err as any).code = 'cannot_buy_own_listing';
      throw err;
    }

    const { rows: updatedRows } = await client.query(
      `update market_listings
       set status = 'sold',
           buyer_address = $2,
           buy_txid = $3,
           sold_at = now(),
           updated_at = now()
       where id = $1 and status = 'active'
       returning id::text, seller_address, buyer_address, card_id, price_sats::text as price_sats,
                 token_category, token_commitment, escrow_address, escrow_vout,
                 sale_txid, buy_txid, card_snapshot, note, expires_at, created_at, sold_at, status`,
      [input.listingId, input.buyerAddress, input.buyTxid || null]
    );

    if (!updatedRows[0]) {
      const err = new Error('listing_unavailable');
      (err as any).code = 'listing_unavailable';
      throw err;
    }

    const updated = updatedRows[0] as any;
    return { ...updated, price_sats: Number(updated.price_sats) };
  });
}
