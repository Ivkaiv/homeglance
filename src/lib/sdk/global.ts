'use client';

/**
 * Public SDK для community-виджетов.
 *
 * Внешний разработчик публикует .js-файл, который при загрузке вызывает
 * `window.Homeglance.registerWidget({ meta, Component })`. Пользователь
 * добавляет URL этого файла в Settings → External widgets, после чего
 * Homeglance подгружает его при каждом запуске.
 *
 * SDK даёт доступ к React и нашим хукам — чтобы community-виджет не
 * тащил собственную копию React и работал в той же подписке на HA states,
 * что и встроенные виджеты.
 *
 * Безопасность: внешний скрипт выполняется в обычном контексте страницы
 * (без iframe-sandbox), так что он имеет доступ ко всему. Пользователь
 * предупреждается «add only sources you trust». Будущая итерация может
 * перевести на shadow-realm или iframe-сандбокс.
 */

import * as React from 'react';
import { register } from '@/lib/widgets/registry';
import type { WidgetEntry } from '@/lib/widgets/types';
import {
  useEntity,
  useStates,
  useCallService,
  useConnection,
} from '@/lib/ha/ConnectionProvider';

const SDK_VERSION = '1';

declare global {
  interface Window {
    Homeglance?: HomeglanceSDK;
  }
}

export interface HomeglanceSDK {
  /** Версия SDK — внешние виджеты могут проверить совместимость. */
  version: string;
  /** Re-export React: чтобы community-виджет не подключал свою копию. */
  React: typeof React;
  /** Зарегистрировать кастомный виджет. */
  registerWidget: <P = Record<string, any>>(entry: WidgetEntry<P>) => void;
  /** Хуки для доступа к HA — сигнатуры совпадают с нашими. */
  hooks: {
    useEntity: typeof useEntity;
    useStates: typeof useStates;
    useCallService: typeof useCallService;
    useConnection: typeof useConnection;
  };
}

let installed = false;

/**
 * Один раз на запуск приложения регистрирует window.Homeglance.
 * Идемпотентно: повторный вызов ничего не делает.
 */
export function installHomeglanceSDK(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.Homeglance = {
    version: SDK_VERSION,
    React,
    registerWidget: (entry) => {
      try {
        register(entry as WidgetEntry<any>);
      } catch (e) {
        console.error('[Homeglance SDK] registerWidget failed', e);
      }
    },
    hooks: { useEntity, useStates, useCallService, useConnection },
  };
}
