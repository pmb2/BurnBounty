import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buyTradingListing } from '@/lib/profile-data';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { addressesEqual, normalizeBchAddress } from '@/lib/auth/bch-address';
import { authError } from '@/lib/auth/errors';
import { getWalletsForUser } from '@/lib/auth/store';

const bodySchema = z
  .object({
    buyer_address: z.string().min(6).optional()
  })
  .optional();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'trading-listing-buy', 25, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');

    const params = await context.params;
    if (!params?.id) {
      return NextResponse.json({ ok: false, error: 'listing_not_found' }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wallets = await getWalletsForUser(session.userId);
    if (!wallets.length) throw authError('wallet_not_bound', 'No linked wallet found for this account');
    const defaultWallet = wallets.find((w) => w.isPrimary) || wallets[0];
    if (!defaultWallet?.address) throw authError('wallet_not_bound', 'Primary wallet is missing');

    let buyerCanonical = defaultWallet.address;
    if (parsed.data?.buyer_address) {
      buyerCanonical = normalizeBchAddress(parsed.data.buyer_address).canonicalCashAddr;
      const owns = wallets.some((wallet) => addressesEqual(wallet.address, buyerCanonical));
      if (!owns) throw authError('wallet_not_bound', 'Buyer address is not linked to this account');
    }

    const listing = await buyTradingListing({
      listingId: params.id,
      buyerAddress: buyerCanonical
    });
    return NextResponse.json({ ok: true, listing });
  } catch (err: any) {
    const code = err?.code || err?.message;
    if (code === 'listing_not_found') {
      return NextResponse.json({ ok: false, error: 'listing_not_found' }, { status: 404 });
    }
    if (code === 'listing_unavailable' || code === 'cannot_buy_own_listing') {
      return NextResponse.json({ ok: false, error: code }, { status: 409 });
    }
    return jsonAuthError(err, 'Listing buy failed');
  }
}

