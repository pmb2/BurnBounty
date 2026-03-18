import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { linkEmbeddedWalletRecord } from '@/lib/auth/service';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  address: z.string().min(3).max(200),
  label: z.string().min(1).max(80).optional(),
  metadata: z.record(z.any()).optional()
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-link', 20, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');
    const body = schema.parse(await req.json());
    const result = await linkEmbeddedWalletRecord({
      session,
      address: body.address,
      label: body.label,
      metadata: body.metadata
    });
    return NextResponse.json({ ok: true, user: result.user, wallets: result.wallets, primaryWallet: result.primaryWallet });
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'wallet_link_failed',
      outcome: 'failure',
      metadata: { stage: 'wallet_link', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Wallet link failed');
  }
}
