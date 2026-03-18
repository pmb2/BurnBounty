import type { CardAsset } from '@/types/cards';
import { getSupabaseAdmin } from '@/lib/supabase';

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
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function createTradingListing(input: { seller_address: string; card_id: string; price_sats: number; note?: string; expires_at?: string }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { id: `mock-${Date.now()}`, ...input };
  const { data, error } = await supabase.from('listings').insert(input).select('*').single();
  if (error) throw error;
  return data;
}
