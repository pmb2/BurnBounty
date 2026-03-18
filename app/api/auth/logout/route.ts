import { NextRequest, NextResponse } from 'next/server';
import { revokeSessionToken, sessionCookieName } from '@/lib/auth/session';
import { enforceSameOriginOrThrow, jsonAuthError } from '@/lib/auth/http';

export async function POST(req: NextRequest) {
  try {
    enforceSameOriginOrThrow(req);
    const token = req.cookies.get(sessionCookieName)?.value || null;
    await revokeSessionToken(token, 'logout');
    const res = NextResponse.json({ ok: true, loggedOut: true });
    res.cookies.set(sessionCookieName, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res;
  } catch (err: any) {
    return jsonAuthError(err, 'Logout failed');
  }
}
