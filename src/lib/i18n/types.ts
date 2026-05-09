/**
 * Типы для i18n.
 * Словарь — плоский: ключи через точку для namespace ('settings.theme.label').
 */

export type Locale = 'ru' | 'en';

export const LOCALES: readonly Locale[] = ['ru', 'en'] as const;

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

export type Dictionary = Record<string, string>;
