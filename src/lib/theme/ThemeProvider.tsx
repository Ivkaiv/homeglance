'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextValue {
  /** Текущий выбор пользователя */
  mode: ThemeMode;
  /** Реально применённая тема (с учётом auto) */
  effective: 'light' | 'dark';
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'glance:theme-mode-v1';

function detectSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Загрузка сохранённого режима
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setModeState(stored);
      }
    } catch {}

    // Подписка на изменение системной темы
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light');
    setSystemTheme(detectSystem());
    mq.addEventListener('change', onChange);
    setHydrated(true);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const effective: 'light' | 'dark' = mode === 'auto' ? systemTheme : mode;

  // Применяем data-theme на html
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = effective;
  }, [effective, hydrated]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ mode, effective, setMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
