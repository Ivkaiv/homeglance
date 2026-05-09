# 12 · Структура репозитория

## Корневая структура

```
glance/
├── README.md                  # Hero + быстрый старт
├── LICENSE                    # MIT
├── CHANGELOG.md               # хронология релизов
├── CONTRIBUTING.md            # для контрибьюторов
├── CODE_OF_CONDUCT.md         # стандартный CoC
├── package.json               # bun deps + scripts
├── bun.lockb                  # lockfile
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
├── next.config.js             # Next.js config
├── .env.example               # шаблон env
├── .gitignore
├── .github/
│   ├── workflows/             # GitHub Actions CI
│   ├── ISSUE_TEMPLATE/        # шаблоны issues
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/                      # вся документация
│   ├── 01-vision.md
│   ├── 02-architecture.md
│   ├── ...
│   └── images/
│
├── src/                       # код приложения
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # / → дашборд
│   │   ├── p/[id]/page.tsx         # /p/{id} → конкретная страница
│   │   ├── settings/page.tsx       # /settings
│   │   ├── profile/page.tsx        # /profile (выбор/создание)
│   │   ├── onboarding/page.tsx     # /onboarding (первый запуск)
│   │   └── auth/callback/page.tsx  # OAuth callback
│   │
│   ├── components/            # React компоненты
│   │   ├── ui/                # базовые: Button, Input, Modal
│   │   ├── layout/            # Dashboard, DockBar, Header
│   │   ├── widgets/           # каталог виджетов
│   │   │   ├── _registry.ts   # WidgetRegistry
│   │   │   ├── _container.tsx # WidgetContainer (sizing)
│   │   │   ├── light/
│   │   │   ├── sensor/
│   │   │   ├── room/
│   │   │   └── ...
│   │   ├── editor/            # ConfigSheet, AddWidgetSheet, RoomManagerSheet
│   │   └── auth/              # OAuth/Token forms, ProfilePicker
│   │
│   ├── lib/                   # бизнес-логика
│   │   ├── ha/
│   │   │   ├── client.ts      # HAClient class
│   │   │   ├── types.ts       # Entity, Service, etc.
│   │   │   ├── hooks.ts       # useEntity, useStates, useHistory
│   │   │   └── icons.ts       # MDI loader
│   │   ├── storage/
│   │   │   ├── profiles.ts
│   │   │   ├── pages.ts
│   │   │   ├── settings.ts
│   │   │   └── migrations.ts
│   │   ├── widget/
│   │   │   ├── types.ts       # WidgetMeta, WidgetConfig, ParamField
│   │   │   ├── registry.ts    # API: register(), get(), list()
│   │   │   └── adapter.ts     # adaptive sizing helper
│   │   ├── theme/
│   │   │   ├── themes.ts      # preset themes
│   │   │   └── apply.ts       # CSS-var injection
│   │   └── utils/
│   │
│   ├── styles/
│   │   └── globals.css        # tailwind + base CSS-variables
│   │
│   └── types/                 # глобальные типы
│       └── index.ts
│
├── public/                    # статика
│   ├── icons/                 # PWA icons
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # service worker
│   └── og-image.png           # social preview
│
├── tests/
│   ├── unit/                  # Vitest
│   ├── e2e/                   # Playwright
│   └── fixtures/              # mock HA data
│
└── scripts/                   # утилиты
    ├── build-hacs.ts          # сборка для HACS distribution
    └── migrate-from-lovelace.ts  # (v2+) импорт raw Lovelace yaml
```

## Зачем такая структура

- **`src/`** отделяет код от конфигов — чисто для GitHub-навигации
- **`docs/`** в корне — стандарт для open-source
- **`components/widgets/`** — каждый виджет в своей папке (легко найти, легко удалить, легко добавить)
- **`lib/`** — чистая логика без React (тестируемо)
- **`tests/`** на верхнем уровне — стандарт для нагляднсти

## Конвенции имён

- React components: **`PascalCase.tsx`** (`SensorWidget.tsx`)
- Hooks: **`useCamelCase.ts`** (`useEntity.ts`)
- Utility modules: **`kebab-case.ts`** (`load-mdi-icon.ts`)
- Types: **`PascalCase`** в коде, имя файла **`types.ts`**
- Storage keys: `glance:domain:key:version`
- CSS-classes (Tailwind): kebab-case as usual

## Конвенция git

- **Branch naming**: `feat/widget-cover`, `fix/sensor-overflow`, `docs/setup`
- **Commit message**:
  - `feat(widgets): add cover widget`
  - `fix(sensor): handle unavailable state`
  - `docs(readme): update install instructions`
  - `refactor(storage): extract migrations`
- **PR title** = повторяет первый коммит
- **PR body** должен иметь:
  - Что было / что стало
  - Скриншот (если UI)
  - Ссылка на issue

## CI / Branch Protection

Main:
- Требует PR
- Требует passing CI (lint + types + tests + build)
- Требует 1 ревью (когда появятся ревьюверы)

Develop ветка — нет (работаем на main с feature-ветками).

## Releases

- Семантическое версионирование: `MAJOR.MINOR.PATCH`
- Tags: `v0.1.0`, `v1.0.0`
- GitHub Releases с CHANGELOG-извлечением
- Автоматический билд → публикация в HACS на каждый release
