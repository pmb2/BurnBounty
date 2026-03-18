import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createWalletChallenge } from '@/lib/auth/service';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import type { WalletProviderKind, WalletSignMode } from '@/types/auth';

const schema = z.object({
  address: z.string().min(6),
  walletType: z.enum(['paytaca', 'electrum', 'metamask'])
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-challenge-legacy', 30, 60_000);
    const body = schema.parse(await req.json());
    const walletProvider: WalletProviderKind = body.walletType === 'metamask' ? 'metamask_snap' : 'external_bch';
    const walletSignMode: WalletSignMode = body.walletType === 'metamask' ? 'metamask_snap' : body.walletType;
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const challenge = await createWalletChallenge({
      actionLabel: 'Login',
      purpose: 'login',
      walletProvider,
      walletSignMode,
      domain: host,
      address: body.address
    });
    const res = NextResponse.json({
      nonce: challenge.nonce,
      message: challenge.challenge,
      address: body.address,
      walletType: body.walletType,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      compatibilityMode: true,
      deprecated: true,
      deprecationNote: 'Use /api/auth/wallet/challenge instead.',
      sunsetDate: '2026-06-30'
    });
    res.headers.set('Deprecation', 'true');
    res.headers.set('Sunset', '2026-06-30');
    return res;
  } catch (err: any) {
    return jsonAuthError(err, 'Challenge failed');
  }
}
