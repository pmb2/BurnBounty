// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTradingListing, listTradingListings } from '@/lib/profile-data';

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
    const body = listingSchema.parse(await req.json());
    const created = await createTradingListing(body);
    return NextResponse.json({ listing: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Listing create failed' }, { status: 400 });
  }
}
