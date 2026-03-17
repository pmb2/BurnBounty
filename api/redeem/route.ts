// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redeemCardOnChipnet } from '@/lib/cashscript';

const bodySchema = z.object({
  wif: z.string().min(1),
  card: z.object({
    nftId: z.string(),
    categoryId: z.string(),
    commitmentHex: z.string(),
    name: z.string(),
    tier: z.enum(['Bronze', 'Silver', 'Gold', 'Diamond']),
    faceValueSats: z.number().int().positive(),
    payoutSats: z.number().int().positive(),
    payoutBch: z.number(),
    serial: z.string(),
    image: z.string(),
    bcmrUri: z.string()
  })
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await redeemCardOnChipnet(body.wif, body.card);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Redeem failed' }, { status: 400 });
  }
}
