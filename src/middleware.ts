import { NextResponse, type NextRequest } from 'next/server';

/**
 * Поддержка Home Assistant Ingress.
 *
 * HA Supervisor НЕ переписывает path при проксировании к add-on'у —
 * запрос приходит на `/api/hassio_ingress/<token>/...`, а не на `/...`.
 * Вместо этого HA добавляет header `X-Ingress-Path: /api/hassio_ingress/<token>`,
 * и add-on должен сам обрабатывать prefix.
 *
 * Этот middleware:
 *  1. Читает X-Ingress-Path из входящего запроса
 *  2. Если URL начинается с этого префикса — rewrite в URL без префикса
 *     (Next.js дальше обрабатывает запрос как обычно)
 *
 * @see https://developers.home-assistant.io/docs/add-ons/presentation#ingress
 */
export function middleware(request: NextRequest): NextResponse {
  const ingressPath = request.headers.get('x-ingress-path');
  const { pathname } = request.nextUrl;

  // Диагностический лог — пишет в stdout add-on'а, видно в Supervisor → Logs.
  // Полезно для отладки ingress: понимаем какой URL пришёл и был ли header.
  console.log(`[mw] ${request.method} ${pathname} | x-ingress-path=${ingressPath ?? '(none)'}`);

  if (!ingressPath) return NextResponse.next();
  if (!pathname.startsWith(ingressPath)) return NextResponse.next();

  const stripped = pathname.slice(ingressPath.length) || '/';
  const url = request.nextUrl.clone();
  url.pathname = stripped;
  console.log(`[mw] rewrite → ${stripped}`);
  return NextResponse.rewrite(url);
}

export const config = {
  // Применяется ко всем путям, кроме внутренних Next.js статических ресурсов
  // и API. Они тоже могут приходить с префиксом, но статика обрабатывается
  // как файл — там middleware уже не помогает; там работает assetPrefix.
  matcher: '/:path*',
};
