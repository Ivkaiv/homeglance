'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Палитра акцента: пара значений (dark / light) для CSS-переменной `--accent`.
 * Значения — RGB triplets (без `rgb()`-обёртки), потому что Tailwind 4
 * подставляет их в `rgb(var(--accent) / <alpha>)`.
 */
export type AccentPreset = 'emerald' | 'indigo' | 'sky' | 'rose' | 'amber';

interface AccentValues {
  dark: string;
  light: string;
  /** Цвет точки в свитчере. Используем dark-вариант — он ярче. */
  swatch: string;
}

export const ACCENT_PRESETS: Record<AccentPreset, AccentValues> = {
  emerald: { dark: '52 211 153', light: '5 150 105', swatch: '#34d399' },
  indigo: { dark: '129 140 248', light: '67 56 202', swatch: '#818cf8' },
  sky: { dark: '56 189 248', light: '2 132 199', swatch: '#38bdf8' },
  rose: { dark: '251 113 133', light: '190 18 60', swatch: '#fb7185' },
  amber: { dark: '251 191 36', light: '180 83 9', swatch: '#fbbf24' },
};

interface ThemeContextValue {
  mode: ThemeMode;
  effective: 'light' | 'dark';
  setMode: (m: ThemeMode) => void;

  accent: AccentPreset;
  setAccent: (a: AccentPreset) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'glance:theme-mode-v1';
const ACCENT_KEY = 'glance:theme-accent-v1';

function detectSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isAccent(v: unknown): v is AccentPreset {
  return typeof v === 'string' && v in ACCENT_PRESETS;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');
  const [accent, setAccentState] = useState<AccentPreset>('emerald');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setModeState(stored);
      }
      const storedAccent = localStorage.getItem(ACCENT_KEY);
      if (isAccent(storedAccent)) setAccentState(storedAccent);
    } catch {}

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

  // Применяем accent через inline-CSS-var на <html>. Этот override бьёт
  // `:root` и `[data-theme='light']` правила в globals.css.
  useEffect(() => {
    if (!hydrated) return;
    const values = ACCENT_PRESETS[accent];
    const triplet = effective === 'dark' ? values.dark : values.light;
    document.documentElement.style.setProperty('--accent', triplet);
  }, [accent, effective, hydrated]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {}
  };

  const setAccent = (a: AccentPreset) => {
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ mode, effective, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
