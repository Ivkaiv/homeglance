/**
 * Прокси обложек Music Assistant.
 *
 * MA отдаёт `current_media.image_url` как `http://<ma-host>/imageproxy?...`,
 * а Glance под HA Ingress работает по https — браузер блокирует http-картинку
 * как mixed-content. Плюс прямые CDN-ссылки источников кросс-доменные (ломают
 * извлечение акцентного цвета из обложки). Этот роут тянет картинку server-side
 * и отдаёт её same-origin.
 *
 * SSRF-защита: разрешён только хост самого Music Assistant и известные
 * CDN обложек.
 */

const ALLOWED_HOSTS = ['cdn-image.zvuk.com', 'avatars.yandex.net'];

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const target = new URL(req.url).searchParams.get('url');
  if (!target) return new Response('missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('bad url', { status: 400 });
  }

  let maHost = '';
  try {
    maHost = new URL(process.env.MA_URL || 'http://192.168.1.31:8095').host;
  } catch {
    /* MA_URL не задан / кривой — maHost останется пустым */
  }
  if (parsed.host !== maHost && !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response('forbidden host', { status: 403 });
  }

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(10000) });
    if (!upstream.ok || !upstream.body) {
      return new Response('upstream error', { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 502 });
  }
}
