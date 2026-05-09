/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone-сборка: .next/standalone содержит минимальный сервер с
  // подтянутыми только нужными node_modules. Используется в Dockerfile,
  // чтобы итоговый образ был ~150 MB вместо 1+ GB.
  output: 'standalone',
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
