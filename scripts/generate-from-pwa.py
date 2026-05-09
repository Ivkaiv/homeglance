#!/usr/bin/env python3
"""
Генератор страниц Glance из конфига HA-PWA (`/home/server/ha-pwa/lib/area-entities.ts`).

Читает ROOM_DEVICES и AREAS, для каждой комнаты создаёт страницу Glance с
авто-расставленными виджетами:
  - RoomHubWidget — лампы + переключатели + температура/влажность
  - ClimateWidget — для каждого climate.* (термостат/HVAC)
  - MediaPlayerWidget — для каждого media_player.*
  - CameraWidget — для каждого camera.*
  - ControlPanelWidget — для buttons.* и binary_sensors.*
  - SensorValueWidget — для одиночных датчиков (если в комнате только сенсоры)

Запуск:
  python3 generate-from-pwa.py            # dry-run, печатает JSON
  python3 generate-from-pwa.py --apply    # сохраняет в Glance API
  python3 generate-from-pwa.py --apply --keep-home   # сохраняет, но Главную не трогает
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path

import urllib.request

PWA_PATH = "/home/server/ha-pwa/lib/area-entities.ts"
PWA_TYPES_PATH = "/home/server/ha-pwa/lib/ha-types.ts"
GLANCE_API_BASE = "http://localhost:3040/api/glance"
DATA_DIR = Path("/home/server/glance/data")


def parse_areas() -> dict:
    """Парсит AREAS из ha-types.ts: возвращает {slug: {name, emoji}}."""
    text = Path(PWA_TYPES_PATH).read_text()
    pattern = re.compile(
        r"\{\s*slug:\s*'(\w+)'\s*,\s*name:\s*'([^']+)'\s*,\s*emoji:\s*'([^']+)'"
    )
    out = {}
    for slug, name, emoji in pattern.findall(text):
        out[slug] = {"name": name, "emoji": emoji}
    return out


def parse_rooms() -> dict:
    """Парсит ROOM_DEVICES из area-entities.ts. Возвращает dict[slug] → структура."""
    text = Path(PWA_PATH).read_text()

    # Найти границы ROOM_DEVICES = { ... };
    start = text.find("ROOM_DEVICES")
    body_start = text.find("{", start)

    # Грубый split по верхнеуровневым ключам "slug: {" (slug — латиница)
    rooms = {}
    # Каждая комната: `\n  slug: {\n ... \n  },`
    # Используем regex с балансом фигурных скобок (упрощённо — по wrapper'у `\n  },\n`)
    pattern = re.compile(r"\n  (\w+):\s*\{(.*?)\n  \},", re.DOTALL)
    for slug, body in pattern.findall(text):
        rooms[slug] = parse_room_body(body)
    return rooms


def parse_room_body(body: str) -> dict:
    """Извлекает entity_id'ы из тела одной комнаты."""
    out = {
        "temp": None,
        "humidity": None,
        "pressure": None,
        "lights": [],
        "switches": [],
        "buttons": [],
        "climate": [],
        "binarySensors": [],
        "mediaPlayers": [],
        "cameras": [],
    }
    for key in ("temp", "humidity", "pressure", "soilMoisture"):
        m = re.search(rf"{key}:\s*'([^']+)'", body)
        if m:
            out[key] = m.group(1)

    # Списки entity объектов { id: '...', label: '...', icon: '...' }
    list_keys = {
        "lights": "lights",
        "switches": "switches",
        "buttons": "buttons",
        "climate": "climate",
        "binarySensors": "binarySensors",
        "mediaPlayers": "mediaPlayers",
        "cameras": "cameras",
    }
    for outer, ts_key in list_keys.items():
        # Найти `outer: [ ... ]`
        m = re.search(rf"{ts_key}:\s*\[(.*?)\]", body, re.DOTALL)
        if not m:
            continue
        block = m.group(1)
        for entry in re.findall(r"\{[^}]*\}", block):
            eid_m = re.search(r"id:\s*'([^']+)'", entry)
            label_m = re.search(r"label:\s*'([^']+)'", entry)
            icon_m = re.search(r"icon:\s*'([^']+)'", entry)
            if eid_m:
                item = {"id": eid_m.group(1)}
                if label_m:
                    item["label"] = label_m.group(1)
                if icon_m:
                    item["icon"] = icon_m.group(1)
                out[outer].append(item)
    return out


def make_widget(type_: str, x: int, y: int, w: int, h: int, params: dict, suffix: str = "") -> dict:
    """Создаёт WidgetConfig."""
    return {
        "i": f"{type_}-{int(time.time() * 1000)}{suffix}",
        "type": type_,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "params": params,
    }


def build_room_page(slug: str, area: dict, room: dict) -> dict:
    """Из структуры комнаты строит Page с упорядоченными виджетами."""
    widgets = []
    cur_y = 0
    counter = 0

    def add(type_: str, w: int, h: int, params: dict):
        nonlocal cur_y, counter
        widgets.append(make_widget(type_, 0, cur_y, w, h, params, suffix=f"-{counter}"))
        cur_y += h
        counter += 1

    name = area.get("name", slug.title())
    emoji = area.get("emoji", "🏠")

    has_lights_switches = bool(room["lights"] or room["switches"])
    has_media = bool(room["mediaPlayers"])
    has_climate = bool(room["climate"])
    has_binary = bool(room["binarySensors"])

    # Сенсорные чипы для room-hub: бинарные (двери, окна) + любые «extra» датчики
    # вроде давления и почвенной влажности — по факту в PWA-конфиге их нет в
    # области binarySensors/extras, но pressure и soilMoisture отдаём отдельно.
    sensor_chip_ids = [b["id"] for b in room["binarySensors"]]

    # 1. RoomHub — основной виджет комнаты с встроенным media + climate
    if (
        has_lights_switches
        or room["temp"]
        or room["humidity"]
        or has_media
        or has_climate
        or has_binary
    ):
        # Высота повышается если внутри есть media/climate (нужен запас по h)
        h = 4
        if has_media or has_climate:
            h = 6
        add(
            "room_hub",
            6,
            h,
            {
                "name": name,
                "icon": emoji,
                "tempEntity": room["temp"],
                "humidityEntity": room["humidity"],
                "showTemp": True,
                "showHumidity": True,
                "lights": [e["id"] for e in room["lights"]],
                "switches": [e["id"] for e in room["switches"]],
                "lightIcons": {e["id"]: e["icon"] for e in room["lights"] if e.get("icon")},
                "switchIcons": {e["id"]: e["icon"] for e in room["switches"] if e.get("icon")},
                "mediaPlayerEntity": room["mediaPlayers"][0]["id"] if has_media else None,
                "climateEntities": [c["id"] for c in room["climate"]],
                "climateStep": 1,
                "sensorEntities": sensor_chip_ids,
            },
        )

    # 2. Дополнительные media-плееры (если их несколько) — отдельными виджетами
    for m in room["mediaPlayers"][1:]:
        add(
            "media_player",
            6,
            3,
            {
                "entity": m["id"],
                "label": m.get("label"),
            },
        )

    # 4. Cameras
    for cam in room["cameras"]:
        add(
            "camera",
            6,
            5,
            {
                "entity": cam["id"],
                "label": cam.get("label"),
                "refreshSec": 10,
            },
        )

    # 5. ControlPanel для buttons + binary_sensors
    actions = [b["id"] for b in room["buttons"]]
    if actions:
        add(
            "control_panel",
            5,
            3,
            {
                "title": "Действия",
                "icon": "gesture-tap-button",
                "entities": actions,
                "entityIcons": {b["id"]: b["icon"] for b in room["buttons"] if b.get("icon")},
            },
        )

    # Бинарные сенсоры теперь идут как чипы в room-hub (см. sensorEntities выше),
    # отдельные виджеты не создаём чтобы не дублировать информацию.

    # 7. Pressure / soilMoisture — если есть, отдельным sensor_value
    for extra in ("pressure", "soilMoisture"):
        eid = room.get(extra)
        if eid:
            label_map = {"pressure": "Давление", "soilMoisture": "Влажность почвы"}
            add("sensor_value", 3, 2, {"entity": eid, "label": label_map[extra]})

    return {
        "id": slug,
        "title": name,
        "icon": emoji,
        "kind": "grid",
        "widgets": widgets,
    }


def http_post(path: str, data: dict) -> dict:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{GLANCE_API_BASE}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def http_get(path: str) -> dict:
    req = urllib.request.Request(f"{GLANCE_API_BASE}{path}")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Сохранить в Glance API (иначе dry-run)")
    ap.add_argument("--keep-home", action="store_true", help="Оставить страницу home как есть")
    ap.add_argument(
        "--profile",
        default=None,
        help="ID профиля Glance (если не задан — берётся первый из API)",
    )
    args = ap.parse_args()

    areas = parse_areas()
    rooms = parse_rooms()

    print(f"📍 AREAS: {len(areas)} штук", file=sys.stderr)
    print(f"📍 ROOM_DEVICES: {len(rooms)} комнат", file=sys.stderr)

    # Profile discovery
    profile_id = args.profile
    if not profile_id:
        try:
            res = http_get("/profiles")
            profiles = res.get("profiles", [])
            if not profiles:
                print("❌ Нет профилей в Glance — сначала пройди onboarding", file=sys.stderr)
                sys.exit(1)
            profile_id = profiles[0]["id"]
            print(f"📍 Профиль: {profile_id} ({profiles[0].get('name')})", file=sys.stderr)
        except Exception as e:
            print(f"⚠ Не смог получить профиль: {e}", file=sys.stderr)
            sys.exit(1)

    # Existing pages
    existing = http_get(f"/pages?profileId={profile_id}").get("pages", [])
    home_page = next((p for p in existing if p.get("id") == "home"), None)
    weather_pages = [p for p in existing if p.get("kind") == "weather"]

    # Generate room pages
    new_pages = []
    if args.keep_home and home_page:
        new_pages.append(home_page)
    elif home_page:
        # Сохраняем как есть — обычно это «вечнозелёная» главная
        new_pages.append(home_page)

    for slug, room in rooms.items():
        if slug not in areas:
            continue
        page = build_room_page(slug, areas[slug], room)
        if page["widgets"]:
            new_pages.append(page)

    # Сохраняем погодные страницы
    new_pages.extend(weather_pages)

    print("", file=sys.stderr)
    print("📋 Будут страницы:", file=sys.stderr)
    for p in new_pages:
        print(
            f"  {p.get('icon')} {p.get('title'):20s} ({p.get('kind') or 'grid'}) — "
            f"{len(p.get('widgets', []))} виджетов",
            file=sys.stderr,
        )

    if not args.apply:
        print("", file=sys.stderr)
        print("⚪ DRY-RUN (без --apply ничего не сохраняется).", file=sys.stderr)
        print("Полный JSON для просмотра:", file=sys.stderr)
        print(json.dumps(new_pages, ensure_ascii=False, indent=2))
        return

    # Save backup of current pages
    backup = DATA_DIR / f"pages-{profile_id}.backup-{int(time.time())}.json"
    backup.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
    print(f"💾 Бэкап текущих страниц: {backup}", file=sys.stderr)

    # POST
    res = http_post("/pages", {"profileId": profile_id, "pages": new_pages})
    if res.get("ok"):
        print("✅ Сохранено в Glance.", file=sys.stderr)
    else:
        print(f"❌ Ошибка: {res}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
