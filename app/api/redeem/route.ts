// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redeemCardOnChipnet } from '@/lib/cashscript';
import { normalizeCardAsset } from '@/lib/cards';

const bodySchema = z.object({
  wif: z.string().min(1),
  card: z.object({
    nftId: z.string(),
    categoryId: z.string().optional(),
    commitmentHex: z.string().optional(),
    name: z.string().optional(),
    tier: z.enum(['Bronze', 'Silver', 'Gold', 'Diamond']).optional(),
    series: z.enum(['GENESIS_BETA', 'FOUNDER_EDITION', 'NORMAL']).optional(),
    faceValueSats: z.number().int().positive().optional(),
    originalFaceValueSats: z.number().int().positive().optional(),
    payoutSats: z.number().int().positive().optional(),
    payoutBch: z.number().optional(),
    weeklyDriftMilli: z.number().int().optional(),
    randomCapWeeks: z.number().int().nonnegative().optional(),
    mintBlockHeight: z.number().int().nonnegative().optional(),
    serial: z.string().optional(),
    image: z.string().optional(),
    bcmrUri: z.string().optional()
  }).passthrough()
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const normalizedCard = normalizeCardAsset(body.card);
    const result = await redeemCardOnChipnet(body.wif, normalizedCard);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Redeem failed' }, { status: 400 });
  }
}
