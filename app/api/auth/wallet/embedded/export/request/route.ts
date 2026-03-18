import { NextRequest, NextResponse } from 'next/server';
import { requireRecentSessionAuth, sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-embedded-export', 8, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');
    if (!session.sid) throw authError('session_invalid');

    await requireRecentSessionAuth(session.sid, 5 * 60);
    await recordAuthAuditEventSafe({
      eventType: 'embedded_wallet_export_requested',
      outcome: 'success',
      userId: session.userId,
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });

    return NextResponse.json({
      ok: true,
      exportAllowed: true,
      // Export still requires local passphrase decryption; this window only proves recent account re-auth.
      recentAuthWindowSeconds: 300
    });
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'sensitive_action_reauth_failed',
      outcome: 'failure',
      metadata: { stage: 'embedded_wallet_export_request', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Embedded wallet export requires recent re-authentication');
  }
}
