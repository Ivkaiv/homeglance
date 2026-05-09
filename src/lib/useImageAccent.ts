'use client';

import { useEffect, useState } from 'react';

/**
 * Извлекает приглушённый «акцентный» цвет из обложки/иллюстрации.
 *
 * Цвет берётся как средний по «интересным» пикселям (с насыщенностью и
 * умеренной светлотой), чтобы фон не уходил в чёрный/белый/серый. Если
 * картинка нейтральная — фоллбэк на простой средний цвет; если картинка
 * вообще не проигралась (CORS, 404) — возвращает null.
 *
 * Результат — строка `rgb(r, g, b)` или null. Кешируется по URL, чтобы при
 * перерисовке не перезагружать обложку.
 */
const cache = new Map<string, string | null>();

export function useImageAccent(url: string | null | undefined): string | null {
  const [color, setColor] = useState<string | null>(() =>
    url && cache.has(url) ? cache.get(url)! : null
  );

  useEffect(() => {
    if (!url) {
      setColor(null);
      return;
    }
    if (cache.has(url)) {
      setColor(cache.get(url)!);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const c = extractAccent(img);
        cache.set(url, c);
        setColor(c);
      } catch {
        // Tainted canvas (нет CORS-заголовков на CDN) — fallback на null
        cache.set(url, null);
        setColor(null);
      }
    };
    img.onerror = () => {
      cache.set(url, null);
      if (!cancelled) setColor(null);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}

function extractAccent(img: HTMLImageElement): string | null {
  const w = 24;
  const h = 24;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Сначала идём по «интересным» пикселям: умеренная светлота + насыщенность.
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i],
      G = data[i + 1],
      B = data[i + 2],
      A = data[i + 3];
    if (A < 200) continue;
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const light = (max + min) / 2 / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (light < 0.2 || light > 0.85) continue;
    if (sat < 0.2) continue;
    r += R;
    g += G;
    b += B;
    n++;
  }

  // Фоллбэк — средний по всем непрозрачным пикселям (для серых/чёрно-белых обложек).
  if (n < 5) {
    r = g = b = 0;
    n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const A = data[i + 3];
      if (A < 200) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  if (n === 0) return null;
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}
