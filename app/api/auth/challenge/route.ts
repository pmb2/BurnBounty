// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { setChallenge, pruneChallenges } from '@/lib/auth/challenge-store';

const schema = z.object({
  address: z.string().min(6),
  walletType: z.enum(['paytaca', 'electrum', 'metamask'])
});

export async function POST(req: NextRequest) {
  try {
    pruneChallenges();
    const body = schema.parse(await req.json());
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = [
      'BurnBounty Login Challenge',
      `Address: ${body.address}`,
      `Wallet: ${body.walletType}`,
      `Nonce: ${nonce}`,
      `IssuedAt: ${new Date().toISOString()}`
    ].join('\n');

    setChallenge(body.address, body.walletType, message, nonce);
    return NextResponse.json({ nonce, message, address: body.address, walletType: body.walletType });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Challenge failed' }, { status: 400 });
  }
}
