import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { linkEmbeddedWalletRecord } from '@/lib/auth/service';
import { authError } from '@/lib/auth/errors';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  address: z.string().min(3).max(200),
  walletCreatedAt: z.string().optional(),
  walletVersion: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-embedded-create', 20, 60_000);
    const session = await validateSessionToken(req.cookies.get(sessionCookieName)?.value || null);
    if (!session?.userId) throw authError('auth_required');
    const body = schema.parse(await req.json());
    const result = await linkEmbeddedWalletRecord({
      session,
      address: body.address,
      label: 'Embedded Wallet',
      metadata: {
        walletCreatedAt: body.walletCreatedAt,
        walletVersion: body.walletVersion || 'v1-client-encrypted'
      }
    });
    return NextResponse.json({ ok: true, user: result.user, wallets: result.wallets, primaryWallet: result.primaryWallet });
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'wallet_link_failed',
      outcome: 'failure',
      metadata: { stage: 'embedded_wallet_create', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Embedded wallet registration failed');
  }
}
