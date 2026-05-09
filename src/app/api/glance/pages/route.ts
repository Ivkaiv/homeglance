import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/server-storage/disk';
import type { Page } from '@/lib/pages/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function file(profileId: string) {
  // Безопасность: фильтруем только safe-chars в id
  if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) throw new Error('Invalid profileId');
  return `pages-${profileId}.json`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  try {
    const pages = await readJson<Page[]>(file(profileId), []);
    return NextResponse.json({ pages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profileId = body?.profileId;
  if (!profileId || !Array.isArray(body?.pages)) {
    return NextResponse.json({ error: 'profileId + pages array required' }, { status: 400 });
  }
  try {
    await writeJson<Page[]>(file(profileId), body.pages);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
