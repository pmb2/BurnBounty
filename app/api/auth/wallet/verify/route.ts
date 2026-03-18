import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { issueSessionForUser, markRecentSessionAuth, sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { verifyWalletChallenge } from '@/lib/auth/service';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  challengeId: z.string().uuid(),
  address: z.string().min(3).max(200),
  signature: z.string().min(16).max(4000),
  expectedPurpose: z.enum(['login', 'register', 'link_wallet', 'verify_wallet', 'sensitive_action']).optional()
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-verify', 25, 60_000);
    const body = schema.parse(await req.json());
    const sessionToken = req.cookies.get(sessionCookieName)?.value || null;
    const session = sessionToken ? await validateSessionToken(sessionToken) : null;
    const result = await verifyWalletChallenge({
      challengeId: body.challengeId,
      address: body.address,
      signature: body.signature,
      expectedPurpose: body.expectedPurpose,
      session
    });
    const issued = await issueSessionForUser({
      userId: result.user.id,
      primaryAddress: result.primaryWallet?.address || null,
      authMethod: result.primaryWallet?.type === 'snap' ? 'metamask_snap' : 'external_bch_wallet'
    });
    if ((body.expectedPurpose === 'sensitive_action' || body.expectedPurpose === 'verify_wallet') && issued.payload.sid) {
      await markRecentSessionAuth(issued.payload.sid);
    }
    const res = NextResponse.json({
      ok: true,
      user: result.user,
      wallets: result.wallets,
      primaryWallet: result.primaryWallet
    });
    res.cookies.set(sessionCookieName, issued.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    await recordAuthAuditEventSafe({
      eventType: 'challenge_verified',
      outcome: 'success',
      userId: result.user.id,
      addressNormalized: result.primaryWallet?.address || null,
      metadata: { expectedPurpose: body.expectedPurpose || null },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return res;
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'challenge_failed',
      outcome: 'failure',
      metadata: { error: err?.code || err?.message || 'unknown', stage: 'wallet_verify' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Wallet verification failed');
  }
}
