import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieName, validateSessionToken } from '@/lib/auth/session';
import { jsonAuthError } from '@/lib/auth/http';
import { authError } from '@/lib/auth/errors';
import { listRecentSessions } from '@/lib/auth/store';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(sessionCookieName)?.value || null;
    const session = await validateSessionToken(token);
    if (!session?.userId) throw authError('auth_required');
    const sessions = await listRecentSessions(session.userId, 20);
    return NextResponse.json({ ok: true, sessions });
  } catch (err: any) {
    return jsonAuthError(err, 'Failed to load sessions');
  }
}
