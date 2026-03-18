import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile-data';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const payload = await getProfile(address);
  return NextResponse.json(payload);
}
