'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0a0e1a',
          color: '#e8e9ee',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            padding: 24,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            Glance не смог запуститься
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
            Произошла фатальная ошибка. Попробуйте перезагрузить страницу. Если это не поможет —
            попробуйте очистить данные приложения в настройках браузера.
          </div>
          {error.message && (
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                fontFamily: 'ui-monospace, "SFMono-Regular", monospace',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 16,
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </div>
          )}
          <button
            onClick={reset}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#a5b4fc',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
