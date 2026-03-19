import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTradingListing, listTradingListings } from '@/lib/profile-data';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { normalizeBchAddress, addressesEqual } from '@/lib/auth/bch-address';
import { getWalletsForUser } from '@/lib/auth/store';
import { authError } from '@/lib/auth/errors';
import { commitMarketIntentOnChipnet } from '@/lib/cashscript';

const listingSchema = z.object({
  seller_address: z.string().min(6).optional(),
  wallet_wif: z.string().min(1),
  card_id: z.string().min(6),
  price_sats: z.number().int().positive(),
  card_snapshot: z
    .object({
      nftId: z.string(),
      name: z.string(),
      tier: z.enum(['Bronze', 'Silver', 'Gold', 'Diamond']),
      image: z.string(),
      faceValueSats: z.number().int().positive(),
      weeklyDriftMilli: z.number().int(),
      randomCapWeeks: z.number().int().nonnegative(),
      payoutSats: z.number().int().positive().optional()
    })
    .optional(),
  note: z.string().optional(),
  expires_at: z.string().optional()
});

export async function GET(req: NextRequest) {
  const includeSold = req.nextUrl.searchParams.get('includeSold') === '1';
  const listings = await listTradingListings(includeSold);
  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'trading-listing-create', 20, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');

    const parsed = listingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const wallets = await getWalletsForUser(session.userId);
    if (wallets.length === 0) {
      throw authError('wallet_not_bound', 'No linked wallet found for this account');
    }

    const defaultWallet = wallets.find((w) => w.isPrimary) || wallets[0];
    if (!defaultWallet?.address) {
      throw authError('wallet_not_bound', 'Primary wallet is missing');
    }

    let sellerCanonical = defaultWallet.address;
    if (body.seller_address) {
      sellerCanonical = normalizeBchAddress(body.seller_address).canonicalCashAddr;
      const ownsSellerAddress = wallets.some((w) => addressesEqual(w.address, sellerCanonical));
      if (!ownsSellerAddress) {
        throw authError('wallet_not_bound', 'Seller address is not linked to this account');
      }
    }

    const walletCommit = await commitMarketIntentOnChipnet({
      walletWif: body.wallet_wif,
      action: 'list',
      payload: `${sellerCanonical}:${body.card_id}:${body.price_sats}:${Date.now()}`
    });
    const committedCanonical = normalizeBchAddress(walletCommit.walletAddress).canonicalCashAddr;
    if (!addressesEqual(committedCanonical, sellerCanonical)) {
      throw authError('address_mismatch', 'Wallet signature does not match seller address');
    }

    const cardSnapshot = body.card_snapshot
      ? {
          nftId: body.card_snapshot.nftId,
          name: body.card_snapshot.name,
          tier: body.card_snapshot.tier,
          image: body.card_snapshot.image,
          faceValueSats: body.card_snapshot.faceValueSats,
          weeklyDriftMilli: body.card_snapshot.weeklyDriftMilli,
          randomCapWeeks: body.card_snapshot.randomCapWeeks,
          payoutSats: body.card_snapshot.payoutSats
        }
      : undefined;

    const created = await createTradingListing({
      seller_address: sellerCanonical,
      card_id: body.card_id,
      price_sats: body.price_sats,
      sale_txid: walletCommit.txid,
      card_snapshot: cardSnapshot,
      note: body.note,
      expires_at: body.expires_at
    });
    return NextResponse.json({
      listing: created,
      chainTxid: walletCommit.txid,
      chainCommitted: Boolean(walletCommit.chainCommitted)
    });
  } catch (err: any) {
    return jsonAuthError(err, 'Listing create failed');
  }
}
