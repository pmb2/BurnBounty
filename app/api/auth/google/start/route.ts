import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl, createGoogleState } from '@/lib/auth/google-oauth';
import { jsonAuthError } from '@/lib/auth/http';

const stateCookieName = 'bb_google_state';

export async function GET(req: NextRequest) {
  try {
    const nextPath = req.nextUrl.searchParams.get('next') || '/dashboard';
    const state = createGoogleState(nextPath);
    const url = buildGoogleAuthUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set(stateCookieName, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10
    });
    return res;
  } catch (err: any) {
    return jsonAuthError(err, 'Google OAuth start failed');
  }
}
