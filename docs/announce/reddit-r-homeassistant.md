[Project] Homeglance — modern mobile-first dashboard for HA. HA Add-on with zero-config Ingress + 16 widgets

Hey r/homeassistant!

I've been building **Homeglance** — a Next.js-based PWA dashboard that runs as an HA Add-on, similar to what you might call an iOS-style home screen for HA.

**Features:**
- 16 widgets: lights (with RGB color wheel), switches, locks, covers (with tilt), climate, media player (with full-screen sheet + live cover), cameras, weather, sensors with history, calendar, energy, map, iframe, webhook, notification feed, room hub.
- Multi-user with PIN protection
- Drag-and-drop grid (react-grid-layout)
- Glassmorphism UI, dark/light/auto themes
- PWA-installable

**Zero-config under HA Ingress:** the add-on uses Supervisor token to proxy WS/REST to HA server-side — no Long-Lived tokens to copy around, token never leaves the container.

Screenshot: https://github.com/Ivkaiv/homeglance/blob/main/docs/screenshots/dashboard-mobile.png

Install (HA OS / Supervised):
1. Settings → Add-ons → Add-on Store → ⋮ → Repositories
2. Add: `https://github.com/Ivkaiv/homeglance`
3. Install Homeglance → Start

GitHub: https://github.com/Ivkaiv/homeglance (MIT)

This is alpha, active development. Open to feedback, bug reports, feature requests, PRs.
