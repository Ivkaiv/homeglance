import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ConnectionProvider } from '@/lib/ha/ConnectionProvider';
import { ProfilesProvider } from '@/lib/profiles/ProfilesProvider';
import { PagesProvider } from '@/lib/pages/PagesProvider';
import { SecurityProvider } from '@/lib/security/SecurityProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { NotificationsProvider } from '@/lib/notifications/NotificationsProvider';
import { SDKBootstrap } from '@/lib/sdk/SDKBootstrap';
import { SwRegister } from '@/components/pwa/SwRegister';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Glance',
  description: 'Modern, mobile-first dashboard for Home Assistant',
  // Все public-asset URL'ы — относительные. Под HA Ingress абсолютные `/...`
  // ломаются: токен в URL динамический, путь не указывает на add-on, а на HA.
  manifest: 'manifest.json',
  applicationName: 'Glance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Glance',
    startupImage: ['icons/icon-512.png'],
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: 'icons/icon-512.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
  // maximumScale=5, userScalable не задан — соблюдаем accessibility-требование:
  // люди со слабым зрением должны иметь возможность зуммировать страницу.
  // Случайный double-tap zoom блокируется на уровне CSS (touch-action).
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // <base> — абсолютный, иначе относительные `./_next/static/...`
  // (от assetPrefix='.') ломаются на вложенных URL: на /onboarding/
  // они бы резолвились как /onboarding/_next/static/... → 404.
  // Под прямым доступом база = `/`, под HA Ingress = `<ingress>/`.
  const ingressPath = headers().get('x-ingress-path') ?? '';
  const baseHref = ingressPath ? `${ingressPath}/` : '/';

  // proxy-mode: под HA Ingress с homeassistant_api: true add-on проксирует
  // HA REST/WS через себя (см. server.js + app/api/glance/ha-rest).
  // Клиент детектит meta-tag и подключается к proxy без supervisor токена
  // в браузере. Безопасно: токен остаётся server-side.
  const supToken = process.env.SUPERVISOR_TOKEN ?? process.env.HASSIO_TOKEN ?? '';
  const proxyReady = ingressPath && supToken ? '1' : '0';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <base href={baseHref} />
        <meta name="hg-proxy-ready" content={proxyReady} />
      </head>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <ConnectionProvider>
              <ProfilesProvider>
                <PagesProvider>
                  <SecurityProvider>
                    <NotificationsProvider>
                      <div className="min-h-screen w-full safe-area-host">{children}</div>
                      <SwRegister />
                      <SDKBootstrap />
                    </NotificationsProvider>
                  </SecurityProvider>
                </PagesProvider>
              </ProfilesProvider>
            </ConnectionProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
