'use client';

/**
 * Регистрация всех встроенных виджетов.
 *
 * meta живут в `./meta` (синхронно) — нужны для каталога «+ Виджет» и ConfigSheet.
 * Component каждого виджета загружается лениво через next/dynamic — Webpack
 * выделяет каждый виджет в отдельный chunk, который тащится только когда
 * виджет реально появляется на дашборде.
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { register } from '@/lib/widgets/registry';
import { WidgetSkeleton } from './_states';
import {
  SENSOR_VALUE_META,
  LIGHT_TOGGLE_META,
  SWITCH_TOGGLE_META,
  TIME_META,
  NOTE_META,
  CLIMATE_META,
  WEATHER_META,
  QUICK_ACTION_META,
  COVER_META,
  PERSON_META,
  MEDIA_PLAYER_META,
  MUSIC_ASSISTANT_META,
  CAMERA_META,
  CONTROL_PANEL_META,
  ROOM_HUB_META,
  WEATHER_ROOM_META,
  CALENDAR_META,
  LOCK_META,
  IFRAME_META,
  MULTI_SENSOR_META,
  LIGHT_COLOR_META,
  ENERGY_META,
  MAP_META,
  NOTIFICATION_FEED_META,
  WEBHOOK_META,
  GLUCOSE_META,
  GLUCOSE_CHART_META,
  GLUCOSE_STATS_META,
  weatherComputeMinSize,
  controlPanelComputeMinSize,
  roomHubComputeMinSize,
  weatherRoomComputeMinSize,
} from './meta';

// Skeleton показывается, пока chunk виджета грузится с сервера. Для первого
// рендера это миллисекунды (chunk кэширован service-worker'ом), для самого
// первого захода — 100-300мс.
//
// Тип `any` сознательный: каждый виджет принимает свой Params, а реестр
// диспатчит по `meta.type` в рантайме. Тут TypeScript не помогает —
// проверка корректности живёт внутри самого виджета.
type AnyWidget = ComponentType<{ params: any }>;

// Loader типизирован через `any`, потому что каждый виджет имеет свой Params,
// а next/dynamic не умеет vary'ировать generic под него. Cast безопасен —
// диспетчеризация по `meta.type` в рантайме гарантирует совпадение.
const lazyLoad = (loader: () => Promise<any>): AnyWidget =>
  dynamic(loader, { ssr: false, loading: () => <WidgetSkeleton /> }) as AnyWidget;

let registered = false;

export function registerBuiltinWidgets(): void {
  if (registered) return;

  register({
    meta: SENSOR_VALUE_META,
    Component: lazyLoad(() =>
      import('./SensorValueWidget').then((m) => m.SensorValueWidget)
    ),
  });
  register({
    meta: LIGHT_TOGGLE_META,
    Component: lazyLoad(() =>
      import('./LightToggleWidget').then((m) => m.LightToggleWidget)
    ),
  });
  register({
    meta: SWITCH_TOGGLE_META,
    Component: lazyLoad(() =>
      import('./SwitchToggleWidget').then((m) => m.SwitchToggleWidget)
    ),
  });
  register({
    meta: TIME_META,
    Component: lazyLoad(() => import('./TimeWidget').then((m) => m.TimeWidget)),
  });
  register({
    meta: NOTE_META,
    Component: lazyLoad(() => import('./NoteWidget').then((m) => m.NoteWidget)),
  });
  register({
    meta: CLIMATE_META,
    Component: lazyLoad(() =>
      import('./ClimateWidget').then((m) => m.ClimateWidget)
    ),
  });
  register({
    meta: WEATHER_META,
    Component: lazyLoad(() =>
      import('./WeatherWidget').then((m) => m.WeatherWidget)
    ),
    computeMinSize: weatherComputeMinSize,
  });
  register({
    meta: QUICK_ACTION_META,
    Component: lazyLoad(() =>
      import('./QuickActionWidget').then((m) => m.QuickActionWidget)
    ),
  });
  register({
    meta: COVER_META,
    Component: lazyLoad(() =>
      import('./CoverWidget').then((m) => m.CoverWidget)
    ),
  });
  register({
    meta: PERSON_META,
    Component: lazyLoad(() =>
      import('./PersonWidget').then((m) => m.PersonWidget)
    ),
  });
  register({
    meta: MEDIA_PLAYER_META,
    Component: lazyLoad(() =>
      import('./MediaPlayerWidget').then((m) => m.MediaPlayerWidget)
    ),
  });
  register({
    meta: MUSIC_ASSISTANT_META,
    Component: lazyLoad(() =>
      import('./MusicAssistantWidget').then((m) => m.MusicAssistantWidget)
    ),
  });
  register({
    meta: CAMERA_META,
    Component: lazyLoad(() =>
      import('./CameraWidget').then((m) => m.CameraWidget)
    ),
  });
  register({
    meta: CONTROL_PANEL_META,
    Component: lazyLoad(() =>
      import('./ControlPanelWidget').then((m) => m.ControlPanelWidget)
    ),
    computeMinSize: controlPanelComputeMinSize,
  });
  register({
    meta: ROOM_HUB_META,
    Component: lazyLoad(() =>
      import('./RoomHubWidget').then((m) => m.RoomHubWidget)
    ),
    computeMinSize: roomHubComputeMinSize,
  });
  register({
    meta: WEATHER_ROOM_META,
    Component: lazyLoad(() =>
      import('./WeatherRoomWidget').then((m) => m.WeatherRoomWidget)
    ),
    computeMinSize: weatherRoomComputeMinSize,
  });
  register({
    meta: CALENDAR_META,
    Component: lazyLoad(() =>
      import('./CalendarWidget').then((m) => m.CalendarWidget)
    ),
  });
  register({
    meta: LOCK_META,
    Component: lazyLoad(() =>
      import('./LockWidget').then((m) => m.LockWidget)
    ),
  });
  register({
    meta: IFRAME_META,
    Component: lazyLoad(() =>
      import('./IframeWidget').then((m) => m.IframeWidget)
    ),
  });
  register({
    meta: MULTI_SENSOR_META,
    Component: lazyLoad(() =>
      import('./MultiSensorWidget').then((m) => m.MultiSensorWidget)
    ),
  });
  register({
    meta: LIGHT_COLOR_META,
    Component: lazyLoad(() =>
      import('./LightColorWidget').then((m) => m.LightColorWidget)
    ),
  });
  register({
    meta: ENERGY_META,
    Component: lazyLoad(() =>
      import('./EnergyWidget').then((m) => m.EnergyWidget)
    ),
  });
  register({
    meta: MAP_META,
    Component: lazyLoad(() =>
      import('./MapWidget').then((m) => m.MapWidget)
    ),
  });
  register({
    meta: NOTIFICATION_FEED_META,
    Component: lazyLoad(() =>
      import('./NotificationFeedWidget').then((m) => m.NotificationFeedWidget)
    ),
  });
  register({
    meta: WEBHOOK_META,
    Component: lazyLoad(() =>
      import('./WebhookWidget').then((m) => m.WebhookWidget)
    ),
  });
  register({
    meta: GLUCOSE_META,
    Component: lazyLoad(() =>
      import('./GlucoseWidget').then((m) => m.GlucoseWidget)
    ),
  });
  register({
    meta: GLUCOSE_CHART_META,
    Component: lazyLoad(() =>
      import('./GlucoseChartWidget').then((m) => m.GlucoseChartWidget)
    ),
  });
  register({
    meta: GLUCOSE_STATS_META,
    Component: lazyLoad(() =>
      import('./GlucoseStatsWidget').then((m) => m.GlucoseStatsWidget)
    ),
  });
  registered = true;
}
