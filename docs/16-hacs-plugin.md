# Homeglance — HACS panel plugin

Тонкая JS-обёртка, регистрирующая Homeglance как боковую панель Home Assistant. Сам Homeglance-инстанс работает отдельно (Docker / Add-on / standalone) — этот плагин лишь показывает его в HA-сайдбаре через iframe.

## Установка

### Через HACS

1. HACS → Frontend → ⋮ → **Custom repositories**
2. Добавить URL: `https://github.com/Ivkaiv/homeglance`, тип **Plugin**
3. Найти **Homeglance** → **Install**
4. Перезапустить Home Assistant

### Конфигурация

Добавьте в `configuration.yaml`:

```yaml
panel_custom:
  - name: homeglance-panel
    sidebar_title: Homeglance
    sidebar_icon: mdi:view-dashboard-variant
    url_path: homeglance
    module_url: /hacsfiles/homeglance/homeglance.js
    require_admin: false
    config:
      # URL запущенного Homeglance — Docker, Add-on или standalone.
      url: "http://homeassistant.local:3040"
```

Перезапустите HA. В сайдбаре появится **Homeglance**.

## Параметры

| Параметр       | Описание                                          | Обязательный |
|----------------|---------------------------------------------------|--------------|
| `url`          | URL запущенного Homeglance-инстанса               | Да           |

## Откуда взять Homeglance-инстанс

См. [главный README](https://github.com/Ivkaiv/homeglance#установка). Три варианта: Docker Compose, HA Add-on, локальный запуск из исходников.

## Лицензия

[MIT](../LICENSE).
