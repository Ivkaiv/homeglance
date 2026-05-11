'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useConnection, useEntity } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { WidgetSkeleton } from './_states';

interface Params {
  entity: string;
  label?: string;
  /** Сколько дней вперёд тянуть (включая сегодня). По умолчанию 7. */
  days?: number;
  /** Максимум событий в списке. */
  maxEvents?: number;
}

interface CalendarEvent {
  summary?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

function parseEventStart(e: CalendarEvent): Date | null {
  const v = e.start?.dateTime || e.start?.date;
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseEventEnd(e: CalendarEvent): Date | null {
  const v = e.end?.dateTime || e.end?.date;
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function isAllDay(e: CalendarEvent): boolean {
  return !!e.start?.date && !e.start?.dateTime;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(d: Date, now: Date): string {
  const today = startOfDay(now);
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400_000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === -1) return 'Вчера';
  if (diffDays >= 2 && diffDays <= 6) {
    return d.toLocaleDateString('ru-RU', { weekday: 'long' });
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function CalendarWidget({ params }: { params: Params }) {
  const { client, isReady } = useConnection();
  const entityState = useEntity(params.entity);
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const days = Math.max(1, params.days ?? 7);
  const maxEvents = Math.max(1, params.maxEvents ?? 6);
  const label = params.label || entityState?.attributes.friendly_name || 'Календарь';

  // Запрашиваем события на ближайшие N дней; перезапрашиваем при смене даты
  // или каждые 5 минут — это просто и достаточно для домашней панели.
  useEffect(() => {
    if (!isReady || !params.entity) return;
    let cancelled = false;
    const fetchEvents = async () => {
      try {
        const now = new Date();
        const start = startOfDay(now);
        const end = new Date(start.getTime() + days * 86400_000);
        const url = `/calendars/${encodeURIComponent(params.entity)}?start=${encodeURIComponent(
          start.toISOString(),
        )}&end=${encodeURIComponent(end.toISOString())}`;
        const data = await client.restGet<CalendarEvent[]>(url);
        if (cancelled) return;
        const sorted = (Array.isArray(data) ? data : [])
          .filter((e) => parseEventStart(e))
          .sort((a, b) => parseEventStart(a)!.getTime() - parseEventStart(b)!.getTime());
        setEvents(sorted);
        setErr(null);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Не удалось загрузить события');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, isReady, params.entity, days]);

  const now = useMemo(() => new Date(), []);
  const upcoming = events.slice(0, maxEvents);
  const todayCount = events.filter((e) => {
    const s = parseEventStart(e);
    return s && sameDay(s, now);
  }).length;

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  // Tiny: только иконка и счётчик сегодня
  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex flex-col items-center justify-center gap-0.5"
        title={`${label}: ${todayCount} сегодня`}
      >
        <Calendar size={18} aria-hidden="true" />
        <span className="text-xs font-semibold tabular-nums">{todayCount}</span>
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div ref={ref} className="h-full w-full">
        <WidgetSkeleton />
      </div>
    );
  }

  if (err) {
    return (
      <div ref={ref} className="glass h-full w-full p-3 flex flex-col items-center justify-center text-text-tertiary gap-1.5 select-none">
        <Calendar size={20} className="opacity-50" aria-hidden="true" />
        <div className="text-[11px] text-center max-w-[80%] leading-tight">{err}</div>
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div ref={ref} className="glass h-full w-full p-3 flex flex-col items-center justify-center text-text-tertiary gap-1.5 select-none">
        <Calendar size={20} className="opacity-50" aria-hidden="true" />
        <div className="text-[11px] text-center max-w-[80%] leading-tight">
          Ближайшие {days} {days === 1 ? 'день' : 'дн.'}: событий нет
        </div>
      </div>
    );
  }

  // Small/Medium/Large — список событий, сгруппированный по дню
  return (
    <div ref={ref} className="glass h-full w-full p-3 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar size={14} className="text-text-tertiary shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        {todayCount > 0 && (
          <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
            {todayCount} сегодня
          </span>
        )}
      </header>

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
        {upcoming.map((event, idx) => {
          const start = parseEventStart(event);
          const end = parseEventEnd(event);
          if (!start) return null;
          const ongoing = end ? now >= start && now < end : false;
          const dayLabel = formatDayLabel(start, now);
          const showTime = !isAllDay(event);
          return (
            <li
              key={`${event.summary}-${start.toISOString()}-${idx}`}
              className={`text-xs rounded-md px-2 py-1.5 ${
                ongoing
                  ? 'bg-accent/15 border border-accent/40'
                  : 'bg-black/5 dark:bg-white/5'
              }`}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium truncate flex-1 min-w-0">
                  {event.summary || '(без названия)'}
                </span>
                {ongoing && (
                  <span className="text-[9px] uppercase tracking-wider text-accent shrink-0">
                    идёт
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-text-tertiary mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-0.5">
                  <Clock size={10} aria-hidden="true" />
                  {dayLabel}
                  {showTime ? `, ${formatTime(start)}` : ''}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-0.5 truncate">
                    <MapPin size={10} aria-hidden="true" />
                    <span className="truncate">{event.location}</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
