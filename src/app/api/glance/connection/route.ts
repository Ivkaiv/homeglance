import { NextResponse } from 'next/server';
import { readJson, writeJson, deleteFile } from '@/lib/server-storage/disk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = 'connection.json';

interface Connection {
  url: string;
  token: string;
}

export async function GET() {
  const conn = await readJson<Connection | null>(FILE, null);
  if (!conn) return NextResponse.json({ configured: false });
  // Возвращаем url; token маскируем (для UI достаточно знать что задан)
  return NextResponse.json({
    configured: true,
    url: conn.url,
    token: conn.token, // нужен клиенту для WS-коннекта
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.url || !body?.token) {
    return NextResponse.json({ error: 'url + token required' }, { status: 400 });
  }
  await writeJson<Connection>(FILE, { url: body.url, token: body.token });
  return NextResponse.json({ configured: true });
}

export async function DELETE() {
  await deleteFile(FILE);
  return NextResponse.json({ configured: false });
}
