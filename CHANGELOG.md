# Changelog

Все значимые изменения в проекте Homeglance документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/), проект следует
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0-alpha.29] — 2026-05-11

### Fixed
- **Виджеты висели в загрузке в alpha.28.** Обёртка `DeferredViewport` использовала `display: contents`, у такого элемента нет собственного box-модели — `IntersectionObserver` не может его наблюдать, и виджеты никогда не «попадали в viewport». Заменил на `w-full h-full` — обёртка занимает весь box ячейки RGL, intersect-детекция работает.

## [0.1.0-alpha.28] — 2026-05-11

### Changed
- **Viewport-based deferred rendering виджетов.** Все ячейки `RGLGrid` обёрнуты в `<DeferredViewport>`: пока ячейка не попала в viewport (с запасом `rootMargin: 400px`), внутри показывается `WidgetSkeleton`. Видимые виджеты рисуются сразу, скрытые ниже скролла подгружаются по мере прокрутки. В edit-mode откладывание отключено — drag/resize требуют, чтобы все виджеты были смонтированы.

  Lighthouse mobile audit на холодном старте до/после:
  - Performance 57 → **83** (+26)
  - Total Blocking Time 2220 ms → **100 ms** (-95%)
  - LCP 4.1 s → **2.7 s** (-34%)
  - Time to Interactive 5.1 s → **1.3 s** (-75%)

## [0.1.0-alpha.27] — 2026-05-11

### Changed
- **`@mdi/js` теперь async-чанк.** Material Design Icons (~2.8 MB, 7000 path-констант) попадали в каждый initial bundle, потому что `MDI_MAP[key]` использовал динамические ключи и webpack не мог tree-shake'ить. `MdiIcon` переписан на `useEffect + import('@mdi/js')` с module-scope кэшем — иконки подгружаются после первого рендера, как отдельный async-chunk.

  Эффект: **First Load JS = 200 kB вместо ~3 MB** (15× меньше). Bundle проверен через `@next/bundle-analyzer` и `performance.getEntriesByType('resource')`.

  `searchMdi()` стал `async` — единственное место использования (`ConfigSheet`) обновлено на `useEffect + setState`.

## [0.1.0-alpha.26] — 2026-05-11

### Fixed
- **MediaPlayer sheet glow без резкого обрыва.** Цветовое свечение от обложки рендерилось локально на блоке с обложкой (`-mx-5 -mt-5` + radial-gradient) и обрезалось снизу — заметная граница между подсвеченной верхушкой и обычным фоном. Перенесли в новый `innerStyle` prop у `ModalSheet`, который прокидывается в `style` внутреннего контейнера. Теперь свечение растекается по всему sheet и плавно затухает к контролам/громкости.

## [0.1.0-alpha.25] — 2026-05-11

### Added
- **Тап по плееру открывает full-screen sheet.** `MediaPlayerWidget` на Dashboard теперь оборачивает обложку + title в кнопку, которая открывает тот же `MediaPlayerSheet`, что раньше был доступен только из `RoomHubWidget`. Tap-targets для play/pause/next/prev отделены и работают независимо. Поведение для всех tier'ов (small/short/vertical).

## [0.1.0-alpha.24] — 2026-05-11

### Fixed
- **Persistent storage не работал** даже после `map: addon_config:rw`: эта permission введена в HA Supervisor 2023.10, и на более старых версиях `/addon_config` оставался в эфемерном layer контейнера. Переключились на стандартный `/data` mount, который Supervisor монтирует автоматически (без `map:`) на всех версиях. Профили/виджеты теперь переживают любые рестарты, обновления и переустановки add-on.

## [0.1.0-alpha.23] — 2026-05-11

### Changed
- **Settings рендерится inline на главной странице** через React state, без navigation между URL — кнопка «настройки» под HA Companion App больше не даёт 404. `SettingsView` вынесен в `components/settings/SettingsView.tsx`, `app/settings/page.tsx` остаётся как тонкая обёртка для standalone-инсталляций.
- **Onboarding `tryConnect()` больше не делает `nav('/')`** — `ConnectionProvider` обновит `hasCredentials`, и `app/page.tsx` сам перерендерится в Dashboard через state.

### Removed
- `lib/ingress/nav.ts` — helper для navigation через `<base href>`. После переезда на server-side proxy и inline-views не нужен.
- `src/app/api/glance/auto-config/` — endpoint больше не используется (заменён meta-tag + proxy).
- Debug-логи в `middleware.ts` (`[mw] GET /...`) — журнал add-on'а был залит мусором под proxy-mode.

## [0.1.0-alpha.22] — 2026-05-11

### Fixed
- **EACCES при сохранении на диск.** В Dockerfile запускали под непривилегированным `nextjs:1001`, а HA Supervisor монтирует persistent-каталоги от root — каждая попытка `mkdir`/`writeFile` падала. Запускаем под root (стандартная практика HA Add-ons; контейнер изолирован Supervisor'ом).

## [0.1.0-alpha.21] — 2026-05-11

### Fixed
- **API-fetch не доходил до сервера.** `apiUrl()` возвращал относительный путь без trailing slash, а Next.js (`trailingSlash: true`) отвечал 308 → URL с `/`. Под ingress Location-header не содержал ingress-префикса → браузер уходил на корень HA → 404. Теперь `apiUrl()` сразу собирает абсолютный URL с trailing slash (перед query-string, если есть).

## [0.1.0-alpha.20] — 2026-05-11

### Fixed
- **`apiUrl()` собирает абсолютный URL через `<base href>`.** Relative-пути fetch'а в HA Companion WebView не подхватывают `<base>` так же, как `<script src>` — запросы уходили в никуда.

## [0.1.0-alpha.19] — 2026-05-11

### Added
- **Persistent storage через `map: addon_config:rw`.** *(Заменено в alpha.24 на `/data` для compat со старыми Supervisor'ами.)*

## [0.1.0-alpha.18] — 2026-05-10

### Added
- **Zero-config auto-connect через Supervisor.** Add-on проксирует HA WebSocket и REST через себя — пользователю больше не нужно создавать LLT-токен.
  - Кастомный `server.js` оборачивает Next.js standalone: HTTP проксирует на внутренний port, WS upgrade на `/api/glance/ha-ws` перехватывает и открывает обратный коннект к `ws://supervisor/core/api/websocket` с supervisor-токеном, подменяя HA auth-handshake.
  - `app/api/glance/ha-rest/[[...path]]/route.ts` — REST proxy с `Authorization: Bearer SUPERVISOR_TOKEN` server-side.
  - `<meta name="hg-proxy-ready">` в layout сообщает клиенту, что нужно идти на proxy URL.
  - `homeglance-addon/config.yaml`: `homeassistant_api: true`.
  - `HAClient.connect()` принимает `overrides` для `wsUrl`/`restUrl` под proxy-mode.

См. [ADR 004](agent-state/adr/004-ha-ingress-server-side-proxy.md).

## [0.1.0-alpha.17] — 2026-05-10

### Fixed
- **Откатили попытку использовать `SUPERVISOR_TOKEN` для прямой HA-авторизации** — HA WebSocket отвечает `auth_invalid` (токен предназначен только для supervisor API). Кнопка «Перенастроить» в auth-failed теперь вызывает `forget()` через React state вместо `nav('/onboarding')` (последнее ломалось в sandbox iframe). URL в onboarding pre-filled `window.location.origin`.

## [0.1.0-alpha.13] — 2026-05-10

### Fixed
- **Onboarding рендерится inline на главной.** HA Ingress оборачивает add-on в sandboxed iframe, который блокирует `window.location.assign(...)` за пределами ingress-префикса — `nav('/onboarding')` уходил на корень HA. Решение: при `!hasCredentials` рендерим `<OnboardingPage />` напрямую в `app/page.tsx`. После `connectTo()` `ConnectionProvider` обновляет state, и компонент сам перерендерится в Dashboard.

## [0.1.0-alpha.12] — 2026-05-10

### Fixed
- **`<base href>` сделан абсолютным.** При `nav('/onboarding')` URL менялся на `/onboarding/`, и относительные `./_next/static/...` (из `assetPrefix='.'`) резолвились как `/onboarding/_next/static/...` → 404 на всю статику. Теперь base — `/` (или `<ingress>/` под ingress), не зависит от текущего route.

## [0.1.0-alpha.11] — 2026-05-10

### Fixed
- **Все `router.push`/`router.replace` заменены на helper `nav()`** через `<base href>` — `next/navigation` ломался в sandbox iframe HA Companion App'а.

## [0.1.0-alpha.10] — 2026-05-10

### Fixed
- **Service Worker self-unregister под ingress.** SW из alpha.8/9 кэшировал абсолютные пути на корень HA (битые 404) и отдавал их даже после обновления add-on. В новой версии SW обнаруживает ingress URL по `registration.scope` и при `activate` сам себя `unregister()`, очищая все кэши.

## [0.1.0-alpha.9] — 2026-05-10

### Fixed
- **`<base href>` от `X-Ingress-Path` для статики через ingress.** Без него относительные `./_next/static/...` уходили на родительский URL HA и получали 404, а статика add-on'а не загружалась.

## [0.1.0-alpha.8] — 2026-05-10

### Fixed
- **`bun run start` → `node .next/standalone/server.js`.** В предыдущих релизах сервис в systemd запускал `next start`, но в `next.config.js` стоит `output: 'standalone'` — Next.js явно ругался «`next start` does not work with `output: standalone`» и падал с runtime-ошибкой `Cannot read properties of undefined (reading 'clientModules')`. Теперь Dockerfile и systemd-unit запускают standalone server напрямую.

## [0.1.0-alpha.7] — 2026-05-09

### Fixed
- **HA Ingress 404**: HA Supervisor НЕ переписывает path при проксировании в add-on — запрос приходит на `/api/hassio_ingress/<token>/...`, и Next.js не находит этот route. Добавлен middleware (`src/middleware.ts`), который читает `X-Ingress-Path` header и переписывает URL обратно на корень. Теперь add-on отвечает корректно через ingress.

## [0.1.0-alpha.6] — 2026-05-09

### Added
- **HA Ingress** в add-on: `ingress: true` + `ingress_port: 3040` в config.yaml. После установки Homeglance автоматически появляется в боковой панели HA через HA-проксирование (`/api/hassio_ingress/<token>/...`). HACS plugin больше не обязателен.

### Changed
- **Все URL в HTML — относительные.** Чтобы работать за HA-прокси с динамическим префиксом:
  - `next.config.js`: `assetPrefix: '.'`, `trailingSlash: true`
  - `app/layout.tsx`: PWA-метаданные (`manifest`, `icons`) теперь `'manifest.json'` вместо `'/manifest.json'`
  - SwRegister: `register('sw.js', { scope: './' })` вместо `/sw.js` `/`
  - API-fetch'и через helper `apiUrl()` (drops leading slash) — `lib/api-url.ts`

В standalone-инсталляции (Docker Compose, отдельный сервер) URL'ы работают как обычно — relative paths резолвятся от `origin/`. За HA Ingress — резолвятся от `<token>/` префикса.

## [0.1.0-alpha.5] — 2026-05-09

### Added
- **HA Add-on** для Home Assistant OS / Supervised: одно-кликовая установка через Settings → Add-ons → Repositories. Запускает Homeglance-сервер прямо внутри Supervisor, не требует отдельного Docker-хоста.
- **First-run wizard**: при первом запуске нового профиля показывает welcome-экран с тремя путями (auto-pilot / 5 шаблонов / пустая страница). Auto-pilot создаёт «Главную» + страницу per-area HA + «Инфо». Шаблоны: Минимум, Семейная, Студия, Спальня, Только мониторинг.
- **ClimateSheet**: bottom-sheet управления климат-сущностями. Большие +/- для целевой температуры, цветные chips для HVAC mode / fan / preset / swing. Открывается тапом на ClimateWidget или на пилюлю в RoomHubWidget.
- **Activity indicator у climate**: пилюля светится и пульсирует только когда сущность реально работает (по hvac_action), idle — нейтральная. Иконки берутся из самой HA-сущности (mdi:water-boiler, mdi:radiator…).

### Fixed
- HACS structure: hacs.json и homeglance.js перенесены в корень репо (HACS не умеет искать в подпапках)
- ConfirmDialog danger-кнопка читаема в светлой теме
- HVAC chips: иконка и текст выровнены по baseline
- Drag/resize-handle: единый стиль, видно в обеих темах

### Changed
- Release workflow билдит три image-name: multi-arch + amd64-homeglance + aarch64-homeglance (для HA Add-on)
- README install-section перепорядочен: Add-on → HACS plugin → Docker Compose → source

## [0.1.0-alpha.4] — 2026-05-09

### Added — Phase 8 закрыт
- **Custom widgets API (G):** `window.Homeglance` глобальный SDK для community-разработчиков. Внешний `.js`-файл регистрирует новый виджет через `registerWidget(entry)`. Доступны те же hooks что у встроенных виджетов (useEntity / useStates / useCallService). Управление URL'ами в Settings → External widgets. Документация в `docs/15-sdk.md` с примером ClockWidget.

### Fixed
- ConfirmDialog danger-кнопка читаема на светлой теме (text-red-700 dark:text-red-200)
- Resize-handle в стиле drag-handle: stroke-width 4, bg-black/30 light, bg-white/40 dark, дуга вдоль угла
- Drag-handle убрана чёрная подложка, осталась только полоска

## [0.1.0-alpha.3] — 2026-05-09

### Added — Phase 8 (Sync, Lovelace import, themes, notifications)
- Sync через HA frontend_storage: ручные кнопки Push/Pull в Settings, snapshot всех профилей+страниц одним ключом
- Импорт устройств из HA Lovelace: рекурсивный обход cards, извлечение entity_id, фильтрация через states, mapping по domain → виджеты
- Custom theme accent: 5 пресетов (emerald/indigo/sky/rose/amber) с тонировкой под dark/light темы
- Foreground notifications: подписка на persistent_notification.* state_changed → Web Notification API

### Added — экспорт/импорт раскладок JSON
- Schema homeglance.layout/1, per-page и all-pages варианты
- Кнопки в PageManagerSheet с валидацией ошибок

### Fixed — UX
- drag-handle теперь полоска 36px только сверху виджета (не весь виджет) — страница скроллится в edit-mode
- header на mobile в edit-mode: кнопки в иконки, заголовок страницы скрыт
- PageManagerSheet rows на mobile: title на отдельной строке, actions wrap'ом
- ConfirmDialog danger-кнопка читаема в светлой теме (text-red-700 вместо text-red-200)
- Resize-handle цвета приведены к стилю drag-handle

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
