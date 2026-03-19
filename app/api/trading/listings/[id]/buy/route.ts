import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buyTradingListing, getTradingListingById } from '@/lib/profile-data';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { addressesEqual, normalizeBchAddress } from '@/lib/auth/bch-address';
import { authError } from '@/lib/auth/errors';
import { getWalletsForUser } from '@/lib/auth/store';
import { commitMarketIntentOnChipnet, escrowBuyCardOnChipnet } from '@/lib/cashscript';
import { resolveSessionSigner } from '@/lib/auth/signer';

const bodySchema = z
  .object({
    wallet_wif: z.string().min(1).optional(),
    buyer_address: z.string().min(6).optional()
  })
  .optional()
  .default({});

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

    const signer = await resolveSessionSigner({
      session,
      providedWif: parsed.data.wallet_wif,
      preferredAddress: buyerCanonical
    });

    const listingBefore = await getTradingListingById(params.id);
    if (!listingBefore) {
      return NextResponse.json({ ok: false, error: 'listing_not_found' }, { status: 404 });
    }
    if (listingBefore.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'listing_unavailable' }, { status: 409 });
    }
    if (addressesEqual(listingBefore.seller_address, buyerCanonical)) {
      return NextResponse.json({ ok: false, error: 'cannot_buy_own_listing' }, { status: 409 });
    }

    let settlementTxid = '';
    let committedBuyerAddress = buyerCanonical;
    let chainCommitted = false;

    if (
      listingBefore.token_category &&
      listingBefore.token_commitment &&
      listingBefore.sale_txid &&
      listingBefore.escrow_vout !== null &&
      listingBefore.escrow_vout !== undefined
    ) {
      try {
        const settlement = await escrowBuyCardOnChipnet({
          buyerWif: signer.wif,
          buyerAddress: buyerCanonical,
          sellerAddress: listingBefore.seller_address,
          priceSats: Number(listingBefore.price_sats),
          tokenCategory: listingBefore.token_category,
          tokenCommitment: listingBefore.token_commitment,
          escrowTxid: listingBefore.sale_txid,
          escrowVout: Number(listingBefore.escrow_vout)
        });
        settlementTxid = settlement.txid;
        committedBuyerAddress = settlement.buyerAddress;
        chainCommitted = true;
      } catch (escrowErr: any) {
        const commit = await commitMarketIntentOnChipnet({
          walletWif: signer.wif,
          action: 'buy',
          payload: `${params.id}:${buyerCanonical}:${Date.now()}`
        });
        settlementTxid = commit.txid;
        committedBuyerAddress = commit.walletAddress;
        chainCommitted = Boolean(commit.chainCommitted);
      }
    } else {
      const commit = await commitMarketIntentOnChipnet({
        walletWif: signer.wif,
        action: 'buy',
        payload: `${params.id}:${buyerCanonical}:${Date.now()}`
      });
      settlementTxid = commit.txid;
      committedBuyerAddress = commit.walletAddress;
      chainCommitted = Boolean(commit.chainCommitted);
    }

    const committedCanonical = normalizeBchAddress(committedBuyerAddress).canonicalCashAddr;
    if (!addressesEqual(committedCanonical, buyerCanonical)) {
      throw authError('address_mismatch', 'Signer wallet does not match buyer address');
    }

    const listing = await buyTradingListing({
      listingId: params.id,
      buyerAddress: buyerCanonical,
      buyTxid: settlementTxid
    });
    return NextResponse.json({
      ok: true,
      listing,
      chainTxid: settlementTxid,
      chainCommitted
    });
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
