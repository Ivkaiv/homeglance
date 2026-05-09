# 14 · Contributing

## Кто может контрибьютить

Любой. Glance — open-source проект под MIT, контрибьюторы welcome.

## Что нужно знать

- **TypeScript** — обязательно
- **React** — обязательно (hooks, контекст, JSX)
- **Tailwind CSS** — для стилей
- **Home Assistant** — общее понимание (entity_id, services, WebSocket API)

Опционально полезно:
- Framer Motion (анимации)
- React Testing Library / Vitest (тесты)
- Playwright (e2e)

## Как начать

1. **Fork** репозитория на GitHub
2. Clone fork локально
3. Установить зависимости: `bun install`
4. Скопировать `.env.example` → `.env.local`, прописать тестовый HA URL и токен
5. Запустить dev-режим: `bun dev`
6. Открыть `http://localhost:3000` → подключиться к HA

## Какие задачи брать

- Issues с лейблом **`good-first-issue`** — для первых вкладов
- **`help-wanted`** — задачи, на которые мейнтейнеры ждут помощи
- **`bug`** — починить баг (надо уметь воспроизвести и исправить)
- **`feature`** — новая функциональность (обсуди в issue заранее)
- Свои идеи — открой issue с `[proposal]`-префиксом, обсудим

## Создание нового виджета

Самый простой способ контрибьютнуть — добавить виджет.

См. [04-widgets.md](04-widgets.md) → **«Как добавить новый виджет»**.

Шаги:
1. Создать `src/components/widgets/<my-widget>/MyWidget.tsx`
2. Создать `src/components/widgets/<my-widget>/index.ts` с metaдаными
3. Зарегистрировать в `src/components/widgets/_registry.ts`
4. Написать unit-тест в `tests/unit/widgets/MyWidget.test.tsx`
5. Skipchot для Storybook
6. Открыть PR

## Стиль кода

### TypeScript
- Strict mode
- Без `any` (используй `unknown` если тип неизвестен)
- Public функции с явным return type

### React
- Functional components only
- Hooks для логики
- `React.memo` для тяжёлых виджетов
- Props через interface

### Стили
- Tailwind utility classes
- CSS-variables для тем
- Никакого `style={{}}` кроме динамических значений (свечения, размеры)

### Файлы
- Один React-компонент = один файл
- Helpers в отдельных модулях
- Имена файлов = имена main-export

## Тесты

Перед PR:
```bash
bun test          # vitest
bun e2e           # playwright
bun lint
bun typecheck
```

CI проверит то же самое.

## Pull Request

### Title

Conventional commit стиль:
- `feat(widgets): add cover widget`
- `fix(client): handle ws reconnect`
- `docs(setup): add HACS install steps`

### Описание

- Что было / что стало
- Why (мотивация)
- Скриншоты (если UI)
- Closes #X (если фиксит issue)

### Размер

Прefer **маленькие PR** — лучше 5 PR по одной фиче, чем 1 большой.

Если PR > 500 строк изменений — обсуди в issue заранее.

## Code Review

- Минимум 1 approval от мейнтейнера
- Все комментарии должны быть resolved
- Тесты должны проходить
- Lint / types / build — green

## Issue templates

При открытии issue — выбери шаблон:
- **Bug Report** — описание + steps + expected/actual + screenshots
- **Feature Request** — что и зачем
- **Widget Proposal** — какой виджет и какие параметры
- **Question** — вопрос (alternatively — Discussions)

## Code of Conduct

Мы следуем [Contributor Covenant](https://www.contributor-covenant.org/). Кратко:
- Будь дружелюбен
- Уважай разные мнения
- Конструктивная критика only
- Никакой токсичности, дискриминации, харассмента

Нарушения → блокировка, доступ закрыт.

## Translation

Glance изначально на **английском** для open-source. Переводы:
- Russian (приоритет, изначальный язык разработки)
- Пользовательские переводы через JSON-файлы в `src/i18n/{lang}/`
- PR с новым языком → автоматически добавляется в селектор языка

## Discussions

Для общих вопросов, идей, обсуждений — GitHub Discussions:
- **Q&A** — спроси что-нибудь
- **Ideas** — поделиться идеей
- **Show and tell** — покажи свой setup
- **General** — болтовня

## Менторинг

Если хочешь стать мейнтейнером — пиши в Discussions. Активным контрибьюторам можем дать commit-rights.

## License Assumption

Контрибьютя в Glance, ты соглашаешься, что твой код будет лицензирован под MIT (как и весь проект).

## Спасибо

Каждый вклад — большой или маленький — ценится. Имена контрибьюторов появляются в `CONTRIBUTORS.md` и на сайте проекта (когда будет).
