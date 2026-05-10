import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * REST proxy к HA через Supervisor.
 *
 * Под HA Ingress add-on имеет SUPERVISOR_TOKEN и доступ к
 * `http://supervisor/core/api/...`. Этот route проксирует запросы
 * с клиента на supervisor с подменой авторизации — клиенту не
 * нужно знать токен.
 *
 * Маршрут: `/api/glance/ha-rest/<path>` → `http://supervisor/core/api/<path>`.
 */

const SUPERVISOR_HOST = process.env.SUPERVISOR_HOST || 'supervisor';

async function proxy(req: NextRequest, params: { path?: string[] }) {
  const token = process.env.SUPERVISOR_TOKEN || process.env.HASSIO_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'no_supervisor_token' }, { status: 503 });
  }

  const path = (params.path ?? []).join('/');
  const search = req.nextUrl.searchParams.toString();
  const url = `http://${SUPERVISOR_HOST}/core/api/${path}${search ? '?' + search : ''}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const ct = req.headers.get('content-type');
  if (ct) headers['content-type'] = ct;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, init);
    const buf = await upstream.arrayBuffer();
    const respHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      // Не пробрасываем hop-by-hop и encoding — у нас уже распакованные байты
      if (['transfer-encoding', 'content-encoding', 'connection'].includes(k.toLowerCase())) return;
      respHeaders.set(k, v);
    });
    return new NextResponse(buf, { status: upstream.status, headers: respHeaders });
  } catch (e) {
    return NextResponse.json({ error: 'upstream_error', message: String(e) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params);
}
