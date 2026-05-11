# 10 · Roadmap

> **Статус на 2026-05-11** (рядом с релизом `0.1.0-alpha.30`). Галочки
> отражают фактическое состояние кодовой базы. Где план разошёлся с
> практикой — отмечено отдельным комментарием.

## Принцип этапности

Каждый этап → **публикуемый релиз**. Между этапами проверяем работоспособность, получаем фидбэк, корректируем следующий этап.

## Phase 0: Foundation ✅

**Цель:** базовый каркас без виджетов

- [x] Инициализация репозитория (Next.js + TypeScript + Tailwind + всё нужное)
- [x] Базовый дизайн-система: CSS-переменные, темы, типографика, .glass
- [x] HA Client: WebSocket + REST с реконнектом
- [x] Settings page: ввод URL HA + токена
- [x] Подключение → отображение списка сущностей
- [x] Профиль: один локальный, без UI выбора
- [x] Темы: dark/light/auto

**Deliverable:** ✅ работает.

## Phase 1: Layout Engine ✅

**Цель:** drag-and-drop сетка с виджетами

- [x] Интеграция react-grid-layout
- [x] Edit mode toggle, wiggle-анимация
- [x] Сетка-подсказка (visible grid)
- [x] 5 базовых виджетов: Sensor, Light, Switch, Time, Note
- [x] Widget Registry, Widget API
- [x] ConfigSheet — настройка параметров
- [x] AddWidgetSheet — каталог
- [x] Адаптивные размеры (tiny/small/medium/large)
- [x] localStorage для раскладок (плюс server-side для multi-device sync)
- [x] Кастомные кнопки удаления, настройки

**Deliverable:** ✅ работает.

## Phase 2: Pages & Navigation ✅ (частично)

**Цель:** несколько страниц с dock-навигацией

- [x] Dock-bar с иконками страниц
- [x] Создание/удаление/переименование страниц
- [x] Drag для изменения порядка страниц
- [ ] Свайп для переключения страниц
- [ ] URL-роутинг (`/p/{id}`) — отказались: под HA Ingress sandbox iframe ломает navigation между URL, переключение страниц делается через state (см. [ADR 006](../agent-state/adr/006-inline-views-vs-url-navigation.md))
- [x] Дефолтные шаблоны страниц (через FirstRunWizard)
- [x] Header страницы (опциональный)

## Phase 3: Multi-user ✅

**Цель:** несколько профилей на одном устройстве

- [x] Profile manager UI
- [x] Создание/переключение/удаление профилей
- [x] Аватар + имя
- [x] PIN protection
- [x] Per-profile хранение раскладок и настроек
- [x] Экран первого запуска (онбординг)

**Deliverable:** ✅ работает.

## Phase 4: Widget Catalog ✅

**Цель:** все «классические» виджеты

- [x] Climate (термостат)
- [x] Weather
- [x] Camera (HLS/snapshot)
- [x] Media Player (+ full-screen sheet с обложкой и контролами)
- [x] Sensor Chart (SensorValueWidget + история через sparkline)
- [x] Multi-Sensor (alpha.32)
- [x] Light Color — toggle + brightness + RGB picker (alpha.33)
- [x] Cover (шторы)
- [x] Lock (alpha.31)
- [x] Energy — мощность/today/month/cost (alpha.33)
- [x] Person Presence
- [x] Map — OSM iframe embed (alpha.33)
- [x] iframe (alpha.32)
- [x] Quick Action (script trigger)
- [x] Group / Container (ControlPanelWidget)
- [x] Calendar (alpha.30)
- [x] Weather Room (room-version)

## Phase 5: Room Hub Widget ✅

**Цель:** хаб-виджет комнаты

- [x] Room Widget (RoomHubWidget)
- [ ] Page-template для комнаты (детальная) — пока виджет, не отдельная страница
- [ ] Auto-detection комнат из HA (по `area_id`)
- [x] Custom rooms (создавать вручную)
- [x] Drag для добавления entity в комнату (через ConfigSheet)

## Phase 6: Polish & Performance ✅ (Lighthouse 83/95)

- [x] Skeletons и loading states везде
- [x] Error boundaries и graceful degradation (ErrorBoundary + WidgetErrorBoundary)
- [x] Lazy loading виджетов — через next/dynamic (alpha.0-7)
- [x] Viewport-based deferred rendering — IntersectionObserver по ячейкам (alpha.28-29)
- [x] Lazy-load @mdi/js — initial bundle 3 MB → 200 kB (alpha.27)
- [x] Service Worker (cache static, под прямой PWA-инсталляцией)
- [x] Code splitting (Next.js делает сам + явные lazy-import'ы)
- [ ] Image optimization (используются `<img loading="lazy">`, но не `next/image`)
- [~] Lighthouse audit ≥ 95 — текущий **83** (TBT 100ms, LCP 2.7s; mobile cold). Чтобы поднять до 95 нужны рефакторы initial render Dashboard.

## Phase 7: HACS Distribution ✅

**Цель:** установка через HACS

- [x] HACS-совместимый манифест (`hacs.json`)
- [x] Скрипт сборки → multi-arch Docker-образы в ghcr.io (см. `.github/workflows/release.yml`)
- [x] HA Add-on с zero-config Ingress (см. [ADR 004](../agent-state/adr/004-ha-ingress-server-side-proxy.md)) — пользователю не нужен LLT-токен
- [x] Persistent storage через `/data` (см. [ADR 005](../agent-state/adr/005-persistent-storage-data-dir.md))
- [x] Документация по установке (README)
- [x] Описание в HACS репозитории (`repository.yaml`)
- [ ] Demo screenshots в README
- [ ] Tutorial видео (опционально)

## Phase 8: Advanced Features 🟡

- [ ] OAuth flow с HA — отказались в пользу Supervisor proxy (ADR 004). Под прямой Docker остаётся manual токен.
- [ ] Sync через `frontend_storage`
- [ ] Кастомные темы через UI (есть только presets)
- [ ] Кастомные иконки через URL
- [x] Custom widgets API — SDK (`src/lib/sdk/`)
- [ ] Webhook trigger widget
- [x] Calendar widget (alpha.30)
- [ ] Notification feed widget
- [ ] Push notifications (через web-push)
- [ ] Voice control (через Whisper API)

## Phase 9: Public release ⚪ (в основном впереди)

- [ ] Сайт-лендинг
- [ ] Demo-instance с примерами
- [ ] HA Community Forum пост
- [ ] Reddit /r/homeassistant пост
- [ ] Twitter/X запуск
- [x] Issue templates (bug_report, feature_request, widget_proposal)
- [x] PR template
- [x] CONTRIBUTING.md
- [x] CODE_OF_CONDUCT.md

## Реалистичная оценка

Phase 0-7 завершены, Phase 8 частично. Phase 4 (виджеты) на 100% —
все 15 виджетов из roadmap есть. Плюс улучшения которых в плане не
было: server-side proxy, persistent /data, sandbox-safe inline views.

## Критерии готовности к v1.0

- [x] Все 10+ базовых виджетов работают и адаптивны (16 виджетов)
- [x] 100% покрытие mobile
- [x] PWA install (под прямым доступом)
- [x] Multi-user (3+ профиля)
- [x] Несколько страниц с dock-навигацией
- [x] Темы dark/light
- [x] HACS install работает (плюс HA Add-on)
- [~] Lighthouse ≥ 95 — текущий 83
- [ ] Без багов на тестовом устройстве пользователя 2 недели подряд
