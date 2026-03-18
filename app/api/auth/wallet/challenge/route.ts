import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { createWalletChallenge } from '@/lib/auth/service';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { authError } from '@/lib/auth/errors';
import type { WalletProviderKind, WalletSignMode } from '@/types/auth';

const schema = z.object({
  actionLabel: z.string().min(3).max(40).default('Login'),
  purpose: z.enum(['login', 'register', 'link_wallet', 'verify_wallet', 'sensitive_action']),
  walletProvider: z.enum(['embedded', 'external_bch', 'metamask_snap']),
  walletSignMode: z.enum(['paytaca', 'electrum', 'manual', 'metamask_snap']),
  address: z.string().min(3).max(200).optional()
});

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-wallet-challenge', 30, 60_000);
    const body = schema.parse(await req.json());
    if (body.walletProvider === 'metamask_snap' && body.walletSignMode !== 'metamask_snap') throw authError('provider_mode_mismatch');
    if (body.walletProvider === 'embedded' && body.walletSignMode !== 'manual') throw authError('provider_mode_mismatch');
    if (body.walletProvider === 'external_bch' && body.walletSignMode === 'metamask_snap') throw authError('provider_mode_mismatch');
    const sessionToken = req.cookies.get(sessionCookieName)?.value || null;
    const session = sessionToken ? await validateSessionToken(sessionToken) : null;
    if (body.purpose === 'link_wallet' && !session?.userId) throw authError('auth_required');

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const challenge = await createWalletChallenge({
      actionLabel: body.actionLabel,
      purpose: body.purpose,
      walletProvider: body.walletProvider as WalletProviderKind,
      walletSignMode: body.walletSignMode as WalletSignMode,
      domain: host,
      address: body.address,
      userId: session?.userId
    });
    return NextResponse.json({
      ok: true,
      challengeId: challenge.id,
      challenge: challenge.challenge,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
      purpose: challenge.purpose
    });
  } catch (err: any) {
    return jsonAuthError(err, 'Challenge failed');
  }
}
