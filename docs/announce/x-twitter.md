# X / Twitter — варианты тредов

## Короткий пост (280 символов)

🏠 Homeglance — современная PWA-панель для Home Assistant.
Drag-and-drop виджеты, RGB-управление светом с color wheel, медиа-плеер с обложкой, мульти-юзер с PIN.
HA Add-on c zero-config — без токенов и YAML.
MIT, alpha.
https://github.com/Ivkaiv/homeglance

## Тред (4-5 постов)

**1/5** Шесть месяцев пилил Homeglance — PWA-дашборд для Home Assistant, который ставится как HA Add-on в один клик. Drag-and-drop, glassmorphism, темы, мульти-юзер. Открытый код (MIT), alpha. 🧵

**2/5** Killer feature — zero-config авторизация. Add-on проксирует WS/REST к HA через Supervisor токен server-side. Никаких Long-Lived Token'ов копировать не нужно, токен HA не покидает контейнер.

**3/5** 16 виджетов: свет (с RGB color wheel), замки, шторы с tilt, климат, медиа-плеер с полноэкранным sheet'ом и live-обложкой, камеры, погода, сенсоры с историей, календарь, energy, map, iframe, webhook, notifications, room hub.

**4/5** Каждый виджет адаптивный — от 1×1 (только иконка) до 6×6 (полная карточка с графиком). Тап открывает sheet'ы со всеми настройками сущности — color wheel для ламп, slider угла ламелей для жалюзи, и т.д.

**5/5** Установка под HA OS / Supervised — 3 клика через Add-on Store. Под Docker — есть docker-compose. HACS plugin не нужен под ingress, но есть для standalone-инсталляций.
github.com/Ivkaiv/homeglance
