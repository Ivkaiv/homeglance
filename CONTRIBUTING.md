# Contributing to Homeglance

Спасибо, что хотите помочь! Homeglance — open-source проект под MIT, контрибьюторы welcome.

## Стек

- **TypeScript** strict
- **React 18** (functional components, hooks)
- **Tailwind CSS 4**
- **Bun** (пакетный менеджер и runtime для разработки)
- **Next.js 14** App Router

## Как начать

1. **Fork** репозитория на GitHub
2. Clone fork локально: `git clone https://github.com/<your-username>/homeglance`
3. Установить зависимости: `bun install`
4. Скопировать `.env.example` → `.env.local`
5. Запустить dev-режим: `bun dev`
6. Открыть `http://localhost:3040` → подключиться к HA
7. Создать ветку: `git checkout -b feat/my-feature`

## Какие задачи брать

- Issues с лейблом **`good-first-issue`** — простые, для первых вкладов
- **`help-wanted`** — задачи, на которые мейнтейнеры ждут помощи
- **`bug`** — починить баг (надо уметь воспроизвести и исправить)
- **`feature`** — новая функциональность (обсудите в issue заранее)
- Свои идеи — открой issue с `[proposal]`-префиксом, обсудим

## Создание нового виджета

Самый простой способ контрибьютнуть.

1. Создать `src/components/widgets/MyWidget.tsx` с named export `MyWidget` (компонент)
2. Добавить `MY_WIDGET_META: WidgetMeta` в `src/components/widgets/meta.ts`
3. Зарегистрировать в `src/components/widgets/index.tsx` (lazy через `next/dynamic`)
4. Открыть PR со скриншотом

Подробнее в [docs/04-widgets.md](docs/04-widgets.md).

## Стиль кода

### TypeScript

- Strict mode включён
- Без `any` (используйте `unknown` если тип неизвестен; `any` допустим только в реестре виджетов где диспетчеризация рантайм)
- Public функции с явным return type

### React

- Functional components only
- Hooks для логики
- `React.memo` для тяжёлых виджетов
- Props через interface

### Стили

- Tailwind utility classes
- CSS-variables для тем (`bg-bg-primary`, `text-text-primary`, `accent` и т.п.)
- `style={{}}` только для динамических значений (свечения, размеры)

### Файлы

- Один React-компонент = один файл
- Helpers в отдельных модулях
- Имена файлов = имена main-export

## Перед PR

```bash
bun typecheck  # tsc --noEmit
bun run build  # production build должен пройти
```

(Тесты появятся позже — пока их нет, проверка живая в браузере.)

## Pull Request

### Title

[Conventional commits](https://www.conventionalcommits.org/):

- `feat(widgets): add cover widget`
- `fix(client): handle ws reconnect`
- `docs(setup): add HACS install steps`
- `refactor(storage): extract migrations`
- `perf(bundle): code-split widget catalog`

### Body

- **Что было / что стало**
- **Why** (мотивация)
- Скриншоты (если UI)
- `Closes #X` (если фиксит issue)

### Размер

Предпочитаем **маленькие PR** — лучше 5 PR по одной фиче, чем 1 большой. Если PR > 500 строк — обсудите в issue заранее.

## Code Review

- Минимум 1 approval от мейнтейнера
- Все комментарии должны быть resolved
- typecheck / build — green

## Code of Conduct

См. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Кратко: будь дружелюбен, конструктивная критика only, без токсичности и дискриминации.

## License

Контрибьютя в Homeglance, ты соглашаешься, что твой код будет лицензирован под [MIT](LICENSE).
