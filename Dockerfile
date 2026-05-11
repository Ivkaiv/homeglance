# syntax=docker/dockerfile:1.7

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: build Next.js standalone bundle ─────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
# Используем node:alpine (а не bun) для standalone-сервера: Next.js генерит
# `.next/standalone/server.js`, рассчитанный под Node, и в этой роли стабильнее.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3040 \
    HOSTNAME=0.0.0.0 \
    GLANCE_DATA_DIR=/data

# Под HA Add-on контейнер изолирован Supervisor'ом, и /addon_config
# монтируется с правами root. Поэтому запускаем как root — это стандартная
# практика для add-ons. Для standalone-Docker за пределами HA можно
# перебить USER в production deployment.
# (Раньше тут был непривилегированный nextjs:1001 — он не мог писать в
# /addon_config и профили не сохранялись.)

# Копируем standalone-сервер, статику и публичные ассеты. Конфиг хранения
# (data/) оставляем монтировать через volume — иначе при пересборке образа
# профили/токены/раскладки сбросятся.
COPY  --from=builder /app/.next/standalone ./
COPY  --from=builder /app/.next/static ./.next/static
COPY  --from=builder /app/public ./public

# Standalone-сервер от Next.js по умолчанию называется server.js — мы
# переименовываем его в next-server.js, чтобы освободить имя под наш
# кастомный server.js (он оборачивает Next.js handler и добавляет
# WS-прокси к HA через Supervisor для add-on под Ingress).
RUN mv ./server.js ./next-server.js
COPY  --from=builder /app/server.js ./server.js
# `ws` пакет не попадает в standalone trace (Next.js его не использует),
# поэтому копируем явно.
COPY  --from=builder /app/node_modules/ws ./node_modules/ws

# Persistent storage под HA Add-on — Supervisor автоматически монтирует
# /data из /usr/share/hassio/addons/data/<addon-slug>/ host-side. Этот
# каталог переживает рестарты, обновления, переустановки add-on. В
# отличие от addon_config map (введён в Supervisor 2023.10), /data
# поддерживается всеми версиями.
# Для standalone-Docker-инсталляций можно перебить GLANCE_DATA_DIR env.

EXPOSE 3040

# Healthcheck — простой пинг главной страницы, считаем сервис живым если 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3040/ > /dev/null 2>&1 || exit 1

CMD ["node", "/app/server.js"]
