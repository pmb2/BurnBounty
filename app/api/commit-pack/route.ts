// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { commitPackOnChipnet } from '@/lib/cashscript';

const bodySchema = z.object({
  wif: z.string().min(1, 'Chipnet WIF required'),
  commitmentHash: z.string().length(64),
  series: z.enum(['GENESIS_BETA', 'FOUNDER_EDITION', 'NORMAL']).default('NORMAL')
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await commitPackOnChipnet({ userWif: body.wif, commitmentHash: body.commitmentHash, series: body.series });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Commit pack failed' }, { status: 400 });
  }
}
