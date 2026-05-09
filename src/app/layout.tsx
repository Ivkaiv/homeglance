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
  // Под HA Ingress URL имеет динамический префикс /api/hassio_ingress/<token>.
  // Без этого <base> относительные `./_next/static/...` (assetPrefix='.')
  // резолвятся относительно текущего URL — а если HA даёт URL без trailing
  // slash, путь «уходит на уровень выше токена» и отдаётся 404 на статику.
  // <base> явно фиксирует базу как «корень add-on под текущим ingress».
  const ingressPath = headers().get('x-ingress-path') ?? '';
  const baseHref = ingressPath ? `${ingressPath}/` : './';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <base href={baseHref} />
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
