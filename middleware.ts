import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';

const SESSION_COOKIE_NAME = 'bb_session';

const protectedRoutes = ['/dashboard', '/collection', '/trading', '/armory', '/settings'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requiresAuth = protectedRoutes.some((p) => pathname.startsWith(p));
  if (!requiresAuth) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionTokenEdge(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/collection/:path*', '/trading/:path*', '/armory/:path*', '/settings/:path*']
};
