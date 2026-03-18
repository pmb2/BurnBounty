import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { issueSessionForUser, sessionCookieName } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError, rateLimitOrThrow } from '@/lib/auth/http';
import { loginEmbeddedUser } from '@/lib/auth/service';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const schema = z.object({
  username: z.string().min(3).max(40),
  passphrase: z.string().min(8).max(200)
});
type LoginBody = z.infer<typeof schema>;

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    await rateLimitOrThrow(req, 'auth-login', 20, 60_000);
    const body = schema.parse(await req.json()) as LoginBody;
    await rateLimitOrThrow(req, 'auth-login-user', 8, 15 * 60_000, `auth-login-user:${body.username.trim().toLowerCase()}`);
    const result = await loginEmbeddedUser({
      username: body.username as string,
      passphrase: body.passphrase as string
    });
    const { token } = await issueSessionForUser({
      userId: result.user.id,
      primaryAddress: result.primaryWallet?.address || null,
      authMethod: 'embedded_wallet'
    });
    const res = NextResponse.json({ ok: true, user: result.user, wallets: result.wallets });
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
      metadata: { method: 'embedded_login' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return res;
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'login_failed',
      outcome: 'failure',
      metadata: { stage: 'login', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return jsonAuthError(err, 'Login failed');
  }
}
