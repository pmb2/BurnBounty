import { NextResponse } from 'next/server';
import { listProfiles } from '@/lib/profile-data';

export async function GET() {
  const profiles = await listProfiles();
  return NextResponse.json({ profiles });
}
