# Homeglance

> A modern, mobile-first dashboard for Home Assistant. No YAML, no compromise.

**Homeglance** (внутри приложения — просто **Glance**) — это PWA-панель для Home Assistant, которая работает рядом со стандартным Lovelace, не заменяя его. Цель: дать обычному пользователю опыт уровня iOS-«рабочего стола» — drag-and-drop виджеты, плавные анимации, эффекты «жидкого стекла», темы, многопользовательский режим. Без YAML, без правок HA-конфига.

```
┌────────────────────────────────────────────────────┐
│  Скриншоты добавим в первой публичной альфе.      │
│  Live-инстанс — github.com/Ivkaiv/homeglance#  │
│  demo.                                             │
└────────────────────────────────────────────────────┘
```

## Возможности

- **Drag-and-drop сетка** — плитки можно двигать, ресайзить, удалять
- **15+ виджетов** — свет, переключатели, сенсоры, климат, медиа, камера, шторы, погода, человек, заметки, часы, действия (скрипты/сцены), панели управления, хабы комнат
- **Несколько страниц** с dock-bar внизу — переключение свайпом
- **Multi-user** — несколько профилей с PIN-защитой, каждый со своей раскладкой
- **PWA** — устанавливается как нативное приложение на iOS, Android, desktop
- **Темы dark / light / auto** — следуют системе
- **Подключение к HA через WebSocket** — никаких изменений в HA-конфиге

## Установка

Четыре пути в зависимости от типа вашего HA.

### 1. HA Add-on (для HA OS / Supervised — самый простой)

Если у вас Home Assistant OS или Home Assistant Supervised — это самый простой путь. HA сам поднимет Homeglance-сервер и будет им управлять.

1. **Settings** → **Add-ons** → **Add-on Store** → ⋮ (три точки) → **Repositories**
2. Добавить URL `https://github.com/Ivkaiv/homeglance` → **Add**
3. Найти **Homeglance** → **Install** → **Start**
4. В боковой панели HA появится **Homeglance** — открыть.

**Zero-config авторизация.** Под HA Ingress add-on автоматически
подключается к HA через `SUPERVISOR_TOKEN` — никаких токенов вручную
создавать не нужно. WS- и REST-запросы к HA проксируются server-side,
токен не покидает контейнер. Архитектура описана в
[ADR 004](agent-state/adr/004-ha-ingress-server-side-proxy.md).

**Persistent storage.** Профили, виджеты, темы хранятся в `/data` mount,
который Supervisor сохраняет между рестартами, обновлениями и
переустановками add-on'а. На любой версии HA Supervisor.

Подробнее: [`homeglance-addon/README.md`](homeglance-addon/README.md).

### 2. HACS plugin (иконка в сайдбаре HA)

Сам по себе не запускает сервер — это iframe-обёртка для уже запущенного Homeglance (Add-on или Docker). После установки Glance появляется в боковой панели HA как нативный пункт меню.

1. В HACS → Frontend → Custom repositories → добавить `https://github.com/Ivkaiv/homeglance`, тип **Plugin**
2. Найти **Homeglance** → Install
3. Добавить в `configuration.yaml`:
   ```yaml
   panel_custom:
     - name: homeglance-panel
       sidebar_title: Homeglance
       sidebar_icon: mdi:view-dashboard-variant
       url_path: homeglance
       module_url: /hacsfiles/homeglance/homeglance.js
       config:
         url: "http://homeassistant.local:3040"
   ```
4. Перезагрузить HA → в боковой панели появится **Homeglance**

> **Важно:** HACS plugin требует, чтобы где-то был запущен Homeglance-сервер — Add-on (1) или Docker (3).

### 3. Docker / Docker Compose (любой HA-сценарий)

Подходит для HA Container, HA Core или для вынесения панели на отдельный сервер.

```yaml
# docker-compose.yml
services:
  homeglance:
    image: ghcr.io/ivkaiv/homeglance:latest
    container_name: homeglance
    restart: unless-stopped
    ports:
      - "3040:3040"
    volumes:
      - homeglance-data:/app/data

volumes:
  homeglance-data:
```

Запуск:

```bash
docker compose up -d
```

Открыть `http://server-ip:3040`, ввести URL HA и Long-Lived Access Token, готово.

### 4. Локальный запуск из исходников (для разработки)

```bash
git clone https://github.com/Ivkaiv/homeglance.git
cd homeglance
bun install
bun dev
```

Открыть `http://localhost:3040`.

## Подключение к Home Assistant

При первом запуске Homeglance спросит:

1. **URL Home Assistant** — например `http://192.168.1.10:8123` или `https://ha.example.com`
2. **Long-Lived Access Token** — создать в HA Profile → Security → Long-Lived Access Tokens

Токен хранится локально (на сервере Homeglance в `data/connection.json`, если используется server-storage; либо в localStorage браузера).

## Конфигурация

Все настройки — через UI. По умолчанию никакие env-vars не нужны. Если хочется переопределить:

| Переменная                | По умолчанию | Описание                                     |
|---------------------------|--------------|----------------------------------------------|
| `PORT`                    | `3040`       | Порт сервера                                 |
| `NEXT_TELEMETRY_DISABLED` | `1`          | Отключить телеметрию Next.js                 |

См. `.env.example`.

## Документация

Полная архитектурная документация — в директории [`docs/`](docs/):

- [Vision & Philosophy](docs/01-vision.md)
- [Architecture](docs/02-architecture.md)
- [Visual Design](docs/03-design.md)
- [Widget System](docs/04-widgets.md)
- [Pages & Navigation](docs/05-navigation.md)
- [Multi-user](docs/06-multi-user.md)
- [Authentication](docs/07-auth.md)
- [Storage & Sync](docs/08-storage.md)
- [Theming](docs/09-theming.md)
- [Roadmap](docs/10-roadmap.md)
- [Tech Stack](docs/11-stack.md)
- [Repository Layout](docs/12-repo.md)
- [HACS Distribution](docs/13-hacs.md)
- [Contributing](docs/14-contributing.md)
- [HACS Plugin](docs/16-hacs-plugin.md)

## Технологии

- **Next.js 14** (App Router, standalone build)
- **React 18** + **TypeScript** strict
- **Tailwind CSS 4**
- **Framer Motion** — анимации
- **react-grid-layout** — drag/drop
- **Bun** — пакетный менеджер и runtime для разработки

## Статус

**Alpha.** Работает у автора в продакшене несколько недель, но публичных пользователей пока нет. До v1.0:

- [x] Phase 0–5 — foundation, layout, multi-page, multi-user, виджеты, room hub
- [x] Phase 6 — error boundaries, skeletons, code-split (-22× initial bundle), Lighthouse a11y/best/seo = 100
- [ ] Phase 7 — публикация на GitHub, HACS plugin, Docker
- [ ] Phase 8+ — i18n (en/ru), экспорт раскладок, push-уведомления, кастомные виджеты

См. [Roadmap](docs/10-roadmap.md).

## Contributing

Любые вклады welcome. Перед PR прочитайте [CONTRIBUTING.md](CONTRIBUTING.md) и [Code of Conduct](CODE_OF_CONDUCT.md).

Если хотите добавить новый виджет — это самый простой способ контрибьютнуть, см. [docs/04-widgets.md](docs/04-widgets.md).

## License

[MIT](LICENSE) — стандарт для HA-экосистемы.
