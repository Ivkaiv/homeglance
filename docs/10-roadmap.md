# 10 · Roadmap

## Принцип этапности

Каждый этап → **публикуемый релиз**. Между этапами проверяем работоспособность, получаем фидбэк, корректируем следующий этап.

## Phase 0: Foundation (1-2 недели)

**Цель:** базовый каркас без виджетов

- [ ] Инициализация репозитория (Next.js + TypeScript + Tailwind + всё нужное)
- [ ] Базовый дизайн-система: CSS-переменные, темы, типографика, .glass
- [ ] HA Client: WebSocket + REST с реконнектом
- [ ] Settings page: ввод URL HA + токена
- [ ] Подключение → отображение списка сущностей (просто текстом, для теста)
- [ ] Профиль: один локальный, без UI выбора
- [ ] Темы: dark/light/auto

**Deliverable:** запускается, подключается к HA, показывает «работает»

## Phase 1: Layout Engine (1-2 недели)

**Цель:** drag-and-drop сетка с виджетами

- [ ] Интеграция react-grid-layout
- [ ] Edit mode toggle, wiggle-анимация
- [ ] Сетка-подсказка (visible grid)
- [ ] 5 базовых виджетов: Sensor, Light, Switch, Time, Note
- [ ] Widget Registry, Widget API
- [ ] ConfigSheet — настройка параметров
- [ ] AddWidgetSheet — каталог
- [ ] Адаптивные размеры (tiny/small/medium/large)
- [ ] localStorage для раскладок
- [ ] Кастомные кнопки удаления, настройки

**Deliverable:** можно создать страницу из 5 виджетов, перетащить, настроить, сохранить

## Phase 2: Pages & Navigation (1 неделя)

**Цель:** несколько страниц с dock-навигацией

- [ ] Dock-bar с иконками страниц
- [ ] Создание/удаление/переименование страниц
- [ ] Drag для изменения порядка страниц
- [ ] Свайп для переключения страниц
- [ ] URL-роутинг (`/p/{id}`)
- [ ] Дефолтные шаблоны страниц
- [ ] Header страницы (опциональный)

**Deliverable:** дашборд из 3-4 страниц, все красиво

## Phase 3: Multi-user (1 неделя)

**Цель:** несколько профилей на одном устройстве

- [ ] Profile manager UI
- [ ] Создание/переключение/удаление профилей
- [ ] Аватар + имя
- [ ] PIN protection (опционально)
- [ ] Per-profile хранение раскладок и настроек
- [ ] Экран первого запуска (онбординг)

**Deliverable:** можно создать 3 профиля, каждый со своим дашбордом

## Phase 4: Widget Catalog Expansion (2-3 недели)

**Цель:** все «классические» виджеты

- [ ] Climate (термостат)
- [ ] Weather
- [ ] Camera (HLS на iOS, MSE на Android)
- [ ] Media Player
- [ ] Sensor Chart (sparkline + история + интерактивная модалка)
- [ ] Multi-Sensor
- [ ] Light Color (RGB picker)
- [ ] Cover (шторы)
- [ ] Lock
- [ ] Energy
- [ ] Person Presence
- [ ] Map
- [ ] iframe
- [ ] Quick Action (script trigger)
- [ ] Group / Container

**Deliverable:** полный каталог для смарт-дома

## Phase 5: Room Hub Widget (1-2 недели)

**Цель:** хаб-виджет комнаты с возможностью открыть детальную страницу

- [ ] Room Widget (сегодняшний lab room)
- [ ] Page-template для комнаты (детальная)
- [ ] Auto-detection комнат из HA (по `area_id`)
- [ ] Custom rooms (создавать вручную)
- [ ] Drag для добавления entity в комнату

**Deliverable:** можно навигироваться: главная → комната → виджеты в комнате

## Phase 6: Polish & Performance (1 неделя)

- [ ] Skeletons и loading states везде
- [ ] Error boundaries и graceful degradation
- [ ] Lazy loading виджетов (только активной страницы)
- [ ] Service Worker → офлайн-режим
- [ ] Code splitting
- [ ] Image optimization
- [ ] Lighthouse audit ≥ 95

**Deliverable:** всё быстро, плавно, надёжно

## Phase 7: HACS Distribution (1 неделя)

**Цель:** установка через HACS

- [ ] HACS-совместимый манифест (`hacs.json`)
- [ ] Скрипт сборки → static HTML/JS/CSS
- [ ] Документация по установке
- [ ] Описание в HACS репозитории
- [ ] Demo screenshots
- [ ] Tutorial видео (опционально)

**Deliverable:** любой пользователь HA может поставить через HACS в 3 клика

## Phase 8: Advanced Features (постепенно)

- [ ] OAuth flow с HA
- [ ] Sync через `frontend_storage`
- [ ] Кастомные темы через UI
- [ ] Кастомные иконки через URL
- [ ] Custom widgets API (для разработчиков)
- [ ] Webhook trigger widget
- [ ] Calendar widget (HA calendar integration)
- [ ] Notification feed widget
- [ ] Push notifications (через web-push)
- [ ] Voice control (через Whisper API)

## Phase 9: Public release (1-2 недели)

- [ ] Сайт-лендинг (Vercel)
- [ ] Demo-instance с примерами
- [ ] HA Community Forum пост
- [ ] Reddit /r/homeassistant пост
- [ ] Twitter/X запуск
- [ ] Issue templates
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md

## Реалистичная оценка

При работе **в режиме «вечером после основной работы»** — все Phase 0-7 займут **2-3 месяца**. Если делать активнее (по выходным + будням) — **1-1.5 месяца**.

Phase 8-9 — постепенно, в режиме «по фиче в неделю» после первого релиза.

## Критерии готовности к v1.0

- [ ] Все 10+ базовых виджетов работают и адаптивны
- [ ] 100% покрытие mobile (iPhone SE минимум)
- [ ] PWA install
- [ ] Multi-user (3+ профиля)
- [ ] Несколько страниц с dock-навигацией
- [ ] Темы dark/light
- [ ] HACS install работает
- [ ] Lighthouse ≥ 95
- [ ] Без багов на тестовом устройстве пользователя 2 недели подряд
