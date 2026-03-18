// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revealPackOnChipnet } from '@/lib/cashscript';

const pendingSchema = z.object({
  commitTxid: z.string(),
  commitHeight: z.number().int(),
  commitmentHash: z.string().length(64),
  userAddress: z.string(),
  series: z.enum(['GENESIS_BETA', 'FOUNDER_EDITION', 'NORMAL']),
  packPriceSats: z.number().int().positive(),
  blockHashN: z.string().length(64),
  blockHashN1: z.string().length(64),
  blockHashN2: z.string().length(64)
});

const bodySchema = z.object({
  wif: z.string().min(1),
  userSeed: z.string().min(8),
  nonce: z.string().min(4),
  pending: pendingSchema
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await revealPackOnChipnet({
      userWif: body.wif,
      userSeed: body.userSeed,
      nonce: body.nonce,
      pending: body.pending
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Reveal pack failed' }, { status: 400 });
  }
}
