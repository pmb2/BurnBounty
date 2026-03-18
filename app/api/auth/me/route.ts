import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { getMe } from '@/lib/auth/service';
import { jsonAuthError } from '@/lib/auth/http';
import { authError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(sessionCookieName)?.value || null;
    const session = await validateSessionToken(token);
    if (!session?.userId) throw authError('auth_required');
    const result = await getMe(session);
    return NextResponse.json({
      ok: true,
      user: result.user,
      wallets: result.wallets,
      primaryWallet: result.primaryWallet
    });
  } catch (err: any) {
    return jsonAuthError(err, 'Session not found');
  }
}
