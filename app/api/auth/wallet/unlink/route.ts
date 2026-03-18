import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRecentSessionAuth, sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { unlinkUserWallet } from '@/lib/auth/service';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  address: z.string().min(3).max(200)
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-unlink', 20, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');
    if (!session.sid) throw authError('session_invalid');
    await requireRecentSessionAuth(session.sid, 5 * 60);
    const body = schema.parse(await req.json());
    const result = await unlinkUserWallet({ session, address: body.address });
    return NextResponse.json({ ok: true, user: result.user, wallets: result.wallets, primaryWallet: result.primaryWallet });
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'wallet_unlink_failed',
      outcome: 'failure',
      metadata: { stage: 'wallet_unlink', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Wallet unlink failed');
  }
}
