# 09 · Темы, цвета, иконки

## Темы

### Дефолтные темы

- **Dark** (по умолчанию) — синий/фиолетовый градиент, frosted glass
- **Light** — светлый молочный фон, тёплые акценты, мягкие тени

### Auto

- Следит за `prefers-color-scheme` системы
- При утренних/вечерних переходах сразу меняет тему

### Forced

В настройках можно выбрать явно: Dark / Light / Auto.

## Структура темы

```ts
interface Theme {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    borderSubtle: string;
    borderDefault: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  effects: {
    blur: number;            // backdrop-filter blur в px
    saturate: number;        // backdrop-filter saturate
    glassOpacity: number;    // прозрачность .glass background
  };
  background?: string;       // CSS gradient или цвет
}
```

Тема превращается в CSS-переменные:

```css
:root[data-theme="dark"] {
  --bg-primary: #0a0e1a;
  --text-primary: rgba(255,255,255,0.92);
  --accent: #34d399;
  /* ... */
}
```

## Цвет акцента

В настройках профиля — color picker для акцента. Используется для:
- Активной вкладки в dock
- Подсветки кнопок в фокусе
- Свечения активных переключателей (в дополнение к warm-glow для света)

## Кастомные темы

### v1: пресеты

Несколько готовых пресетов на выбор:
- **Midnight Blue** (default dark)
- **Frosted** (более светлый dark с серебристым)
- **Sunset** (тёплые оттенки)
- **Forest** (зелёные акценты)
- **Cyberpunk** (фиолет + неон)

### v2: пользовательские темы

Тулинг для создания своей темы:
- Color picker для каждой переменной
- Preview справа
- Экспорт в JSON
- Импорт чужой темы по JSON или URL

## Иконки

### Material Design Icons (MDI)

Главный набор. Совместимость с HA:
- Пользователь вводит `mdi:lightbulb-on` — мы рендерим соответствующую SVG
- ~7000 иконок доступно

Реализация:
- Используем библиотеку `@mdi/js` (path-only, tree-shakable)
- Динамический импорт по имени:
  ```ts
  async function loadMdiIcon(name: string): Promise<string> {
    const m = await import(`@mdi/js/mdi${capitalize(toCamelCase(name))}.js`);
    return m.default;
  }
  ```
- Кэшируем загруженные пути в memory

Бандл-размер: оптимально через Vite/Webpack chunk splitting.

### Lucide

Дополняет MDI для UI-чрома (не для HA-сущностей):
- Стрелки, крестики, гамбургер, шестерёнка
- Используется в навигации, конфиг-формах, тулбарах

### Кастомные пакеты

В настройках:
- **URL JSON-файла с иконками**
- Формат:
  ```json
  {
    "my-icon": { "viewBox": "0 0 24 24", "inner": "<path d='...'/>" },
    ...
  }
  ```
- Загружается на старте, кэшируется в IndexedDB
- Виджеты используют `mdi:my-icon` (с префиксом `custom:`?)

Полезно для:
- Иконок специфических устройств бренда
- Ландшафтных дизайнов
- Кастомных эмодзи / эмблем

### Эмодзи

Везде где можно использовать иконку — можно вставить эмодзи (`🏠`, `🌡`). Платформенные эмодзи рендерит сама ОС.

## Размеры иконок

| Контекст | Размер |
|----------|--------|
| Иконка в маленькой кнопке (24-32 px) | 14 px |
| Стандартная иконка кнопки (40-48 px) | 22-26 px |
| Большая иконка карточки (56+ px) | 32 px |
| Иконка в dock (60 px) | 28 px |

## Анимации иконок

Некоторые иконки могут быть **анимированными** (опционально):
- `mdi:loading` → spin
- `mdi:weather-rainy` → лёгкое дрожание капель
- `mdi:fan` → вращение

Реализуется через Framer Motion. Включается per-widget.

## Dark/Light переключение

При смене темы — плавный fade (300ms) всего интерфейса. Иконки и текст плавно меняют цвет. Выглядит магически.

Реализация: CSS `transition: background-color 0.3s, color 0.3s` на root + всех `.glass`.
