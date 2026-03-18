import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTradingListing, listTradingListings } from '@/lib/profile-data';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { normalizeBchAddress, addressesEqual } from '@/lib/auth/bch-address';
import { getWalletsForUser } from '@/lib/auth/store';
import { authError } from '@/lib/auth/errors';

const listingSchema = z.object({
  seller_address: z.string().min(6),
  card_id: z.string().min(6),
  price_sats: z.number().int().positive(),
  note: z.string().optional(),
  expires_at: z.string().optional()
});

export async function GET() {
  const listings = await listTradingListings();
  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'trading-listing-create', 20, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');

    const body = listingSchema.parse(await req.json());
    const sellerCanonical = normalizeBchAddress(body.seller_address).canonicalCashAddr;
    const wallets = await getWalletsForUser(session.userId);
    const ownsSellerAddress = wallets.some((w) => addressesEqual(w.address, sellerCanonical));
    if (!ownsSellerAddress) {
      throw authError('wallet_not_bound', 'Seller address is not linked to this account');
    }
    const created = await createTradingListing({
      seller_address: sellerCanonical,
      card_id: body.card_id,
      price_sats: body.price_sats,
      note: body.note,
      expires_at: body.expires_at
    });
    return NextResponse.json({ listing: created });
  } catch (err: any) {
    return jsonAuthError(err, 'Listing create failed');
  }
}
