// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bitcore from 'bitcore-lib-cash';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { getChallenge, clearChallenge, pruneChallenges } from '@/lib/auth/challenge-store';
import { createSessionToken, sessionCookieName } from '@/lib/auth/session';

const schema = z.object({
  address: z.string().min(6),
  walletType: z.enum(['paytaca', 'electrum', 'metamask']),
  signature: z.string().min(8),
  message: z.string().min(16)
});

function verifyBitcoreMessage(address: string, signature: string, message: string): boolean {
  try {
    const msg = new (bitcore as any).Message(message);
    return !!msg.verify(address, signature);
  } catch {
    return false;
  }
}

function verifyMetamaskPersonalSign(address: string, signature: string, message: string): boolean {
  try {
    const hexMessage = `0x${Buffer.from(message, 'utf8').toString('hex')}`;
    const recoveredAddress = recoverPersonalSignature({
      data: hexMessage,
      signature
    });
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    pruneChallenges();
    const body = schema.parse(await req.json());
    const challenge = getChallenge(body.address);
    if (!challenge) throw new Error('No challenge found for address');
    if (challenge.message !== body.message) throw new Error('Challenge mismatch');

    let verified = false;
    if (body.walletType === 'electrum' || body.walletType === 'paytaca') {
      verified = verifyBitcoreMessage(body.address, body.signature, body.message);
    } else {
      verified = verifyMetamaskPersonalSign(body.address, body.signature, body.message);
    }

    if (!verified) throw new Error('Signature verification failed');
    clearChallenge(body.address);

    const token = createSessionToken({ address: body.address, walletType: body.walletType });
    const res = NextResponse.json({ ok: true, address: body.address, walletType: body.walletType });
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verify failed' }, { status: 400 });
  }
}
