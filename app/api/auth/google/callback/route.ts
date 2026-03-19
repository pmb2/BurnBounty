import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCodeForProfile, parseGoogleState } from '@/lib/auth/google-oauth';
import { issueSessionForUser, sessionCookieName } from '@/lib/auth/session';
import { loginWithGoogleOAuth } from '@/lib/auth/service';
import { recordAuthAuditEventSafe } from '@/lib/auth/audit';

const stateCookieName = 'bb_google_state';

function redirectToAuthError(req: NextRequest, reason: string) {
  const url = req.nextUrl.clone();
  url.pathname = '/auth';
  url.searchParams.set('oauth', 'failed');
  url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const incomingState = req.nextUrl.searchParams.get('state');
  const cookieState = req.cookies.get(stateCookieName)?.value || null;

  if (!code || !incomingState || !cookieState || incomingState !== cookieState) {
    return redirectToAuthError(req, 'state_mismatch');
  }

  try {
    const state = parseGoogleState(cookieState);
    const profile = await exchangeGoogleCodeForProfile(code);
    const result = await loginWithGoogleOAuth({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    });

    const { token } = await issueSessionForUser({
      userId: result.user.id,
      primaryAddress: result.primaryWallet?.address || null,
      authMethod: 'google_oauth'
    });

    const nextPath = state.nextPath?.startsWith('/') ? state.nextPath : '/dashboard';
    const redirectUrl = new URL(nextPath, req.nextUrl.origin);
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    res.cookies.set(stateCookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0
    });

    await recordAuthAuditEventSafe({
      eventType: 'login_succeeded',
      outcome: 'success',
      userId: result.user.id,
      addressNormalized: result.primaryWallet?.address || null,
      metadata: { method: 'google_oauth' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return res;
  } catch (err: any) {
    await recordAuthAuditEventSafe({
      eventType: 'login_failed',
      outcome: 'failure',
      metadata: { stage: 'google_oauth_callback', error: err?.code || err?.message || 'unknown' },
      ipAddress: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    });
    return redirectToAuthError(req, err?.code || 'oauth_failure');
  }
}
