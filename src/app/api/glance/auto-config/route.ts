import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Возвращает auto-config для подключения к HA, когда add-on запущен под
 * Home Assistant Supervisor. Supervisor выставляет env SUPERVISOR_TOKEN
 * (требует homeassistant_api: true в config.yaml) — этот токен можно
 * использовать для аутентификации в HA REST/WebSocket API.
 *
 * Безопасность: эндпоинт отдаёт supervisor-токен только когда запрос
 * пришёл через HA Ingress (есть заголовок X-Ingress-Path). В этом случае
 * пользователь уже авторизован в HA, и same-origin policy защищает
 * браузер от утечки токена другим origin'ам.
 *
 * Браузер должен использовать `${window.location.origin}` как HA URL —
 * это работает потому что под ingress origin — это сам HA.
 */
export async function GET() {
  const ingressPath = headers().get('x-ingress-path');
  const supervisorToken = process.env.SUPERVISOR_TOKEN ?? process.env.HASSIO_TOKEN;

  // Диагностика — пишем в stdout add-on'а, видно в Supervisor → Logs.
  console.log(
    `[auto-config] request: hasIngress=${!!ingressPath} hasSupToken=${!!process.env.SUPERVISOR_TOKEN} hasHassioToken=${!!process.env.HASSIO_TOKEN}`,
  );

  if (!ingressPath || !supervisorToken) {
    return NextResponse.json({
      available: false,
      debug: { hasIngress: !!ingressPath, hasSupToken: !!supervisorToken },
    });
  }

  return NextResponse.json({
    available: true,
    token: supervisorToken,
    // url пустой → клиент использует window.location.origin
    url: '',
  });
}
