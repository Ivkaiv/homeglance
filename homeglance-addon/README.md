# Homeglance — Home Assistant App

A modern, mobile-first dashboard for Home Assistant — installed with one
button via the Supervisor. It installs and runs the Homeglance server next
to HA, with no separate Docker host.

## Installation

The app works on **Home Assistant OS** and **Home Assistant Supervised**.
If you run HA Container or HA Core, use
[Docker Compose](https://github.com/Ivkaiv/homeglance#installation) instead
of the app.

> Home Assistant 2026.2 renamed **Add-ons** to **Apps**. On older HA
> versions the menu is still **Settings → Add-ons → Add-on Store**.

1. **Settings** → **Apps** → **App store** (bottom button)
2. Click the three dots in the top-right corner → **Repositories**
3. Paste `https://github.com/Ivkaiv/homeglance` → **Add**
4. Close the dialog. A **Homeglance** section with one app appears in the store
5. Click **Homeglance** → **Install**
6. After installation — **Start**

Once started, open Homeglance:
- Via the app web UI: the **Open Web UI** button in the app card
- Directly: `http://<homeassistant-ip>:3040`

## Configuration

The app requires no YAML configuration. On first launch Homeglance asks
for your Home Assistant URL and a Long-Lived Access Token — enter them in the
form.

| Parameter | Description                          |
|-----------|--------------------------------------|
| 3040/tcp  | Web interface port (can be changed)  |

## Connecting to Home Assistant

After opening Homeglance:

1. HA URL: use `http://homeassistant.local:8123` or your HA's IP
2. Create a Long-Lived Access Token: HA → Profile → Security → Long-Lived Access Tokens → Create Token → copy it
3. Paste it into Homeglance → done

## Pairing with the HACS plugin

If you want Homeglance to appear in the HA sidebar as a native menu item
(opening as an iframe rather than a separate tab), also install the
[HACS plugin](https://github.com/Ivkaiv/homeglance) and add to
`configuration.yaml`:

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

Restart HA. "Homeglance" will appear in the sidebar.

## License

[MIT](https://github.com/Ivkaiv/homeglance/blob/main/LICENSE)
