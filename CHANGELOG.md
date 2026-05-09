# Changelog

Все значимые изменения в проекте Homeglance документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/), проект следует
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0-alpha.2] — 2026-05-09

### Added — i18n (Phase 8 / A)
- Самописный i18n (без next-intl): `src/lib/i18n/{ru,en}.ts` + `I18nProvider` + `useT()`
- Language switcher в Settings (RU / English)
- Autodetect по navigator.language, override через `localStorage('glance:locale')`
- Переведены: Onboarding (welcome → connect → help), Settings (тема/язык/защита/HA/about), Auth-failed, page/global/widget error boundaries, Dashboard header, empty page, remove-widget confirm
- Версия приложения подкидывается из package.json через `NEXT_PUBLIC_APP_VERSION`

### Pending
- i18n для widget meta (15 виджетов) и модалок (AddWidget/Config/PageManager/ProfilePicker/ProfileEditor)

## [0.1.0-alpha.1] — public alpha (Phase 6 + 7)

### Added — Phase 6 (Polish & Performance)
- React Error Boundaries: общий, виджет-уровень, Next.js error.tsx + global-error.tsx
- WidgetSkeleton/DashboardSkeleton вместо эмодзи-загрузчиков
- next/dynamic для модалок (AddWidget, ConfigSheet, PageManager) и WeatherPageView
- Code-split всех 15 виджетов: meta вынесена в `widgets/meta.ts`, Component через `next/dynamic`
- Maskable-иконка PWA с safe-area 12% padding
- @next/bundle-analyzer (`ANALYZE=true bun run build`)

### Changed
- Initial bundle главной: **940 KB → 43 KB** (-22×). First Load JS: **1.07 MB → 179 KB**
- Lighthouse mobile: Accessibility 91→100, Best Practices/SEO 100, Performance 57→70
- viewport: убран `userScalable=false`, разрешено зуммирование (a11y)
- `optimizePackageImports` для lucide-react / @mdi/js / framer-motion
- Service Worker bumped до `glance-v2`, добавлен maskable-icon в кэш

### Added — Phase 7 (Distribution)
- Standalone Next.js build (`output: 'standalone'`) для Docker
- Multi-stage Dockerfile (bun build, node:alpine runtime, ~150 MB image)
- docker-compose.yml для standalone-установки
- HACS plugin (`hacs-plugin/homeglance.js`) — тонкая iframe-обёртка для встраивания в HA-сайдбар
- README с тремя путями установки (HACS plugin / Docker / dev)
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue & PR templates
- GitHub Actions: CI (typecheck + build на каждый PR), Release (multi-arch ghcr.io + GH Release при push тега)

## [0.1.0-alpha.1] — 2026-05-03

### Added — Phase 0 (Foundation)
- Каркас Next.js 14 + React 18 + TypeScript strict + Tailwind
- HA Client (WebSocket + REST) с авто-реконнектом
- Theme system (light/dark/auto) с CSS-переменными
- Onboarding (первый запуск) с вводом URL+token и инструкцией по созданию токена
- Settings page с переключением темы и отключением от HA
- Frosted-glass дизайн-система с iOS-вдохновлённой эстетикой
- Safe-area для iOS-PWA с notch

### Added — Phase 1 (Layout Engine)
- Drag-and-drop сетка через react-grid-layout
- Адаптивные колонки: 24/16/12/9 (lg/md/sm/mobile)
- Edit mode с «дрожанием» виджетов
- Сетка-подсказка во время редактирования
- Свободное размещение (preventCollision)
- Красивый resize-уголок
- 5 базовых виджетов: Sensor Value, Light Toggle, Switch Toggle, Time, Note
- AddWidgetSheet с фильтром по категориям
- ConfigSheet с поддержкой всех типов параметров (entity, text, number, color, select, boolean)
- Adaptive sizing для виджетов (tiny/small/medium/large)

### Added — Phase 2 (Pages & Navigation)
- Многостраничность (Page[] в localStorage)
- macOS-style DockBar внизу с spring-анимациями
- Page Manager: создание, редактирование, удаление, reorder
- Безопасная страница «Главная» (protected, нельзя удалить)
- Миграция со старого формата хранения

### Added — Phase 3 (Multi-user)
- Профили (Profile[] с аватаром и опциональным PIN)
- ProfilePicker — выбор/создание профиля
- ProfileEditor — форма с эмодзи-аватаром и PIN-настройкой
- ProfileSwitcher — dropdown в шапке для быстрого переключения
- PIN protection с SHA-256 хэшем (через WebCrypto)
- Per-profile хранение страниц и настроек
- Sign out (выйти из текущего профиля)
- Onboarding с первым профилем

### Added — Phase 4 (Widget Catalog)
- Climate (термостат с регулировкой, индикация heat/auto)
- Weather (текущая погода с эмодзи и метаданными)
- Quick Action (триггер script/automation/scene/button с feedback)
- Cover (шторы/жалюзи: open/close/stop с позицией)
- Person (присутствие дома с аватаром)
- Media Player (плеер с обложкой, контролами и громкостью)

### Added — Phase 5 (Room Hub)
- Room Hub Widget — хаб комнаты с настраиваемыми лампами/переключателями/сенсорами
- Адаптивная отрисовка кнопок (28-48px)
- Auto-overflow handler с «+N» badge

## [0.1.0-alpha.0] — 2026-05-02

- Initial scaffold
