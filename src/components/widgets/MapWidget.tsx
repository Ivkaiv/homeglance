'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { MapPin } from 'lucide-react';
import { useWidgetSize } from '@/lib/widgets/useWidgetSize';

interface Params {
  /** Entity с координатами — person.* или device_tracker.*. */
  entity: string;
  label?: string;
  /** Зум 1..18, по умолчанию 14. */
  zoom?: number;
}

/**
 * Виджет «Карта»: показывает положение person или device_tracker на
 * OpenStreetMap.
 *
 * Реализация — iframe embed OSM. Без зависимостей (Leaflet/Mapbox),
 * без API-ключей, без приватных запросов от браузера: tiles рендерит
 * OSM, координаты идут только в URL embed.
 *
 * Если у сущности нет lat/lng — показываем placeholder с zone-state
 * (например «дом», «работа»).
 */
export function MapWidget({ params }: { params: Params }) {
  const [ref] = useWidgetSize();
  const e = useEntity(params.entity);

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Выбери person или device_tracker
      </div>
    );
  }

  const lat = e?.attributes.latitude as number | undefined;
  const lng = e?.attributes.longitude as number | undefined;
  const label = params.label ?? e?.attributes.friendly_name ?? 'Местоположение';
  const zoom = Math.max(1, Math.min(18, params.zoom ?? 14));
  const stateLabel = e?.state || 'неизвестно';

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return (
      <div ref={ref} className="glass h-full w-full p-3 flex flex-col items-center justify-center gap-1 text-text-tertiary">
        <MapPin size={18} aria-hidden="true" />
        <div className="text-xs font-medium text-text-primary">{label}</div>
        <div className="text-[11px]">Сейчас: {stateLabel}</div>
        <div className="text-[10px] opacity-70 text-center">Координаты недоступны</div>
      </div>
    );
  }

  // OSM bbox-embed: вычисляем рамку вокруг точки в зависимости от zoom
  // (грубая аппроксимация — для домашней панели достаточно).
  const span = 0.04 / Math.pow(1.5, zoom - 10);
  const left = (lng - span).toFixed(5);
  const right = (lng + span).toFixed(5);
  const top = (lat + span).toFixed(5);
  const bottom = (lat - span).toFixed(5);
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div ref={ref} className="glass h-full w-full overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 text-[11px] text-text-tertiary border-b border-black/5 dark:border-white/5 shrink-0 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin size={11} aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-text-secondary">{stateLabel}</span>
      </div>
      <iframe
        title={`Карта: ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        className="flex-1 min-h-0 w-full border-0 bg-white"
      />
    </div>
  );
}
