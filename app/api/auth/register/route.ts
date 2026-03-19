import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { issueSessionForUser, sessionCookieName } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { registerEmbedded } from '@/lib/auth/service';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  username: z.string().min(3).max(40),
  passphrase: z.string().min(8).max(200),
  displayName: z.string().min(2).max(80).optional()
});
type RegisterBody = z.infer<typeof schema>;

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-register', 15, 60_000);
    const body = schema.parse(await req.json()) as RegisterBody;
    await rateLimitOrThrow(req, 'auth-register-user', 5, 60 * 60_000, `auth-register-user:${body.username.trim().toLowerCase()}`);
    const result = await registerEmbedded({
      username: body.username as string,
      passphrase: body.passphrase as string,
      displayName: body.displayName as string | undefined
    });
    const { token } = await issueSessionForUser({
      userId: result.user.id,
      primaryAddress: result.primaryWallet?.address || null,
      authMethod: 'embedded_wallet'
    });
    const res = NextResponse.json({
      ok: true,
      user: result.user,
      wallets: result.wallets,
      primaryWallet: result.primaryWallet,
      embeddedProvisioned: true
    });
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    await recordAuthAuditEventSafe({
      eventType: 'login_succeeded',
      outcome: 'success',
      userId: result.user.id,
      metadata: { method: 'embedded_register' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return res;
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'login_failed',
      outcome: 'failure',
      metadata: { stage: 'register', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Registration failed');
  }
}
