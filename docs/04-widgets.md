# 04 · Виджет-система

## Концепция

Каждый виджет — **независимый плагин** с:
- Уникальным `type` (например, `light`, `sensor`, `weather`)
- Списком **параметров** (которые пользователь настраивает)
- **Размером по умолчанию** и минимальным
- **Адаптивной разметкой** — умеет ужаться до иконки и развернуться

Виджеты регистрируются в `WidgetRegistry`. Чтобы добавить новый тип, достаточно создать файл, экспортировать компонент и добавить в реестр.

## Размер и адаптивность

Каждый виджет получает контейнер фиксированного размера. Внутри сам выбирает разметку:

| Tier | Условие | Что показывать |
|------|---------|----------------|
| **tiny** | width < 80 px ИЛИ height < 70 | только иконка/эмодзи |
| **small** | площадь < 14000 ИЛИ width < 140 | иконка + основное значение |
| **medium** | площадь < 28000 ИЛИ width < 220 | иконка + название + значение |
| **large** | всё больше | полная карточка с метаданными |

Реализуется через хук `useWidgetSize()` + helper `sizeTier(size)`.

## API виджета

```ts
interface WidgetMeta {
  type: string;                   // 'light_toggle'
  name: string;                   // 'Кнопка света'
  emoji: string;                  // '💡'
  description: string;            // показывается в каталоге
  category: WidgetCategory;       // 'lights' | 'sensors' | 'climate' | ...
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  paramSchema: ParamField[];      // что пользователь настраивает
}

interface ParamField {
  key: string;
  label: string;
  kind: 'entity' | 'multi-entity' | 'text' | 'number' | 'boolean'
      | 'color' | 'icon' | 'select' | 'enum';
  domain?: string;                // для entity-полей: 'sensor.', 'light.'
  options?: { value: string; label: string }[];  // для select
  required?: boolean;
  default?: any;
  validate?: (v: any) => string | null;
}

interface WidgetComponent<P = any> {
  (props: { params: P }): JSX.Element;
}
```

## Каталог виджетов (MVP → v1)

### MVP (то, без чего нельзя жить)

| Виджет | Категория | Описание |
|--------|-----------|----------|
| **Light Toggle** | lights | Лампа: вкл/выкл, яркость через долгий тап |
| **Switch Toggle** | switches | Розетка / реле |
| **Sensor Value** | sensors | Любой `sensor.*` — число + единица |
| **Climate** | climate | Термостат: текущая, задание, режим |
| **Weather** | weather | Погода: иконка, температура, состояние |
| **Room** | rooms | Хаб комнаты: лампы, переключатели, температура, ссылка на детальную |
| **Camera** | cameras | Live-стрим (HLS на iOS, MSE на Android) |
| **Media Player** | media | Плеер: обложка, play/pause, громкость |
| **Time / Clock** | misc | Часы + дата |
| **Quick Action** | actions | Шорткат на скрипт/автоматизацию HA |

### v1 (всё «классическое» что есть в смарт-доме)

| Виджет | Категория | Описание |
|--------|-----------|----------|
| **Sensor Chart** | sensors | Sparkline + история, тап → большое окно |
| **Multi-Sensor** | sensors | Несколько сенсоров в одной карточке |
| **Light Color** | lights | Колесо цвета RGB |
| **Energy** | energy | Потребление: текущее + график за день/месяц |
| **Cover** | covers | Шторы/жалюзи: открыть/закрыть/процент |
| **Lock** | locks | Замок: статус + кнопка |
| **Vacuum** | vacuums | Робот-пылесос: статус, старт/стоп, карта |
| **Person Presence** | persons | Кто дома (иконка + статус) |
| **Map** | misc | Карта с маркерами устройств |
| **iframe** | misc | Любая веб-страница |
| **Notes** | misc | Заметка / стикер с произвольным текстом |
| **Group** | grouping | Контейнер для других виджетов с заголовком |

### v2+ (расширения)

- **Calendar** — события из HA-календаря
- **Notifications** — лента уведомлений HA
- **Webhook trigger** — кнопка для триггера webhook
- **Custom card** — для контрибьюторов сделать свой виджет

## Категории и каталог

Виджеты группируются по категориям, в UI «Добавить виджет» отображаются с табами:

```
[ Все ] [ Свет ] [ Сенсоры ] [ Климат ] [ Камеры ] [ Медиа ] [ Прочее ]
```

## Жизненный цикл виджета

1. **Регистрация** — в `WidgetRegistry`
2. **Каталог** — пользователь выбирает в «+ Виджет»
3. **Создание экземпляра** — генерируется `i: string` (uuid), дефолтные `params`
4. **Конфигурация** — открывается ConfigSheet, пользователь заполняет
5. **Рендер** — `<WidgetContainer>` подбирает tier и рендерит компонент
6. **Интерактив** — виджет может звать `callService()`
7. **Удаление** — крестик в режиме edit

## Как добавить новый виджет (для разработчика)

```tsx
// widgets/MyWidget.tsx
'use client';
import { useEntity, callService } from '@glance/sdk';
import { useWidgetSize, sizeTier } from '@glance/ui';

interface Params { entity: string; label?: string; }

export function MyWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  // ... render based on tier
}

// widgets/index.ts
export const myWidget = {
  meta: {
    type: 'my_widget',
    name: 'My Widget',
    emoji: '✨',
    category: 'misc',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    paramSchema: [
      { key: 'entity', label: 'Сенсор', kind: 'entity', domain: 'sensor.', required: true },
      { key: 'label', label: 'Подпись', kind: 'text' },
    ],
  },
  Component: MyWidget,
};
```

## Состояние виджета

Виджеты должны быть **stateless по конфигу**, но могут иметь локальный UI-state (открыто/закрыто меню, hover). Конфиг приходит через `params` пропс и обновляется через ConfigSheet.

Любая мутация HA-данных — через `callService()`. Никаких локальных «оптимистичных обновлений» — всегда ждём от HA подтверждения по WS.

Для длинных операций (запрос истории) — внутренний loading state, скелетон.

## Тестирование

Каждый виджет ✓ скриншот-тест в Storybook ✓ unit-тест на ключевые состояния (loading / error / unavailable / on / off).
