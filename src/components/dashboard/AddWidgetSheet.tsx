'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { listWidgets, CATEGORY_LABELS } from '@/lib/widgets/registry';
import type { WidgetCategory } from '@/lib/widgets/types';
import { ModalSheet } from '@/components/ui/ModalSheet';

export function AddWidgetSheet({
  onAdd,
  onClose,
}: {
  onAdd: (type: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<WidgetCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const all = listWidgets();

  const categories = useMemo(
    () => Array.from(new Set(all.map((w) => w.meta.category))) as WidgetCategory[],
    [all]
  );

  // По фильтру + поиску
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return all.filter((w) => {
      if (filter !== 'all' && w.meta.category !== filter) return false;
      if (q) {
        return (
          w.meta.name.toLowerCase().includes(q) ||
          w.meta.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [all, filter, search]);

  // Группируем по категории если активен «Все» и нет поиска
  const grouped = useMemo(() => {
    if (filter !== 'all' || search) return null;
    const map = new Map<WidgetCategory, typeof all>();
    for (const w of filtered) {
      const cat = w.meta.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(w);
    }
    return map;
  }, [filter, search, filtered]);

  return (
    <ModalSheet
      open
      onClose={onClose}
      title="Добавить виджет"
      subtitle="Тапни на нужный"
    >
      {/* Поиск */}
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск виджета (например, «лампа», «погода»)…"
          className="w-full pl-8 pr-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        />
      </div>

      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
            filter === 'all'
              ? 'bg-accent/20 border-accent/40 text-accent'
              : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
          }`}
        >
          Все ({all.length})
        </button>
        {categories.map((c) => {
          const cnt = all.filter((w) => w.meta.category === c).length;
          const meta = CATEGORY_LABELS[c];
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
                filter === c
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
              }`}
            >
              {meta.emoji} {meta.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">
          Ничего не найдено
        </div>
      ) : grouped ? (
        // «Все» без поиска — группы с заголовками
        <div className="flex flex-col gap-5">
          {Array.from(grouped.entries()).map(([cat, widgets]) => {
            const meta = CATEGORY_LABELS[cat];
            return (
              <section key={cat}>
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-2 flex items-center gap-1.5">
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className="opacity-60">({widgets.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {widgets.map((w) => (
                    <WidgetCard key={w.meta.type} widget={w} onAdd={onAdd} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // С фильтром по категории или поиском — плоский grid
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((w) => (
            <WidgetCard key={w.meta.type} widget={w} onAdd={onAdd} />
          ))}
        </div>
      )}
    </ModalSheet>
  );
}

function WidgetCard({
  widget,
  onAdd,
}: {
  widget: ReturnType<typeof listWidgets>[number];
  onAdd: (type: string) => void;
}) {
  return (
    <button
      onClick={() => onAdd(widget.meta.type)}
      className="text-left p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 hover:border-accent/40 transition active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl" aria-hidden="true">{widget.meta.emoji}</span>
        <span className="font-medium">{widget.meta.name}</span>
      </div>
      <div className="text-xs text-text-secondary leading-snug">
        {widget.meta.description}
      </div>
    </button>
  );
}
