# Homeglance — Home Assistant Add-on

Modern, mobile-first dashboard for Home Assistant — устанавливается одной кнопкой через Supervisor. Ставит и запускает Homeglance-сервер рядом с HA, без отдельного Docker-хоста.

## Установка

Add-on работает на **Home Assistant OS** и **Home Assistant Supervised**. Если у вас HA Container или HA Core — используйте [Docker Compose](https://github.com/Ivkaiv/homeglance#2-docker--docker-compose-любой-ha-сценарий) вместо add-on.

1. **Settings** → **Add-ons** → **Add-on Store** (нижняя кнопка)
2. Жмите три точки в правом верхнем углу → **Repositories**
3. Вставьте `https://github.com/Ivkaiv/homeglance` → **Add**
4. Закройте окно. В каталоге появится секция **Homeglance** с одним add-on
5. Жмите **Homeglance** → **Install**
6. После установки — **Start**

После старта откройте Homeglance:
- Через web UI add-on'а: кнопка **Open Web UI** в карточке add-on
- Напрямую: `http://<homeassistant-ip>:3040`

## Конфигурация

Add-on не требует настройки в YAML. При первом запуске Homeglance спросит URL вашего Home Assistant и Long-Lived Access Token — введите их в форме.

| Параметр  | Описание                            |
|-----------|-------------------------------------|
| 3040/tcp  | Порт web-интерфейса (можно поменять)|

## Подключение к Home Assistant

После открытия Homeglance:

1. URL HA: используйте `http://homeassistant.local:8123` или IP вашего HA
2. Создайте Long-Lived Access Token: HA → Profile → Security → Long-Lived Access Tokens → Create Token → скопируйте
3. Вставьте в Homeglance → готово

## Связка с HACS plugin

Если хотите чтобы Homeglance появился в боковой панели HA как нативный пункт меню (и открывался iframe-ом, а не на отдельной вкладке) — поставьте также [HACS plugin](https://github.com/Ivkaiv/homeglance) и добавьте в `configuration.yaml`:

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

Перезапустите HA. В боковой панели появится «Homeglance».

## Лицензия

[MIT](https://github.com/Ivkaiv/homeglance/blob/main/LICENSE)
