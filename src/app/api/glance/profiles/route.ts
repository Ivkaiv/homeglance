import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/server-storage/disk';
import type { Profile } from '@/lib/profiles/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = 'profiles.json';

export async function GET() {
  const profiles = await readJson<Profile[]>(FILE, []);
  return NextResponse.json({ profiles });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.profiles)) {
    return NextResponse.json({ error: 'profiles array required' }, { status: 400 });
  }
  await writeJson<Profile[]>(FILE, body.profiles);
  return NextResponse.json({ ok: true });
}
