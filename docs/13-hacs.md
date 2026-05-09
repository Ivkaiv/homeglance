# 13 · Дистрибуция через HACS

## Что такое HACS

[HACS (Home Assistant Community Store)](https://hacs.xyz/) — community-driven магазин расширений для Home Assistant. Через него ставится 95% популярных кастомных интеграций и Lovelace-карточек.

## Тип репозитория для Glance

HACS поддерживает несколько типов:
- **integration** — Python-интеграция
- **plugin** — Lovelace-карточка (JS-файл)
- **theme** — YAML-тема
- **frontend** — UI-расширение (новое в HACS, для целых приложений)

Glance подходит под **frontend** или **plugin** — нужно посмотреть текущее состояние HACS на момент релиза. Скорее всего pojедет как **plugin** с одним JS-bundle, который HA загружает как panel.

## Как HA подгружает Glance

В HA есть API `frontend_panel_register`. После установки через HACS, Glance регистрирует себя как боковую панель:

```yaml
# (генерируется автоматически HACS, никаких ручных правок)
panel_custom:
  - name: glance-panel
    sidebar_title: Glance
    sidebar_icon: mdi:view-dashboard
    url_path: glance
    module_url: /hacsfiles/glance/glance.js
    require_admin: false
```

Пользователь в сайдбаре HA видит **Glance** как пункт меню. Кликает → открывается полноэкранное приложение.

## Авторизация

Когда Glance работает как panel внутри HA:
- HA уже знает кто пользователь (cookie сессии)
- Glance запрашивает токен через HA WebSocket API: `auth/long_lived_access_token`
- Токен живёт на устройстве, привязан к юзеру

Это даёт **бесшовный multi-user** — каждый HA-юзер автоматически имеет свой профиль в Glance.

## Структура файлов для HACS

Корень репозитория должен иметь:

```
hacs.json
README.md
glance.js  ← билд (gen via build-hacs.ts)
```

`hacs.json`:
```json
{
  "name": "Glance",
  "render_readme": true,
  "filename": "glance.js",
  "homeassistant": "2024.1.0",
  "country": ["all"]
}
```

## Скрипт сборки

`scripts/build-hacs.ts` собирает Next.js в один JS-файл:
1. `next build` → static HTML/JS/CSS
2. Inline всё в один JS-bundle
3. Минификация
4. Создаёт `glance.js` в корне

## Релиз-процесс

1. Bump version в `package.json` и `hacs.json`
2. Обновить `CHANGELOG.md`
3. Push tag `v0.1.0`
4. GitHub Action собирает и создаёт GitHub Release с `glance.js`
5. HACS автоматически замечает новый release (через GitHub API)
6. Пользователи видят в HACS: **«Glance v0.1.0 → Update»**

## Установка для пользователя

1. Открывает HACS в HA (или ставит HACS если ещё нет)
2. **Frontend → Custom repositories** → добавляет `github.com/glance-app/glance`
3. **Install**
4. HA перезапускается (HACS подсказывает)
5. В сайдбаре появляется **Glance**
6. Открывает → видит дашборд

## Standalone установка (вне HACS)

Для тех, кто хочет ставить вручную или на отдельный сервер:

1. Скачать `glance.js` с GitHub Release
2. Положить в `<config>/www/glance/`
3. Добавить в `configuration.yaml`:
   ```yaml
   panel_custom:
     - name: glance
       url_path: glance
       module_url: /local/glance/glance.js
   ```
4. Перезапустить HA

ИЛИ:

1. Развернуть Glance как Next.js на отдельном сервере (Vercel/Netlify/own)
2. Открыть Glance URL
3. Ввести HA URL + token (как описано в [07-auth](07-auth.md))

## Документация для HACS

В корне репозитория `README.md` должен быть:
- Hero (логотип + tagline)
- Скриншоты
- «Зачем это»
- «Как установить»
- «Поддерживаемые виджеты»
- «Лицензия»

HACS автоматически рендерит `README.md` на странице установки.

## Маркетинг внутри HACS

- Высококачественные **скриншоты** (Glance vs Lovelace, до/после)
- Короткое **demo-видео** (15 секунд) — drag, switch theme, навигация
- Понятное **описание** в одну строку: *«Современный mobile-first dashboard для HA»*

## Ограничения HACS-pannel

- Размер бандла **рекомендуется < 5 МБ** (наш cel ~250 KB — отлично)
- Должна работать в iframe HA (без «top-level navigation»)
- Может использовать только public HA APIs (что нам и надо)

## Roadmap для HACS

- **Phase 7 (по roadmap)** — публикация alpha-версии
- **v1.0** — submit в Default HACS Store (не нужно добавлять как custom repo, видно всем сразу)

Для попадания в Default Store:
- Минимум 50 stars на GitHub
- 6 месяцев активной поддержки
- Одобрение HACS-команды

Так что план: сначала Custom repo (быстро), потом Default (через 6+ месяцев).
