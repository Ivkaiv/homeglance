# Homeglance

**English** · [Русский](README.ru.md)

> A modern, mobile-first dashboard for Home Assistant. No YAML, no compromise.

**Homeglance** (just **Glance** inside the app) is a PWA dashboard for Home
Assistant that runs alongside the standard Lovelace UI instead of replacing
it. The goal: give an ordinary user an iOS-home-screen-class experience —
drag-and-drop widgets, smooth animations, glassmorphism, themes, multi-user
support. No YAML, no changes to your HA config.

<p align="center">
  <img src="docs/screenshots/home-dark.webp" alt="Homeglance home screen" width="250" />
  <img src="docs/screenshots/music-light.webp" alt="Music player" width="250" />
  <img src="docs/screenshots/weather-dark.webp" alt="Weather page" width="250" />
</p>

## Features

- **Drag-and-drop grid** — tiles can be moved, resized and removed
- **28 widgets** — lights, switches, locks, sensors, climate, media, cameras, covers, weather, person, map, calendar, energy, notes, clock, actions (scripts/scenes/webhooks), control panels, room hubs, glucose monitoring
- **Multiple pages** with a bottom dock bar — swipe to switch
- **Multi-user** — several PIN-protected profiles, each with its own layout
- **PWA** — installs as a native-like app on iOS, Android and desktop
- **Dark / light / auto themes** — follow the system
- **English and Russian interface** — switchable in settings
- **Connects to HA over WebSocket** — no changes to your HA config

## Screenshots

Glance in light and dark themes — switchable in settings or following the
system.

| | ☀️ Light | 🌙 Dark |
|---|---|---|
| **Home** | <img src="docs/screenshots/home-light.webp" width="240" /> | <img src="docs/screenshots/home-dark.webp" width="240" /> |
| **Room** | <img src="docs/screenshots/kitchen-light.webp" width="240" /> | <img src="docs/screenshots/kitchen-dark.webp" width="240" /> |
| **Weather** | <img src="docs/screenshots/weather-light.webp" width="240" /> | <img src="docs/screenshots/weather-dark.webp" width="240" /> |
| **Music** | <img src="docs/screenshots/music-light.webp" width="240" /> | <img src="docs/screenshots/music-dark.webp" width="240" /> |
| **Glucose monitoring** | <img src="docs/screenshots/glucose-light.webp" width="240" /> | <img src="docs/screenshots/glucose-dark.webp" width="240" /> |

## Installation

Four paths depending on your type of Home Assistant.

### 1. HA Add-on (for HA OS / Supervised — the easiest)

If you run Home Assistant OS or Home Assistant Supervised, this is the
simplest path. HA itself starts and manages the Homeglance server.

1. **Settings** → **Add-ons** → **Add-on Store** → ⋮ (three dots) → **Repositories**
2. Add the URL `https://github.com/Ivkaiv/homeglance` → **Add**
3. Find **Homeglance** → **Install** → **Start**
4. **Homeglance** appears in the HA sidebar — open it.

**Zero-config authentication.** Under HA Ingress the add-on connects to HA
automatically via `SUPERVISOR_TOKEN` — there are no tokens to create by
hand. WS and REST requests to HA are proxied server-side, and the token
never leaves the container.

**Persistent storage.** Profiles, widgets and themes are kept in the
`/data` mount, which the Supervisor preserves across restarts, updates and
reinstalls of the add-on — on any HA Supervisor version.

More details: [`homeglance-addon/README.md`](homeglance-addon/README.md).

### 2. HACS plugin (icon in the HA sidebar)

> **When you need it.** The HACS plugin is **not needed** if you use the HA
> Add-on (option 1) — it already adds Homeglance to the HA sidebar via
> Ingress. The plugin is for the case when the Homeglance server runs
> **outside** HA: on another machine on the network, in Docker (option 3),
> or on HA Core/Container where add-ons are unavailable.

The plugin itself does not start a server — it is an iframe wrapper for an
already-running Homeglance. After installation, Glance appears in the HA
sidebar as a native menu item.

1. In HACS → Frontend → Custom repositories → add `https://github.com/Ivkaiv/homeglance`, type **Plugin**
2. Find **Homeglance** → Install
3. Add to `configuration.yaml`:
   ```yaml
   panel_custom:
     - name: homeglance-panel
       sidebar_title: Homeglance
       sidebar_icon: mdi:view-dashboard-variant
       url_path: homeglance
       module_url: /hacsfiles/homeglance/homeglance.js
       config:
         url: "http://homeassistant.local:3040"  # address of your Homeglance server
   ```
4. Restart HA → **Homeglance** appears in the sidebar

> **Important:** the plugin requires a Homeglance server already running
> somewhere on the network — Docker (3) or a process on another host.

### 3. Docker / Docker Compose (any HA setup)

Works for HA Container, HA Core, or for running the dashboard on a separate
server.

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

Start it:

```bash
docker compose up -d
```

Open `http://server-ip:3040`, enter your HA URL and a Long-Lived Access
Token, and you are done.

### 4. Run from source (for development)

```bash
git clone https://github.com/Ivkaiv/homeglance.git
cd homeglance
bun install
bun dev
```

Open `http://localhost:3040`.

## Connecting to Home Assistant

On first launch Homeglance asks for:

1. **Home Assistant URL** — e.g. `http://192.168.1.10:8123` or `https://ha.example.com`
2. **Long-Lived Access Token** — create one in HA Profile → Security → Long-Lived Access Tokens

The token is stored locally (on the Homeglance server in
`data/connection.json` when server storage is used, or in the browser's
localStorage otherwise).

## Configuration

Everything is configured through the UI. No environment variables are
required by default. If you want to override something:

| Variable                  | Default | Description                  |
|---------------------------|---------|------------------------------|
| `PORT`                    | `3040`  | Server port                  |
| `NEXT_TELEMETRY_DISABLED` | `1`     | Disable Next.js telemetry    |

See `.env.example`.

## Documentation

User guides live in the [`docs/`](docs/) directory:

- [Getting started](docs/getting-started.md) — connecting to Home Assistant, creating a token, the setup wizard
- [User guide](docs/user-guide.md) — editing the dashboard, pages, profiles, themes
- [Widget reference](docs/widgets.md) — every built-in tile
- [Custom widgets (SDK)](docs/sdk.md) — for developers

## Tech stack

- **Next.js 14** (App Router, standalone build)
- **React 18** + **TypeScript** strict
- **Tailwind CSS 4**
- **Framer Motion** — animations
- **react-grid-layout** — drag/drop
- **Bun** — package manager and development runtime

## Status

**Alpha.** Running in the author's home in production and under active
development. Expect changes and rough edges. Bug reports and ideas are
welcome via [GitHub Issues](https://github.com/Ivkaiv/homeglance/issues).

## Contributing

All contributions are welcome. Before opening a PR, please read
[CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

To add a new widget, see [docs/sdk.md](docs/sdk.md).

## License

[MIT](LICENSE) — the standard for the HA ecosystem.
