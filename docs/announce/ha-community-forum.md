# 🚀 Homeglance — modern, mobile-first dashboard for Home Assistant (HA Add-on + HACS plugin)

**TL;DR.** Homeglance — это PWA-панель к HA: drag-and-drop виджеты, эффект «жидкого стекла», темы, мульти-пользовательский режим. Ставится как HA Add-on **в один клик**, без LLT-токенов и YAML, — авторизуется автоматически через Supervisor. Альтернатива стандартному Lovelace, не заменяет его. Open source (MIT). Альфа, активная разработка.

[Скриншот: Dashboard на смартфоне]
[Скриншот: Полноэкранный sheet медиа-плеера со свечением обложки]

## Зачем ещё одна панель?

Lovelace всё делает, но настройка через YAML/UI требует времени. Homeglance — другой подход: каждый виджет имеет адаптивный размер (tiny/small/medium/large), drag-and-drop сетку как у iOS, и параметры настраиваются через простой ConfigSheet. Тапы открывают полноэкранные sheet'ы со всеми настройками сущности (color wheel для ламп, расширенное управление термостатом, медиа-контролы с обложкой).

## Что внутри

- **16 виджетов**: свет (с RGB picker), переключатели, замки, шторы (с углом ламелей), климат (со сценариями), медиа-плеер (со sheet и live-обложкой), камеры (HLS), погода (с прогнозом), сенсоры (с историей), календарь, энергопотребление, карта, iframe-embed, webhook-кнопка, лента уведомлений HA, room hub.
- **Мульти-пользовательский**: несколько профилей с PIN, каждый со своей раскладкой.
- **Темы dark/light/auto + accent-цвет**.
- **PWA-install** (Add to Home Screen).
- **HA Ingress zero-config** — автоматическое подключение к HA через Supervisor, токены не нужны.
- **Persistent storage** — настройки переживают рестарты и обновления.

## Установка

### HA OS / Supervised (рекомендуется)

1. **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Добавьте URL: `https://github.com/Ivkaiv/homeglance`
3. Найдите **Homeglance** → Install → Start
4. Откройте через sidebar (Ingress)

### Docker / другой HA

См. [README](https://github.com/Ivkaiv/homeglance) — docker-compose готов.

## Архитектура

Под HA Ingress add-on проксирует WebSocket и REST к HA через **Supervisor token** (server-side), токен HA не покидает контейнер. Это даёт zero-config UX и лучшую security. Подробности — в [ADR 004](https://github.com/Ivkaiv/homeglance/blob/main/agent-state/adr/004-ha-ingress-server-side-proxy.md).

## Что дальше

- Phase 9 — публичный релиз: лендинг, demo-instance, видео.
- Возможные новые виджеты: notification feed (✅), webhook (✅), голосовой ввод через Whisper.

Открыт к обратной связи и contributors — issues и PR welcome.

GitHub: https://github.com/Ivkaiv/homeglance
Лицензия: MIT.
