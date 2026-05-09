const pkg = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone-сборка: .next/standalone содержит минимальный сервер с
  // подтянутыми только нужными node_modules. Используется в Dockerfile,
  // чтобы итоговый образ был ~150 MB вместо 1+ GB.
  output: 'standalone',
  // Trailing slash добавляется ко всем internal-ссылкам — чтобы относительные
  // пути в HTML резолвились от каталога, а не от файла. Это критично под HA
  // Ingress: путь типа `/api/hassio_ingress/<token>/` должен иметь слэш в
  // конце, чтобы `_next/static/...` стал `<token>/_next/static/...`, а не
  // `_next/static/...` на уровне родителя.
  trailingSlash: true,
  // assetPrefix='.' — генерим относительные пути для статики Next.js.
  // Под HA Ingress URL имеет динамический префикс (`/api/hassio_ingress/<token>`)
  // — абсолютные пути ломаются. Относительные резолвятся от текущего URL и
  // работают и в standalone, и за HA-прокси.
  assetPrefix: '.',
  // Прокидываем версию из package.json в client-bundle через NEXT_PUBLIC_*.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // Tree-shake — Next режет неиспользуемые модули из этих пакетов вместо
    // того, чтобы тащить весь индекс. Особенно эффективно для lucide-react
    // (~70кб экономии) и @mdi/js.
    optimizePackageImports: ['lucide-react', '@mdi/js', 'framer-motion'],
  },
};

// ANALYZE=true bun run build → генерирует .next/analyze/*.html для диагностики bundle.
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
