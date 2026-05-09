# syntax=docker/dockerfile:1.7

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM oven/bun:1.1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: build Next.js standalone bundle ─────────────────────────────────
FROM oven/bun:1.1-alpine AS builder
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
    HOSTNAME=0.0.0.0

# Непривилегированный юзер.
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Копируем standalone-сервер, статику и публичные ассеты. Конфиг хранения
# (data/) оставляем монтировать через volume — иначе при пересборке образа
# профили/токены/раскладки сбросятся.
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# Готовим директорию для server-storage (профили, страницы, токен HA).
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs
EXPOSE 3040

# Healthcheck — простой пинг главной страницы, считаем сервис живым если 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3040/ > /dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
