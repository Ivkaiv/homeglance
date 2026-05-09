# 08 · Хранение и синхронизация

## Что хранится

| Данные | Где | Формат |
|--------|-----|--------|
| Профили пользователей | localStorage | JSON |
| Активный профиль ID | localStorage | string |
| Раскладки страниц | localStorage (под профилем) | JSON |
| Настройки UI (темы, цвет) | localStorage (под профилем) | JSON |
| Кастомные комнаты | localStorage (под профилем) | JSON |
| HA URL + токен | localStorage (глобально) | JSON |
| Кэш истории сенсоров | IndexedDB | JSON-blob |
| Иконки кастомного пакета | IndexedDB | JSON |

## Структура localStorage

```
glance:settings              → { haUrl, haToken, theme, ... }    (global)
glance:profiles              → Profile[]                          (global)
glance:active-profile        → "profile-uuid"                     (global)
glance:profile:{id}:pages    → Page[]                             (per-profile)
glance:profile:{id}:rooms    → CustomRoom[]                       (per-profile)
glance:profile:{id}:prefs    → UserPreferences                    (per-profile)
```

## Версионирование

Каждый storage-слот имеет версию: `glance:profiles:v1`, `glance:profile:{id}:pages:v1`. При major-релизе — мигратор:

```ts
function migrate(oldData, fromVersion, toVersion) {
  // ...
}
```

## Синхронизация (план)

### MVP: нет синхронизации

Раскладка живёт на устройстве. Чтобы перенести — экспортировать.

### v1: Export / Import

**Export** — кнопка в настройках:
1. Выгружает текущий профиль в JSON
2. Кнопки:
   - «Скачать файл» (download)
   - «Скопировать» (clipboard)
   - «Показать QR» (для сканирования с другого устройства)

**Import** — кнопка:
1. Загрузить JSON-файл
2. Или вставить из буфера
3. Или сканировать QR

Можно мерджить (добавить страницы) или заменить весь профиль.

### v1.5: Sync через HA frontend storage

HA имеет встроенный механизм `frontend_storage`:
```
POST /api/frontend/{key}  → save
GET  /api/frontend/{key}  → load
```

Glance может использовать его для синхронизации между устройствами одного HA-юзера. Это **не нарушает** «no HA changes» — это публичный API.

Включается опционально в настройках:
> ☐ Синхронизировать раскладку с Home Assistant

При включении — все изменения на устройстве А мгновенно появляются на устройстве Б.

### v2: Real-time collaborative

- WebSocket-подписка на изменения раскладки в HA frontend storage
- Изменения мгновенно отображаются на всех устройствах
- Conflict resolution (last-write-wins или manual merge)

## Кэширование

### Список сущностей HA
- Загружается один раз при коннекте
- Кэшируется в memory + IndexedDB
- Обновляется по `entity_registry_updated` событию WS

### История сенсоров
- TTL: 5 минут (потом перезагружаем)
- Хранится в IndexedDB по ключу `entity_id:hours`
- При оффлайне — отдаём кэшированные данные с пометкой «устарело»

### Иконки
- Material Design Icons — встроены в bundle (через icon-font или SVG sprite)
- Кастомные пакеты — IndexedDB

## Бэкап / Восстановление

В настройках:
- **Создать бэкап** → JSON всех профилей + глобальных настроек
- **Восстановить из бэкапа** → выбор файла → подтверждение → перезагрузка

Авто-бэкап раз в неделю в IndexedDB (последние 4 версии). Из них можно откатиться.

## Удаление данных

Кнопка «Очистить все данные Glance» в настройках:
- Удаляет всё из localStorage и IndexedDB
- Возвращает к экрану первого запуска

Также «Удалить мой профиль» — удаляет только текущий, оставляет остальные.

## Privacy

- **Никаких данных не уходит** на сервера Glance (их нет — Glance это open-source панель)
- HA URL/токен — только в браузере, отправляется только в указанный HA
- Аналитика — нет (или строго opt-in с PostHog/Plausible self-hosted)
- Crash reports — opt-in (sentry)
