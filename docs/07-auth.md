# 07 · Подключение к Home Assistant

## Опции подключения

Glance поддерживает **два режима** подключения к HA:

1. **Token-based** (MVP) — пользователь вводит URL HA + Long-Lived Access Token
2. **OAuth** (v1+) — пользователь жмёт «Sign in with Home Assistant» → редирект → авторизация → возвращается с токеном

## Token-based (MVP)

### Сценарий

1. При первом запуске → экран **«Подключим к Home Assistant»**
2. Поля ввода:
   - URL HA: `http://homeassistant.local:8123` (есть auto-discover через mDNS если возможно)
   - Token: «как создать?» — кнопка показывает короткий мануал со скриншотами
3. Жмёт **«Подключить»** → попытка ws-соединения
4. Успех → переход в дашборд
5. Ошибка → понятное сообщение (CORS, неверный токен, недоступен сервер)

### Создание токена в HA — мануал в UI

Показываем шаги:
> 1. Открой свой HA → клик на свой аватар внизу слева
> 2. Прокрути до **Long-lived access tokens**
> 3. Жми **CREATE TOKEN**, назови «Glance»
> 4. Скопируй токен и вставь сюда

### Хранение токена

Токен хранится в **localStorage** (или **IndexedDB** для шифрованности):
- Никуда не отправляется кроме самого HA
- Никогда не пишется в логи
- В UI показывается замаскированным: `eyJ0eXA...IhV`

## OAuth (v1+)

### Сценарий

1. На экране подключения — две кнопки:
   - «Sign in with Home Assistant»
   - «У меня токен» (для старого режима)
2. Жмёт первую → открывается popup/redirect:
   ```
   https://your-ha.local:8123/auth/authorize?
     client_id=https://glance.app
     &redirect_uri=https://glance.app/auth/callback
     &state=...
   ```
3. HA показывает свой login (если ещё не залогинен) и спрашивает разрешение
4. После одобрения → возврат с `code` → обмен на access+refresh tokens
5. Glance сохраняет токены и подключается

### Преимущества OAuth

- Не нужно создавать токен руками
- Токен автоматически обновляется (refresh_token)
- Связка с HA-юзером (для multi-user логики)
- Можно отозвать в HA (Settings → People → Sessions)

### Технические детали

- Стандартный OAuth 2.0 Authorization Code Flow with PKCE (для SPA)
- `client_id` — публичный URL Glance (HA так это принимает)
- Redirect URL — public origin Glance instance

## CORS

Если Glance работает с **другого домена** чем HA (например, glance.example.com vs ha.example.com), HA должен разрешить CORS:

```yaml
# configuration.yaml
http:
  cors_allowed_origins:
    - https://glance.example.com
```

⚠️ Это противоречит нашему «no HA changes» принципу. Поэтому:
- **Рекомендуемая схема**: Glance ставится на тот же сервер что HA (через HACS или addon-store) → same-origin → CORS не нужен
- **Альтернатива**: Glance ставится на отдельный сервер → нужно добавить CORS

В UI настроек предупреждаем об этом, если URL и origin Glance не совпадают.

## HACS / Addon installation

Когда Glance ставится через HACS:
- Появляется в HA как отдельный URL: `https://your-ha.local:8123/local/glance/index.html` (или своё route через `frontend_panel_register`)
- Авторизация автоматически — HA уже знает кто пользователь
- В качестве URL используется `same-origin` — относительные пути

При standalone установке (на отдельном сервере) — нужны URL+token (или OAuth).

## Прокси-режим (для совместимости)

Если пользователь не хочет настраивать CORS, можно использовать **встроенный прокси**:
- Glance ставит свой backend (Next.js API route)
- Backend проксирует все WS/REST в HA
- Браузер общается только с Glance backend

Это сложнее (нужен backend), но даёт максимум совместимости. По умолчанию выключено, опционально включается.

## Безопасность

- Glance **никогда** не передаёт токен на свои сервера (нет «своих серверов» — это open-source панель)
- Все вызовы — напрямую client → HA
- При подозрительной активности (множественные ошибки 401) — auto-logout с просьбой перевыдать токен
- localStorage — стандартная для веб-приложений практика, но можно усилить через WebCrypto + encrypted IndexedDB (v2)

## Multi-instance

Пользователь может одновременно подключиться к нескольким HA-инстансам:
- Дома основной HA
- На даче — второй HA
- Один Glance, переключатель инстансов в углу

В **MVP** — один инстанс. В **v1** — два-три. В **v2** — n.
