'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ru } from './ru';
import { en } from './en';
import { LOCALES, type Dictionary, type Locale } from './types';

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en };
const STORAGE_KEY = 'glance:locale';
const FALLBACK: Locale = 'en';

/** Тип функции перевода — для передачи `t` в module-level хелперы. */
export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Перевод с подстановкой переменных {name} → params.name. */
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return FALLBACK;
  const lang = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  if (lang.startsWith('ru')) return 'ru';
  return 'en';
}

function loadStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && (LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  return null;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR-safe: на сервере и при первом клиентском рендере отдаём fallback
  // (он же перетекает в html lang). После маунта пытаемся подтянуть
  // сохранённый/детектированный локаль, чтобы избежать FOUC-несовпадения.
  const [locale, setLocaleState] = useState<Locale>(FALLBACK);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStoredLocale();
    setLocaleState(stored ?? detectLocale());
    setHydrated(true);
  }, []);

  // Поддерживаем lang атрибут <html> в актуальном виде — нужно для скринридеров и SEO.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES[FALLBACK];
      const fallbackDict = DICTIONARIES[FALLBACK];
      const template = dict[key] ?? fallbackDict[key] ?? key;
      return interpolate(template, params);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}
