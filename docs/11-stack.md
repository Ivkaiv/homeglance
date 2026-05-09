# 11 · Технологический стек

## Frontend

### Next.js 14 (App Router)

**Выбор:** проверенная связка для PWA с TypeScript, отличный DX, удобный routing, prerender + dynamic rendering.

**Почему не Vite/SvelteKit:**
- Next.js имеет лучший Static Site Generation для self-hosted
- Куча готовых решений (Image, Link, Suspense)
- Большая экосистема (для будущих контрибьюторов)

**Конфигурация:**
- `output: 'export'` для статической сборки → можно положить в HACS
- `app/` директория для всего нового кода

### React 18

- Concurrent rendering для плавности
- Suspense для lazy-loading виджетов
- Server Components где возможно (хотя дашборд почти полностью клиентский)

### TypeScript

- Strict mode
- Generic Widget API
- Вся работа с HA-сущностями типизирована (entity_id → правильный тип атрибутов)

### Tailwind CSS

- Utility-first, быстрая разработка
- Кастомизация через `tailwind.config.ts`
- CSS-переменные для тем (dark/light/custom)
- Никаких CSS-modules / styled-components

### Framer Motion

- Все анимации (drag, fade, scale, slide)
- API проще встроенных CSS-transition для сложных кейсов
- Поддержка spring-физики

### react-grid-layout

- Drag-and-drop сетка виджетов
- Touch-поддержка для мобильных
- Хорошо документирована, стабильна

### Lucide React + @mdi/js

- Иконки UI (Lucide)
- Иконки сущностей HA (MDI, ~7000 штук)

## Backend

В **MVP** — никакого бэкенда. Pure SPA + статика. Все данные client-side.

В **v1+** — опциональный backend для:
- Прокси к HA (если CORS)
- Sync раскладок между устройствами

Для backend — Next.js API routes (тот же стек).

## Хранение

- **localStorage** — настройки, профили, раскладки (до ~5 МБ)
- **IndexedDB** — иконки, кэш истории, бэкапы (до сотен МБ)
- **WebCrypto** (опционально, v2) — шифрование токенов

## Тестирование

- **Vitest** — unit-тесты компонентов и хуков
- **Playwright** — e2e-тесты ключевых сценариев (создание профиля, добавление виджета)
- **Storybook** — каталог компонентов, визуальные тесты
- **Chromatic** или **Percy** для скриншот-тестов (опционально)

## Сборка / Bundling

- **Next.js build** для прода
- **Bun** как runtime (быстрее npm/yarn)
- **esbuild** через Next.js (быстрая сборка)
- **Bundle analyzer** для контроля размера

## CI/CD

- **GitHub Actions**:
  - On PR: lint, type-check, tests, build
  - On main merge: build + deploy preview
  - On tag: build release + auto-publish to HACS

## Code Quality

- **ESLint** — стандартные React + TypeScript правила + кастомные:
  - Запрет `any` (warning)
  - Обязательный return type у public функций
  - Запрет `console.log` в коммитах
- **Prettier** — единый стиль
- **Husky** — pre-commit хуки (lint + format)
- **TypeDoc** — авто-генерация документации из JSDoc

## Альтернативы что отклонили

- **Vue/Nuxt** — меньше экосистема в HA-кругах
- **Svelte/SvelteKit** — лёгкий, но reactivity-модель сложнее объяснить новым контрибьюторам
- **Solid.js** — слишком молодой
- **Vanilla JS** — придётся писать слишком много инфраструктуры
- **Web Components** — плохая совместимость с TypeScript на data-binding уровне

## Размер бандла (целевой)

| Что | Размер (gzipped) |
|-----|------------------|
| React + ReactDOM | ~45 KB |
| Next.js runtime | ~30 KB |
| Tailwind (purged) | ~10 KB |
| Framer Motion | ~50 KB |
| react-grid-layout + react-resizable | ~30 KB |
| Lucide (используемые иконки) | ~15 KB |
| **Core (без виджетов и MDI)** | **~180 KB** |
| Каждый виджет | ~3-10 KB |
| MDI (lazy, по требованию) | streaming |

Для первого визита: **~250 KB** total. Для повторных — instant из cache.
