'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface EntityOption {
  id: string;
  label: string;
  /** Подзаголовок для второй строки (опц.) */
  sub?: string;
}

/**
 * Дропдаун с типахедом для выбора одной сущности из (потенциально длинного)
 * списка. Показывает текущее значение, при фокусе раскрывает список с
 * поиском по подстроке.
 */
export function SearchableEntitySelect({
  value,
  onChange,
  options,
  placeholder = '— не выбрано —',
  emptyOptionLabel,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: EntityOption[];
  placeholder?: string;
  /** Если задан — добавит первую опцию «пусто» с этим лейблом */
  emptyOptionLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const display = selected?.label ?? (value || '');

  // Закрывать при клике вне
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filtered = !query
    ? options
    : options.filter((o) => {
        const q = query.toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.sub || '').toLowerCase().includes(q)
        );
      });

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
        className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary cursor-pointer flex items-center gap-2"
      >
        <span className={`flex-1 truncate ${selected ? '' : 'text-text-tertiary'}`}>
          {selected ? display : placeholder}
        </span>
        {selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="text-text-tertiary hover:text-text-primary"
            title="Очистить"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className="text-text-tertiary shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md bg-bg-secondary border border-black/15 dark:border-white/15 shadow-2xl p-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 поиск..."
            className="w-full px-2.5 py-1.5 mb-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm focus:outline-hidden focus:border-accent/40"
          />
          {emptyOptionLabel && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-2.5 py-1.5 text-sm text-text-tertiary hover:bg-black/6 dark:hover:bg-white/6 rounded-sm"
            >
              {emptyOptionLabel}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-text-tertiary text-center">
              Ничего не найдено
            </div>
          ) : (
            filtered.slice(0, 200).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={`w-full text-left px-2.5 py-1.5 text-sm rounded hover:bg-black/6 dark:hover:bg-white/6 ${
                  o.id === value ? 'bg-accent/15 text-accent' : 'text-text-primary'
                }`}
              >
                <div className="truncate">{o.label}</div>
                {o.sub && (
                  <div className="text-[10px] text-text-tertiary truncate">{o.sub}</div>
                )}
              </button>
            ))
          )}
          {filtered.length > 200 && (
            <div className="px-2.5 py-1.5 text-[10px] text-text-tertiary text-center">
              Показаны первые 200, уточни поиск
            </div>
          )}
        </div>
      )}
    </div>
  );
}
