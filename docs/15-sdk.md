# 15 · Homeglance SDK для разработчиков

Homeglance принимает кастомные виджеты — отдельные `.js`-файлы, которые регистрируют новый тип виджета через глобальный SDK. Файл хостится где угодно (GitHub Pages, личный сервер, npm CDN типа jsDelivr) — пользователь добавляет URL в Settings → External widgets.

## Минимальный пример

Создайте `my-clock.js`:

```js
// Подождать пока SDK будет инициализирован — он появляется после загрузки
// первого React-рендера Homeglance.
function init() {
  if (!window.Homeglance) return setTimeout(init, 100);

  const { React, registerWidget, hooks } = window.Homeglance;

  // Виджет — обычный React-компонент. Принимает props.params с типом
  // вашей схемы.
  function ClockWidget({ params }) {
    const [now, setNow] = React.useState(new Date());
    React.useEffect(() => {
      const t = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(t);
    }, []);
    return React.createElement(
      'div',
      { className: 'glass h-full w-full p-4 flex flex-col items-center justify-center' },
      React.createElement('div', { className: 'text-3xl font-light tabular-nums' },
        now.toLocaleTimeString(params.format24h ? 'ru-RU' : 'en-US', {
          hour: '2-digit', minute: '2-digit', second: params.showSeconds ? '2-digit' : undefined,
          hour12: !params.format24h
        })
      ),
    );
  }

  registerWidget({
    meta: {
      type: 'my_clock',                  // должен быть уникальный
      name: 'My Clock',
      emoji: '⏱',
      description: 'Простой таймер с миллисекундной точностью',
      category: 'misc',                  // одна из: lights, switches, sensors, climate, media, cameras, rooms, misc
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 2, h: 2 },
      paramSchema: [
        { key: 'format24h', label: '24-часовой формат', kind: 'boolean', default: true },
        { key: 'showSeconds', label: 'Показывать секунды', kind: 'boolean', default: false },
      ],
    },
    Component: ClockWidget,
  });
}

init();
```

После того как пользователь:

1. Захостит этот файл (например, `https://example.com/my-clock.js`)
2. Откроет Glance → Settings → Внешние виджеты → введёт URL → Добавить
3. Перезагрузит страницу

— виджет появится в каталоге «+ Виджет» под названием «My Clock» и сможет добавляться на любую страницу.

## API глобального объекта

После загрузки Homeglance объявляет `window.Homeglance`:

```ts
interface HomeglanceSDK {
  version: '1';                                     // мажорная версия SDK
  React: typeof React;                              // та же копия React что и у Glance
  registerWidget(entry: WidgetEntry): void;
  hooks: {
    useEntity(entityId?: string): HAState | undefined;
    useStates(): Record<string, HAState>;
    useCallService(): (
      domain: string, service: string, entityId?: string, data?: object
    ) => Promise<void>;
    useConnection(): { client, status, states, isReady, ... };
  };
}
```

### `registerWidget(entry)`

Регистрирует тип виджета. Если такой `meta.type` уже зарегистрирован — будет warning в консоли и старая регистрация перезапишется.

### `hooks.useEntity`

Подписывается на одну сущность HA. Возвращает текущий state или undefined. Перерисовывает компонент только когда меняется state именно этой сущности (не других).

```js
const { useEntity } = window.Homeglance.hooks;
function MyWidget({ params }) {
  const e = useEntity(params.entity);
  return React.createElement('div', null, e?.state ?? '—');
}
```

### `hooks.useCallService`

Возвращает функцию для вызова сервиса HA — например, переключения лампы:

```js
const callService = useCallService();
await callService('light', 'toggle', 'light.bedroom');
```

## WidgetEntry — формат регистрации

```ts
interface WidgetEntry {
  meta: {
    type: string;                       // обязательно уникальный (рекомендация: префикс типа `myorg_clock`)
    name: string;                       // отображаемое имя в каталоге
    emoji: string;                      // эмодзи рядом с именем
    description: string;                // короткое описание
    category: 'lights' | 'switches' | 'sensors' | 'climate' | 'media' | 'cameras' | 'rooms' | 'misc';
    defaultSize: { w: number; h: number };  // размер при добавлении
    minSize: { w: number; h: number };      // минимальный размер при ресайзе
    paramSchema: ParamField[];          // поля настройки (см. ниже)
  };
  Component: React.ComponentType<{ params: Record<string, any> }>;
  computeMinSize?(params): { w: number; h: number };  // динамический minSize
}
```

### ParamField

```ts
interface ParamField {
  key: string;                          // ключ в params
  label: string;                        // подпись в форме
  kind: 'entity' | 'multi-entity' | 'text' | 'number' | 'boolean'
      | 'color' | 'select' | 'multi-select' | 'icon' | 'entity-icons';
  domain?: string;                      // фильтр для kind=entity (например 'light.')
  options?: { value: string; label: string }[];  // для kind=select / multi-select
  required?: boolean;
  default?: any;
  placeholder?: string;
  hint?: string;                        // подсказка под полем
  group?: string;                       // группа полей (несколько в одной — раскладываются вместе)
}
```

## Стилизация

Используйте Tailwind-классы Homeglance — встроенные виджеты тоже на них:

- `glass` — фон-плашка с blur
- `text-text-primary`, `text-text-secondary`, `text-text-tertiary` — иерархия текста
- `text-accent`, `bg-accent/20`, `border-accent/40` — акцент (меняется в Settings)
- `bg-bg-primary`, `bg-bg-secondary` — фоны

Все классы автоматически подстраиваются под dark/light тему.

## Безопасность

- Внешний скрипт выполняется в обычном контексте страницы — он имеет доступ к localStorage, к токену HA и ко всему DOM.
- Подключайте только проверенные источники.
- На стороне Homeglance нет sandbox-изоляции; в перспективе планируется ShadowRealm-режим.

## Версии SDK

- `1` — текущая (Homeglance v0.1.x). API стабилен в рамках 1.x. Breaking-changes — только при `version: '2'`.

## Публикация

Самый простой способ:

1. GitHub Pages: push в репо `username.github.io/my-widget` файла `my-widget.js`. URL: `https://username.github.io/my-widget/my-widget.js`.
2. jsDelivr: если виджет в npm-пакете — `https://cdn.jsdelivr.net/npm/my-widget@1/dist/index.js`.
3. Личный сервер с HTTPS.

Сообщество может публиковать виджеты, открывая PR в основной репозиторий с добавлением в раздел README «Community widgets».
