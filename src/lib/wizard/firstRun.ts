/**
 * Первый запуск Homeglance: триггер и логика wizard'а.
 *
 * Условия показа:
 *  - У активного профиля все страницы пустые (нет виджетов).
 *  - Нет флага «wizard-done» для этого профиля в localStorage.
 *
 * Если оба условия сходятся — рендерим FirstRunWizard вместо Dashboard.
 * Skip и любое завершение wizard'а ставит флаг — больше не показываем.
 */

import type { Page } from '@/lib/pages/types';

const KEY_PREFIX = 'glance:wizard-done-v1:';

export function isWizardDone(profileId: string): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(KEY_PREFIX + profileId) === '1';
}

export function markWizardDone(profileId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY_PREFIX + profileId, '1');
}

export function shouldShowWizard(profileId: string | null, pages: Page[]): boolean {
  if (!profileId) return false;
  if (isWizardDone(profileId)) return false;
  // Если хотя бы одна страница уже с виджетами — пользователь явно «начал»,
  // не лезем поверх его работы.
  const hasContent = pages.some((p) => p.widgets.length > 0);
  if (hasContent) return false;
  return true;
}
