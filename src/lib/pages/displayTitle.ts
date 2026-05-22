import type { TFunction } from '@/lib/i18n/I18nProvider';
import type { Page } from './types';

/**
 * Заголовок страницы для показа пользователю.
 *
 * Обычные страницы (kind='grid') пользователь называет сам — их заголовок
 * показываем как есть. А «Музыка» и «Погода» — встроенные функциональные
 * страницы: их заголовок это название самой функции, поэтому он должен
 * переводиться вместе с языком интерфейса.
 *
 * Если у такой страницы стандартное имя («Музыка»/«Music», «Погода»/«Weather»)
 * или имя вовсе не задано — показываем переведённую версию. Если же
 * пользователь придумал собственное имя — уважаем его выбор и не трогаем.
 */
const SPECIAL_TITLES = {
  music: { key: 'page.music.title', aliases: ['музыка', 'music'] },
  weather: { key: 'page.weather.title', aliases: ['погода', 'weather'] },
} as const;

export function pageDisplayTitle(page: Page, t: TFunction): string {
  if (page.kind === 'music' || page.kind === 'weather') {
    const spec = SPECIAL_TITLES[page.kind];
    const norm = page.title.trim().toLowerCase();
    if (norm === '' || (spec.aliases as readonly string[]).includes(norm)) {
      return t(spec.key);
    }
  }
  return page.title;
}
