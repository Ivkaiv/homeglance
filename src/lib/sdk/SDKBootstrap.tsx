'use client';

import { useEffect } from 'react';
import { installHomeglanceSDK } from './global';
import { loadAllExternalWidgets } from './external-loader';

/**
 * Маунтится один раз в layout: ставит window.Homeglance и запускает
 * загрузку внешних виджет-скриптов, если они есть.
 *
 * Делается отдельным компонентом, а не useEffect в Layout, потому что
 * Layout — server-component, а SDK строго клиентский.
 */
export function SDKBootstrap() {
  useEffect(() => {
    installHomeglanceSDK();
    void loadAllExternalWidgets();
  }, []);
  return null;
}
