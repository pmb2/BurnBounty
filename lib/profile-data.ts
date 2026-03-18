import type { CardAsset } from '@/types/cards';
import { getSupabaseAdmin } from '@/lib/supabase';
import { dbQuery } from '@/lib/db/postgres';

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

export async function listTradingListings() {
  try {
    const { rows } = await dbQuery(
      `select id::text, seller_address, card_id, price_sats::text as price_sats, note, expires_at, created_at
       from market_listings
       order by created_at desc
       limit 50`
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

export async function createTradingListing(input: { seller_address: string; card_id: string; price_sats: number; note?: string; expires_at?: string }) {
  try {
    const { rows } = await dbQuery(
      `insert into market_listings (seller_address, card_id, price_sats, note, expires_at)
       values ($1, $2, $3, $4, $5)
       returning id::text, seller_address, card_id, price_sats::text as price_sats, note, expires_at, created_at`,
      [input.seller_address, input.card_id, input.price_sats, input.note || null, input.expires_at || null]
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
