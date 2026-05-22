# Getting started

This document covers what happens after installation: how Glance connects
to Home Assistant and how to build your first dashboard. The installation
methods themselves are described in detail in the
[README](../README.md#installation).

## Installation in brief

The method depends on which kind of Home Assistant you run:

| Your HA | Recommended method |
|---|---|
| Home Assistant OS / Supervised | **HA Add-on** — one-click install via the Add-on Store |
| HA Container / HA Core | **Docker Compose** — a separate container |
| Any | **Docker** on a separate machine on the network |

Full step-by-step instructions for each option are in the
[README](../README.md#installation).

## Connecting to Home Assistant

The first time you open Glance, it offers to connect to your Home Assistant.

### If Glance is installed as an HA Add-on

The connection happens **automatically** — there is nothing to enter. The
add-on runs next to Home Assistant and authenticates through it on its own.
The token never leaves the server.

### In all other cases

You need two things:

1. **Your Home Assistant address** — for example `http://192.168.1.10:8123`
   or `https://ha.example.com`.
2. **A Long-Lived Access Token** — the key Glance uses to talk to HA.

#### How to create a token

1. Open Home Assistant and click your avatar at the bottom-left.
2. Scroll down to the **Long-lived access tokens** section.
3. Click **CREATE TOKEN**, name it "Glance", and copy it.
4. Paste the token into Glance and click **Connect**.

The token stays with you — on the Glance server or in your browser — and is
sent only to your own Home Assistant. Glance has no "servers of its own"
that anything is sent to.

> **If the connection fails.** Check that the HA address is reachable from
> this device and that the token was copied in full. If Glance is opened
> over `https` while HA is only available over `http`, the browser may
> block the connection; in that case it is easier to install Glance as an
> Add-on or in Docker next to HA.

## The first-run setup wizard

After connecting, Glance offers to build your dashboard. There are three
paths:

- **🪄 Build it all for me.** Glance reads your Home Assistant and creates
  several pages for you: a home page with weather and scenes, a separate
  page for each room, and an info page. The fastest start.
- **📐 Ready-made templates.** Pick one of the prebuilt layouts — minimal,
  family, studio, bedroom, monitoring. You can tweak everything afterwards.
- **✏️ Start from blank.** A clean slate — widgets are added by hand via
  "+ Widget" in edit mode.

Any of these is just a starting point. From there the dashboard is fully
yours: see the [user guide](user-guide.md).

## What's next

- [User guide](user-guide.md) — how to edit the dashboard and work with
  pages, profiles and themes.
- [Widget reference](widgets.md) — every available tile.
