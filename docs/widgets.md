# Widget reference

A widget is a tile on the dashboard: a light, a sensor, the player, the
weather. Every tile can be moved, resized and configured — see the
[user guide](user-guide.md) for how. This page lists all built-in widgets
and what each one needs from Home Assistant.

In the "+ Widget" catalog, widgets are grouped by category: **Lights**,
**Switches**, **Sensors**, **Climate**, **Media**, **Cameras**, **Rooms**,
**Health**, **Misc**.

Almost every widget needs an **entity** of Home Assistant — a specific
device or reading in your HA, such as `light.kitchen` or
`sensor.outdoor_temperature`. When configuring, Glance shows a list of
matching entities, so there is no need to type IDs by hand.

---

## Lights

### 💡 Light toggle
Turns a lamp or a light group on and off with a single tap. When the light
is on, the tile glows in the chosen color.
**Needs:** a `light.*` entity. **Settings:** name, icon, glow color.

### 🌈 Light (color + brightness)
A lamp with brightness and color control. The tile adapts to its size: small
— just a button, medium — with a brightness slider, wide — with quick color
presets. Tapping it opens a full-screen sheet with a color wheel.
**Needs:** a `light.*` entity that supports brightness or color.

---

## Switches

### 🔌 Switch
A socket, relay or fan — anything that simply turns on and off.
**Needs:** a `switch.*` entity. **Settings:** name, icon, glow color (green
by default; sky blue suits a fan, orange suits a boiler).

### 🔒 Lock
Locks and unlocks a smart lock. When the door is unlocked, the tile is
highlighted in amber as a gentle reminder.
**Needs:** a `lock.*` entity.

---

## Sensors

### 📊 Sensor
A universal widget for any reading. It recognizes the type on its own —
temperature, humidity, pressure, illuminance, power, CO₂, as well as doors,
windows, motion, occupancy. If auto-detection gets it wrong, the type can be
set manually.
**Needs:** a `sensor.*` entity (a number) or a `binary_sensor.*` entity
(yes/no).

### 📊 Multi-sensor
A compact block of several sensors at once — each shown as a chip with an
icon and a value. Tapping a numeric sensor opens a chart.
**Needs:** several `sensor.*` / `binary_sensor.*` entities.

### ⚡ Energy
Shows the current power draw in large type, and optionally consumption for
the day and month plus an estimated cost based on your tariff.
**Needs:** a power sensor (W). **Optionally:** kWh sensors for the day and
month, and the price per kWh.

---

## Climate

### 🌡 Climate
A thermostat: the current temperature and buttons to adjust the target. Fits
underfloor heating, a boiler, an air conditioner.
**Needs:** a `climate.*` entity. **Settings:** the −/+ button step (boilers
and underfloor heating often use 0.1°, air conditioners 0.5–1°).

---

## Media

### 🎵 Media player
A player with cover art, play/pause buttons, seeking and volume. Tapping it
opens a full-screen sheet. An optional Zaycev FM radio section can be
enabled.
**Needs:** a `media_player.*` entity (a smart speaker, Sonos, AirPlay, etc.).

### 🎶 Music (Music Assistant)
A player built on the separate [Music Assistant](https://www.music-assistant.io/)
server: it shows what is playing, controls, volume and the output speaker.
Music sources and output devices are configured in Music Assistant itself.

---

## Cameras

### 📹 Camera
Live video from a Home Assistant camera. If the video stream is unavailable,
it shows a snapshot. Tapping it expands to full screen.
**Needs:** a `camera.*` entity. **Settings:** mode (auto / video only /
snapshot only), sound, snapshot refresh interval.

---

## Rooms

### 🏠 Room
A hub for one room in a single tile: temperature and humidity in the header,
buttons for lights and switches, an underfloor-heating control, an embedded
player, extra sensors (doors, windows, illuminance). Handy for collecting a
whole room instead of a dozen separate tiles.

### 🌤 Weather room
A large, configurable weather widget: choice of forecast provider, units
(°C/°F, m/s or km/h, mmHg or hPa), the set of metrics, and a forecast for
several days ahead.
**Needs:** a `weather.*` entity.

---

## Health

Widgets for continuous glucose monitoring (CGM) — for example, when using
Nightscout or Juggluco.

### 🩸 Glucose
A large card: the current value, a trend arrow, the change, and a background
color by zone (low / in range / above range / high). Tapping it opens a
6-hour chart.
**Needs:** a glucose sensor. **Settings:** target thresholds in mmol/L.

### 📈 Glucose chart
A chart over 3 / 6 / 12 / 24 hours with the target zone highlighted.

### 📊 Glucose stats
Time in range (TIR) with a progress bar, the average value, GMI/HbA1c, and
the share of time above and below range — over 24 hours or 7 days.

---

## Misc

### 🕐 Clock
The current time and date. Settings: 24-hour format, seconds, show the date.

### 📝 Note
A text reminder with an emoji and a colored stripe on the left. Not
interactive — just a note on the dashboard.

### ☀️ Weather
Weather with adaptive content — from an icon up to a 5-day forecast with
pressure, wind and the UV index. What to show is chosen with checkboxes.
**Needs:** a `weather.*` entity.

### ⚡ Quick action
Runs a Home Assistant scene, script, automation or button with a single tap.
**Needs:** a scene / script / automation / button entity.

### 🪟 Cover
Opens, closes and stops shades, blinds or gates.
**Needs:** a `cover.*` entity.

### 👤 Person
Shows whether a person is home, with an avatar.
**Needs:** a `person.*` entity.

### 🎛 Control panel
A flexible grid of lights, switches, scenes, scripts, buttons and
automations, not tied to a room. Handy for assembling, say, a "Scenes" or
"Lights" block.

### 🔔 HA notifications
A feed of active Home Assistant persistent notifications. A notification can
be dismissed straight from the widget.

### 🔗 Webhook button
Triggers a Home Assistant webhook — handy for launching automations.
**Needs:** a Webhook ID. **Settings:** HTTP method, the JSON request body.

### 🗺️ Map
The location of a person or tracker on an OpenStreetMap map.
**Needs:** a `person.*` or `device_tracker.*` entity with coordinates.

### 🌐 Embedded site
Shows an arbitrary web page right inside the tile — for example, a Grafana
dashboard. The site must allow embedding in an iframe.

### 📅 Calendar
Events from a Home Assistant calendar — today's and a few days ahead.
**Needs:** a `calendar.*` entity.

---

## Need more widgets?

Glance can load **third-party widgets** — standalone `.js` files added by URL
under **Settings → External widgets**. To write your own widget, see the
[developer guide](sdk.md).
