/**
 * Custom server для HA Add-on под Ingress.
 *
 * Standalone Next.js обрабатывает HTTP сам, но не умеет проксировать
 * WebSocket к HA через Supervisor (homeassistant_api: true). Этот сервер:
 *
 *   1. Запускает Next.js standalone-сервер во внутреннем порту.
 *   2. Сам слушает PORT (3040 по умолчанию) — все HTTP-запросы пробрасывает
 *      на standalone, поэтому Next-роуты, статика и middleware работают
 *      как раньше.
 *   3. Перехватывает WS-upgrade на `/api/glance/ha-ws` — открывает обратный
 *      коннект к `ws://supervisor/core/api/websocket` с supervisor-токеном
 *      и проксирует сообщения, подменяя HA auth-handshake. Клиент думает,
 *      что подключился к настоящему HA WS, но по факту supervisor сделал
 *      auth от его имени — токена в браузере не нужно.
 *
 * REST к HA проксируется через обычный Next-route /api/glance/ha-rest/[..]
 * (см. app/api/glance/ha-rest/route.ts) — там уже работает supervisor token
 * server-side.
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { WebSocket, WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 3040;
const NEXT_PORT = 3041;
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN || process.env.HASSIO_TOKEN || '';
const SUPERVISOR_HOST = process.env.SUPERVISOR_HOST || 'supervisor';
const HAS_SUPERVISOR = Boolean(SUPERVISOR_TOKEN);

console.log(`[server] starting custom proxy server, supervisor=${HAS_SUPERVISOR ? 'yes' : 'no'}`);

// 1) Запускаем Next standalone на 127.0.0.1:NEXT_PORT
//    next-server.js — это переименованный standalone server (см. Dockerfile),
//    мы освободили имя server.js под наш wrapper.
const nextEntry = path.join(__dirname, 'next-server.js');
const nextProc = spawn('node', [nextEntry], {
  env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1' },
  stdio: 'inherit',
});
nextProc.on('exit', (code) => {
  console.error(`[server] next exited with code ${code}`);
  process.exit(code ?? 1);
});

// 2) Прокси HTTP → next
const proxyHttp = (req, res) => {
  const opts = {
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    method: req.method,
    path: req.url,
    headers: req.headers,
  };
  const upstream = http.request(opts, (upRes) => {
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    upRes.pipe(res);
  });
  upstream.on('error', (e) => {
    console.error('[server] upstream error:', e.message);
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
};

// 3) WS proxy для HA (под ingress)
const wss = new WebSocketServer({ noServer: true });

function handleHAProxy(clientWs) {
  console.log('[ha-ws] client connected, opening upstream to supervisor');
  const upstream = new WebSocket(`ws://${SUPERVISOR_HOST}/core/api/websocket`);

  let upstreamReady = false; // true после auth_ok
  let clientAuthed = false;  // мы уже отдали клиенту auth_ok
  const queueFromClient = [];

  const safeSend = (sock, data) => {
    if (sock.readyState === WebSocket.OPEN) {
      try { sock.send(data); } catch {}
    }
  };

  upstream.on('open', () => {
    // Ждём от supervisor auth_required
  });

  upstream.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (!upstreamReady) {
      if (msg.type === 'auth_required') {
        // Сразу шлём auth с supervisor token, не дожидаясь клиента
        safeSend(upstream, JSON.stringify({ type: 'auth', access_token: SUPERVISOR_TOKEN }));
        // Параллельно отдаём auth_required клиенту, чтобы он проиграл свой handshake
        safeSend(clientWs, data.toString());
        return;
      }
      if (msg.type === 'auth_ok') {
        upstreamReady = true;
        // Сольём всё что клиент успел положить в очередь
        for (const m of queueFromClient) safeSend(upstream, m);
        queueFromClient.length = 0;
        // Если клиент ждёт ответа на свой auth — отдадим, иначе тихо
        if (clientAuthed) safeSend(clientWs, data.toString());
        return;
      }
      if (msg.type === 'auth_invalid') {
        console.error('[ha-ws] supervisor auth_invalid');
        safeSend(clientWs, data.toString());
        clientWs.close();
        upstream.close();
        return;
      }
    }
    // После auth — прозрачно проксируем
    safeSend(clientWs, data.toString());
  });

  clientWs.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'auth') {
      // Клиент завершил handshake: отдадим ему auth_ok сразу же,
      // если supervisor уже подтвердил. Иначе пометим и подождём.
      clientAuthed = true;
      if (upstreamReady) {
        safeSend(clientWs, JSON.stringify({ type: 'auth_ok', ha_version: 'unknown' }));
      }
      return;
    }
    // Обычные сообщения — в supervisor (после auth_ok)
    if (upstreamReady) safeSend(upstream, data.toString());
    else queueFromClient.push(data.toString());
  });

  clientWs.on('close', () => {
    try { upstream.close(); } catch {}
  });
  upstream.on('close', () => {
    try { clientWs.close(); } catch {}
  });
  upstream.on('error', (e) => {
    console.error('[ha-ws] upstream error:', e.message);
    try { clientWs.close(); } catch {}
  });
}

const proxyWs = (req, socket, head) => {
  // Прокси к next standalone (не используется, но на случай HMR)
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    method: 'GET',
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${NEXT_PORT}` },
  });
  upstream.on('upgrade', (upRes, upSocket) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(upRes.headers)
        .map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    upSocket.pipe(socket).pipe(upSocket);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
};

// 4) Запускаем фронт-сервер
function start() {
  const server = http.createServer((req, res) => {
    proxyHttp(req, res);
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/api/glance/ha-ws' && HAS_SUPERVISOR) {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        handleHAProxy(clientWs);
      });
      return;
    }
    proxyWs(req, socket, head);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] listening on 0.0.0.0:${PORT} (next at 127.0.0.1:${NEXT_PORT})`);
  });
}

// Поллим Next — как только готов, стартуем фронт-сервер
function waitForNext(attempt = 0) {
  const req = http.get({ hostname: '127.0.0.1', port: NEXT_PORT, path: '/' }, (r) => {
    r.resume();
    start();
  });
  req.on('error', () => {
    if (attempt > 60) {
      console.error('[server] next did not become ready in 30s');
      process.exit(1);
    }
    setTimeout(() => waitForNext(attempt + 1), 500);
  });
}
waitForNext();
