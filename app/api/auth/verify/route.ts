import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { issueSessionForUser, sessionCookieName } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { verifyWalletChallenge } from '@/lib/auth/service';
import { authError } from '@/lib/auth/errors';

const schema = z.object({
  address: z.string().min(6),
  walletType: z.enum(['paytaca', 'electrum', 'metamask']),
  signature: z.string().min(8),
  message: z.string().min(16),
  challengeId: z.string().uuid().optional()
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-verify-legacy', 25, 60_000);
    const body = schema.parse(await req.json());
    if (!body.challengeId) throw authError('challenge_not_found', 'challengeId is required');
    const result = await verifyWalletChallenge({
      challengeId: body.challengeId,
      address: body.address,
      signature: body.signature,
      expectedPurpose: 'login'
    });
    const { token } = await issueSessionForUser({
      userId: result.user.id,
      primaryAddress: result.primaryWallet?.address || null,
      authMethod: result.primaryWallet?.type === 'snap' ? 'metamask_snap' : 'external_bch_wallet'
    });
    const res = NextResponse.json({
      ok: true,
      address: body.address,
      walletType: body.walletType,
      compatibilityMode: true,
      deprecated: true,
      deprecationNote: 'Use /api/auth/wallet/verify instead.',
      sunsetDate: '2026-06-30',
      user: result.user,
      wallets: result.wallets
    });
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    res.headers.set('Deprecation', 'true');
    res.headers.set('Sunset', '2026-06-30');
    return res;
  } catch (err: any) {
    return jsonAuthError(err, 'Verify failed');
  }
}
