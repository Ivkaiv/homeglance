# 02 · Архитектура

## Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────────┐
│                  Браузер / iOS PWA                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Виджеты  │ │  Сетка   │ │   Темы   │ │ Профиль  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │   HA Client (WS+REST) │                      │
│              └───────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           │
                  WebSocket + REST
                           │
              ┌────────────▼────────────┐
              │     Home Assistant      │
              │  (только чтение/команды)│
              └─────────────────────────┘
```

Glance — это **single-page React-приложение**, которое работает в браузере или установлено как PWA. Оно подключается к Home Assistant по WebSocket для получения live-данных и REST для команд (вкл/выкл/изменить).

Все настройки и раскладки хранятся **на устройстве пользователя** (localStorage / IndexedDB). Опционально — синхронизация через бэкенд Glance (Next.js API route + JSON-файл) или через HA `frontend_storage`.

## Слои приложения

### 1. Презентация (UI)
- **React 18** + JSX/TSX
- **Tailwind CSS** для стилей с дополнительными CSS-переменными для тем
- **Framer Motion** для анимаций (drag, fade, scale)
- **react-grid-layout** для drag-and-drop сетки
- **Lucide React** + **Material Design Icons (mdi)** для иконок

### 2. Состояние (State)
- **React Context** для глобальных вещей: HA-состояние, настройки, профиль
- **localStorage** для персистентности (config, layouts)
- **IndexedDB** для тяжёлых данных (например, история сенсоров — кэш)

### 3. Данные (Data)
- **HA Client** — единственная точка общения с HA
  - WebSocket для подписки на изменения состояния (`states`)
  - REST для команд (`POST /api/services/{domain}/{service}`)
  - REST для истории (`GET /api/history/period/...`)
- **HA Entity Registry** — кэш списка сущностей с их атрибутами
- **Local storage adapter** — чтение/запись локальных настроек

### 4. Виджет-система
- **Widget Registry** — каталог типов виджетов
- **Widget Component** — каждый виджет реализует `(params) => JSX`
- **Param Schema** — описание полей конфигурации (для UI настроек)
- **Adaptive Sizing** — виджет сам выбирает разметку под размер контейнера

## Ключевые компоненты

### `HAClient`
```ts
class HAClient {
  connect(url: string, token: string): Promise<void>;
  getStates(): Record<EntityId, Entity>;
  subscribe(callback: (states) => void): Unsubscribe;
  callService(domain, service, entity_id, data?): Promise<void>;
  getHistory(entity_ids, hoursBack): Promise<HistoryData>;
  getEntityRegistry(): Promise<EntityRegistry>;
}
```

Один экземпляр, инициализируется при загрузке. Реконнект автоматический. Перетягивает связи через переподписку.

### `WidgetContainer`
```tsx
<WidgetContainer config={widgetConfig}>
  → измеряет реальный размер
  → выбирает tier (tiny/small/medium/large)
  → рендерит соответствующий виджет
</WidgetContainer>
```

### `Dashboard`
```tsx
<Dashboard pageId={pageId}>
  → загружает раскладку текущей страницы
  → рендерит сетку (react-grid-layout)
  → в режиме edit — drag/drop/resize
</Dashboard>
```

### `DockNavigation`
```tsx
<DockNavigation pages={[{id, icon, label}]}>
  → нижний macOS-style dock
  → переключение между страницами
  → анимация выбранной страницы
</DockNavigation>
```

## Потоки данных

### Подписка на состояние
1. На старте приложения `HAClient.connect()`
2. WebSocket подписывается на `state_changed`
3. Инкрементальные обновления применяются к локальному store
4. React-компоненты подписываются на нужные `entity_id` через `useEntity(id)` хук
5. Только реально использованные виджеты ререндерятся при изменении

### Действие пользователя
1. Тап на кнопку света в виджете
2. `callService('light', 'turn_on', 'light.kitchen')`
3. POST к HA REST API
4. HA меняет состояние → шлёт `state_changed` по WS
5. Локальный store обновляется → UI обновляется

### Изменение раскладки
1. Drag в режиме edit
2. `react-grid-layout` зовёт `onLayoutChange`
3. Локальный state обновляется
4. Через debounce (300ms) сохраняется в localStorage
5. Если включена синхронизация — отправляется в backend

## Принципы кода

- **Однонаправленный поток данных** (state → view, события → state)
- **Mutation only через actions** (никаких setState прямо из UI)
- **TypeScript strict mode**
- **Каждый виджет — самостоятельный модуль** (не зависит от других виджетов)
- **Абстракция HA-API** — виджеты не знают про WebSocket, они знают про `useEntity('sensor.x')`

## Производительность

Цели:
- **FCP** (First Contentful Paint) < 1s на 4G
- **TTI** (Time to Interactive) < 2s
- **Bundle size** < 300 KB gzipped (без иконок)
- **60 fps** при анимациях drag/resize/swipe

Способы:
- Code splitting per page (Next.js делает это из коробки)
- Lazy loading виджетов (только активной страницы)
- Memoization (`React.memo`, `useMemo`) для тяжёлых рендеров
- Virtual list для длинных списков сенсоров (если будет)
- Service Worker для офлайн-кэша
