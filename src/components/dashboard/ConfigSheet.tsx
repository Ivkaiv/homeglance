'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Save, X, Check } from 'lucide-react';
import { getWidget } from '@/lib/widgets/registry';
import { useStates, useConnection } from '@/lib/ha/ConnectionProvider';
import { getEntityDisplay, groupByArea } from '@/lib/ha/entity-display';
import { MdiIcon, searchMdi, getMdiPath, GlanceIcon } from '@/components/icons/MdiIcon';
import type { WidgetConfig, ParamField, ParamGroup } from '@/lib/widgets/types';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Проверяет совпадение entity_id с заявленным доменом из paramSchema.
 * Поддерживает запятую — `'sensor.,binary_sensor.'` совпадает с обоими.
 * Пустая строка = принять любой entity. Без этой утилки multi-domain
 * фильтр у MultiSensorWidget возвращал пустой список (startsWith со строкой
 * `'sensor.,binary_sensor.'` целиком).
 */
function matchDomain(entityId: string, domain: string): boolean {
  if (!domain) return true;
  const prefixes = domain.split(',').map((d) => d.trim()).filter(Boolean);
  if (prefixes.length === 0) return true;
  return prefixes.some((p) => entityId.startsWith(p));
}

/** Группирует paramSchema по полю group, в порядке: paramGroups (если есть) → группы из schema → fallback "Основное". */
function groupSchema(
  schema: ParamField[],
  groups?: ParamGroup[]
): { group: ParamGroup; fields: ParamField[] }[] {
  const buckets = new Map<string, ParamField[]>();
  for (const f of schema) {
    const g = f.group || '_basic';
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(f);
  }
  // Order: paramGroups first (in declared order), then any remaining buckets.
  const order: string[] = [];
  if (groups) {
    for (const g of groups) {
      if (buckets.has(g.id)) order.push(g.id);
    }
  }
  for (const k of buckets.keys()) {
    if (!order.includes(k)) order.push(k);
  }
  const groupMap = new Map((groups || []).map((g) => [g.id, g]));
  return order.map((id) => ({
    group: groupMap.get(id) ?? { id, label: id === '_basic' ? 'Основное' : id },
    fields: buckets.get(id)!,
  }));
}

export function ConfigSheet({
  widget,
  onUpdate,
  onClose,
}: {
  widget: WidgetConfig;
  onUpdate: (params: Record<string, any>) => void;
  onClose: () => void;
}) {
  const meta = getWidget(widget.type)?.meta;
  if (!meta) return null;

  // Локальный draft — изменения применяются только по «Сохранить»
  const [draft, setDraft] = useState<Record<string, any>>(widget.params);
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  function update(key: string, value: any) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  function save() {
    onUpdate(draft);
    onClose();
  }

  function tryCancel() {
    if (dirty) setConfirmCancel(true);
    else onClose();
  }

  const header = (
    <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 shrink-0">
      <div>
        <div className="text-xs text-text-tertiary uppercase tracking-wider">Настройка</div>
        <div className="text-lg font-medium flex items-center gap-2">
          <span aria-hidden="true">{meta.emoji}</span> {meta.name}
        </div>
      </div>
      <button
        onClick={tryCancel}
        aria-label="Закрыть"
        title="Закрыть"
        className="w-9 h-9 rounded-full bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );

  const footer = (
    <div className="flex gap-2 p-4 border-t border-black/5 dark:border-white/5 shrink-0">
      <button
        onClick={tryCancel}
        className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
      >
        Отмена
      </button>
      <button
        onClick={save}
        disabled={!dirty}
        className="flex-1 px-4 py-2.5 rounded-xl bg-accent/25 border border-accent/40 text-accent text-sm disabled:opacity-40 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
      >
        <Save size={14} aria-hidden="true" /> {dirty ? 'Сохранить' : 'Без изменений'}
      </button>
    </div>
  );

  return (
    <>
      <ModalSheet
        open
        onClose={tryCancel}
        ariaLabel={`Настройка виджета: ${meta.name}`}
        preventBackdropClose={dirty}
        className="w-full max-w-2xl rounded-t-3xl bg-bg-secondary border-t border-x border-black/10 dark:border-white/10 flex flex-col max-h-[88vh]"
        header={header}
        footer={footer}
      >
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-2">
          {groupSchema(meta.paramSchema, meta.paramGroups).map(({ group, fields }) => (
            <ParamGroupSection
              key={group.id}
              group={group}
              fields={fields}
              draft={draft}
              update={update}
            />
          ))}
        </div>
      </ModalSheet>
      <ConfirmDialog
        open={confirmCancel}
        title="Отменить изменения?"
        message="Несохранённые правки будут потеряны."
        confirmLabel="Отменить"
        cancelLabel="Продолжить"
        variant="danger"
        onConfirm={() => {
          setConfirmCancel(false);
          onClose();
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

/**
 * Группа полей с заголовком-аккордеоном и описанием.
 * «Основное» (id='_basic') — без заголовка, всегда раскрыто.
 * Прочие группы — с заголовком; collapsed по дефолту, если group.collapsed=true.
 */
function ParamGroupSection({
  group,
  fields,
  draft,
  update,
}: {
  group: ParamGroup;
  fields: ParamField[];
  draft: Record<string, any>;
  update: (k: string, v: any) => void;
}) {
  const isBasic = group.id === '_basic';
  const [open, setOpen] = useState(isBasic ? true : !group.collapsed);

  // «Активность» раздела: есть ли в draft значения у каких-то полей этой группы.
  const hasValues = fields.some((f) => {
    const v = draft[f.key];
    return v !== undefined && v !== null && v !== '' &&
      !(Array.isArray(v) && v.length === 0);
  });

  if (isBasic) {
    return (
      <div className="flex flex-col gap-3">
        {renderFields(fields, draft, update)}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-black/3 dark:bg-white/3 hover:bg-black/6 dark:hover:bg-white/6 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-inset text-left"
        aria-expanded={open}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {group.icon && <span className="shrink-0 mt-0.5" aria-hidden="true">{group.icon}</span>}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
              <span>{group.label}</span>
              {hasValues && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                  aria-label="заполнено"
                  title="В этой секции есть значения"
                />
              )}
            </div>
            {group.hint && !open && (
              <div className="text-[11px] text-text-tertiary mt-0.5">{group.hint}</div>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp size={16} className="shrink-0 mt-1 text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="shrink-0 mt-1 text-text-secondary" aria-hidden="true" />
        )}
      </button>
      <div className={`accordion-row ${open ? 'is-open' : ''}`}>
        <div className="accordion-inner">
          <div className="p-4 flex flex-col gap-3 bg-black/2 dark:bg-white/2">
            {group.hint && (
              <div className="text-xs text-text-tertiary -mt-1 mb-1">{group.hint}</div>
            )}
            {renderFields(fields, draft, update)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Рендерит поля группы, объединяя пары `multi-entity` + связанная `entity-icons`
 *  в один комбинированный пикер «выбрал → справа иконка». */
function renderFields(
  fields: ParamField[],
  draft: Record<string, any>,
  update: (k: string, v: any) => void
) {
  // Карта: multi-entity-key → его entity-icons-поле (если есть)
  const iconsByEntities = new Map<string, ParamField>();
  for (const f of fields) {
    if (f.kind === 'entity-icons' && f.linkedKey) {
      iconsByEntities.set(f.linkedKey, f);
    }
  }
  const skipKeys = new Set<string>();
  for (const f of iconsByEntities.values()) skipKeys.add(f.key);

  return fields.map((field) => {
    if (skipKeys.has(field.key)) return null;
    const linkedIcons = field.kind === 'multi-entity' ? iconsByEntities.get(field.key) : undefined;
    if (linkedIcons) {
      return (
        <MultiEntityCombinedPicker
          key={field.key}
          entitiesField={field}
          iconsField={linkedIcons}
          entities={draft[field.key] ?? []}
          icons={draft[linkedIcons.key] ?? {}}
          onEntitiesChange={(v) => update(field.key, v)}
          onIconsChange={(v) => update(linkedIcons.key, v)}
        />
      );
    }
    return (
      <ParamInput
        key={field.key}
        field={field}
        value={draft[field.key]}
        onChange={(v) => update(field.key, v)}
        draft={draft}
      />
    );
  });
}

function ParamInput({
  field,
  value,
  onChange,
  draft,
}: {
  field: ParamField;
  value: any;
  onChange: (v: any) => void;
  draft: Record<string, any>;
}) {
  if (field.kind === 'entity') {
    return <EntityPicker field={field} value={value} onChange={onChange} />;
  }
  if (field.kind === 'multi-entity') {
    return <MultiEntityPicker field={field} value={value} onChange={onChange} />;
  }
  if (field.kind === 'icon') {
    return <IconPicker field={field} value={value} onChange={onChange} />;
  }
  if (field.kind === 'entity-icons') {
    const linkedEntities: string[] = field.linkedKey ? draft[field.linkedKey] ?? [] : [];
    return (
      <EntityIconsPicker
        field={field}
        entities={linkedEntities}
        value={value ?? {}}
        onChange={onChange}
      />
    );
  }
  if (field.kind === 'multi-select') {
    const selected: string[] = Array.isArray(value) ? value : (field.default ?? []);
    const toggle = (v: string) => {
      const next = selected.includes(v)
        ? selected.filter((x) => x !== v)
        : [...selected, v];
      onChange(next);
    };
    return (
      <Field label={field.label} hint={field.hint}>
        <div className="flex flex-col gap-1.5 p-2 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
          {(field.options ?? []).map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/4 dark:hover:bg-white/4 rounded-sm px-2 py-1"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-text-primary">{o.label}</span>
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (field.kind === 'select') {
    return (
      <Field label={field.label + (field.required ? ' *' : '')} hint={field.hint}>
        <SelectField
          value={value ?? field.default ?? ''}
          options={field.options ?? []}
          onChange={(v) => onChange(v)}
        />
      </Field>
    );
  }
  if (field.kind === 'color') {
    return (
      <Field label={field.label} hint={field.hint}>
        <input
          type="color"
          value={value || field.default || '#34d399'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-1"
        />
      </Field>
    );
  }
  if (field.kind === 'number') {
    // step="any" по умолчанию: иначе HTML-input для number-поля молча
    // блокирует ввод дробей (default step=1) — пользователь не мог поставить
    // шаг регулятора температуры 0.5 / 0.1, например, для котла.
    return (
      <Field label={field.label} hint={field.hint}>
        <input
          type="number"
          inputMode="decimal"
          step={field.step ?? 'any'}
          min={field.min}
          max={field.max}
          value={value ?? field.default ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(undefined);
              return;
            }
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
        />
      </Field>
    );
  }
  if (field.kind === 'boolean') {
    return (
      <Field label="" hint={field.hint}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={value ?? field.default ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          <span>{field.label}</span>
        </label>
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.hint}>
      <input
        type="text"
        value={value ?? field.default ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? field.default ?? ''}
        className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
      />
    </Field>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="pt-3 border-t border-black/5 dark:border-white/5 first:border-t-0 first:pt-0">
      {label && (
        <div className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full bg-accent/60" />
          {label}
        </div>
      )}
      {children}
      {hint && <div className="text-[11px] text-text-tertiary mt-1.5">{hint}</div>}
    </div>
  );
}

/**
 * Кастомный select — нативный <select> на iOS открывает свой
 * полноэкранный picker с белым фоном и игнорирует тёмную тему Glance,
 * из-за чего меню «как камера передаёт картинку» выглядело чужеродно.
 * Заменено на кнопку + inline-выпадашку в нашем стиле, с закрытием
 * по клику снаружи / Esc и галочкой у текущего выбора.
 */
function SelectField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (ev: Event) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-left flex items-center justify-between gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        <span className={selected ? '' : 'text-text-tertiary'}>
          {selected ? selected.label : '— выбери —'}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border border-black/10 dark:border-white/10 bg-bg-secondary shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-hidden focus-visible:bg-black/5 dark:focus-visible:bg-white/5 ${
                  active ? 'text-accent' : 'text-text-primary'
                }`}
              >
                <span>{o.label}</span>
                {active && <Check size={14} aria-hidden="true" className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Кнопка-summary, разворачивающая список выбора. */
function PickerToggle({
  open,
  onToggle,
  summary,
  empty,
}: {
  open: boolean;
  onToggle: () => void;
  summary: React.ReactNode;
  empty: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm flex items-center justify-between gap-2 hover:bg-black/8 dark:hover:bg-white/8 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
    >
      <span className={`truncate flex-1 text-left ${empty ? 'text-text-tertiary' : ''}`}>
        {summary}
      </span>
      {open ? (
        <ChevronUp size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
      ) : (
        <ChevronDown size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
      )}
    </button>
  );
}

function EntityPicker({
  field,
  value,
  onChange,
}: {
  field: ParamField;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const states = useStates();
  const { registries } = useConnection();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const domain = field.domain ?? '';

  const groups = useMemo(() => {
    if (!open) return [];
    const q = search.toLowerCase().trim();
    // Фильтруем только по домену. Раньше дополнительно резали entity с
    // registry-флагами hidden_by / disabled_by — но если сущность есть в
    // `states`, она активна и реально отдаёт значение (как sensor.blood_sugar
    // от nightscout: disabled_by='config_entry' в registry, но работает и
    // присутствует в states). hidden_by — это про витрину дашбордов HA, а
    // Glance — отдельная панель, пусть пользователь сам решает что добавлять.
    const filtered = Object.values(states)
      .filter((s) => matchDomain(s.entity_id, domain));
    const displayed = filtered.map((s) => getEntityDisplay(s, registries, s.entity_id));
    const matched = q
      ? displayed.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.entityId.toLowerCase().includes(q) ||
            (d.area ?? '').toLowerCase().includes(q) ||
            (d.device ?? '').toLowerCase().includes(q)
        )
      : displayed;
    return groupByArea(matched);
  }, [states, registries, search, domain, open]);

  const selectedDisplay = value ? getEntityDisplay(states[value], registries, value) : null;

  return (
    <Field label={field.label + (field.required ? ' *' : '')}>
      <PickerToggle
        open={open}
        onToggle={() => setOpen((v) => !v)}
        empty={!selectedDisplay}
        summary={
          selectedDisplay ? (
            <>
              <span className="font-medium">{selectedDisplay.name}</span>
              {selectedDisplay.area && (
                <span className="text-text-tertiary text-xs ml-2">{selectedDisplay.area}</span>
              )}
            </>
          ) : (
            <>— выбери сенсор —</>
          )
        }
      />
      {open && (
        <div className="mt-2">
          <div className="relative mb-2">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={domain ? `поиск (${domain.replace('.', '')})…` : 'поиск…'}
              aria-label="Поиск сенсора"
              className="w-full pl-8 pr-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm"
            />
          </div>
          <div className="max-h-72 overflow-auto rounded-md border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2">
            {groups.length === 0 ? (
              <div className="text-text-tertiary text-xs p-3 text-center">ничего не найдено</div>
            ) : (
              groups.map((g) => (
                <div key={g.areaId ?? '__no_area__'}>
                  <div className="px-3 py-1.5 bg-black/3 dark:bg-white/3 text-[10px] uppercase tracking-wider text-text-tertiary sticky top-0 backdrop-blur-sm">
                    {g.areaName}
                  </div>
                  {g.entities.map((e) => (
                    <button
                      key={e.entityId}
                      onClick={() => {
                        onChange(e.entityId);
                        setOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/5 dark:border-white/5 last:border-0 text-sm ${
                        value === e.entityId ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-text-primary truncate flex-1">{e.name}</div>
                        <div className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                          {e.state}
                        </div>
                      </div>
                      <div className="text-[10px] text-text-tertiary truncate">
                        {e.device && <span>{e.device} · </span>}
                        <span className="font-mono">{e.entityId}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Field>
  );
}

/**
 * Комбинированный пикер: список выбранных сущностей одной строкой каждая,
 * слева — кнопка выбора иконки, справа — крестик. Внизу — кнопка
 * «+ Добавить», открывающая дропдаун со списком всех сущностей домена.
 *
 * Заменяет связку `multi-entity` (огромный список с галочками) +
 * `entity-icons` (отдельный блок с иконками) на единый удобный UI.
 */
function MultiEntityCombinedPicker({
  entitiesField,
  iconsField,
  entities,
  icons,
  onEntitiesChange,
  onIconsChange,
}: {
  entitiesField: ParamField;
  iconsField: ParamField;
  entities: string[];
  icons: Record<string, string>;
  onEntitiesChange: (v: string[]) => void;
  onIconsChange: (v: Record<string, string>) => void;
}) {
  const states = useStates();
  const { registries } = useConnection();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [pickingIconFor, setPickingIconFor] = useState<string | null>(null);
  const domain = entitiesField.domain ?? '';

  const groups = useMemo(() => {
    if (!adding) return [];
    const q = search.toLowerCase().trim();
    // Фильтр по домену + исключаем уже добавленные. registry-флаги
    // hidden_by / disabled_by НЕ режем: сущность в `states` = активна и
    // отдаёт значение (см. EntityPicker — тот же случай sensor.blood_sugar).
    const filtered = Object.values(states)
      .filter((s) => matchDomain(s.entity_id, domain))
      .filter((s) => !entities.includes(s.entity_id));
    const displayed = filtered.map((s) => getEntityDisplay(s, registries, s.entity_id));
    const matched = q
      ? displayed.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.entityId.toLowerCase().includes(q) ||
            (d.area ?? '').toLowerCase().includes(q) ||
            (d.device ?? '').toLowerCase().includes(q)
        )
      : displayed;
    return groupByArea(matched);
  }, [states, registries, search, domain, adding, entities]);

  function add(id: string) {
    onEntitiesChange([...entities, id]);
    setAdding(false);
    setSearch('');
  }

  function remove(id: string) {
    onEntitiesChange(entities.filter((e) => e !== id));
    if (icons[id]) {
      const next = { ...icons };
      delete next[id];
      onIconsChange(next);
    }
  }

  return (
    <Field label={`${entitiesField.label} (${entities.length})`} hint={entitiesField.hint}>
      <div className="flex flex-col gap-1.5">
        {entities.map((id) => {
          const display = getEntityDisplay(states[id], registries, id);
          const haIcon = states[id]?.attributes.icon as string | undefined;
          const current = icons[id];
          const showIcon = current || haIcon;
          return (
            <div
              key={id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setPickingIconFor(id)}
                aria-label={`Иконка для ${display.name}`}
                className="w-10 h-10 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                title="Сменить иконку"
              >
                {showIcon && getMdiPath(showIcon) ? (
                  <MdiIcon name={showIcon} size={22} className="text-accent" />
                ) : (
                  <span className="text-text-tertiary text-[10px]">иконка</span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{display.name}</div>
                <div className="text-[10px] text-text-tertiary truncate">
                  {display.area && <span>{display.area} · </span>}
                  <span className="font-mono">{id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`Убрать ${display.name}`}
                title="Убрать из списка"
                className="text-text-tertiary hover:text-red-400 shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-400/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-2.5 rounded-md border border-dashed border-black/20 dark:border-white/20 text-sm text-text-secondary hover:border-accent/60 hover:text-accent hover:bg-accent/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 transition"
          >
            + Добавить {entities.length === 0 ? '' : 'ещё'}
          </button>
        )}

        {adding && (
          <div className="rounded-md border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-2">
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={domain ? `поиск (${domain.replace('.', '')})…` : 'поиск…'}
                aria-label="Поиск"
                className="w-full pl-8 pr-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm"
              />
            </div>
            <div className="max-h-64 overflow-auto rounded-md bg-black/2 dark:bg-white/2">
              {groups.length === 0 ? (
                <div className="text-text-tertiary text-xs p-3 text-center">
                  {entities.length > 0 ? 'Все доступные уже добавлены' : 'Ничего не найдено'}
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.areaId ?? '__no_area__'}>
                    <div className="px-3 py-1.5 bg-black/3 dark:bg-white/3 text-[10px] uppercase tracking-wider text-text-tertiary sticky top-0 backdrop-blur-sm">
                      {g.areaName}
                    </div>
                    {g.entities.map((e) => (
                      <button
                        key={e.entityId}
                        type="button"
                        onClick={() => add(e.entityId)}
                        className="block w-full text-left px-3 py-2 hover:bg-accent/10 border-b border-black/5 dark:border-white/5 last:border-0 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-text-primary truncate flex-1">{e.name}</div>
                          <div className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                            {e.state}
                          </div>
                        </div>
                        <div className="text-[10px] text-text-tertiary truncate">
                          {e.device && <span>{e.device} · </span>}
                          <span className="font-mono">{e.entityId}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setSearch('');
                }}
                className="text-xs text-text-secondary hover:text-text-primary px-2 py-1"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>

      {pickingIconFor && (
        <MdiPickerModal
          current={icons[pickingIconFor] ?? ''}
          onPick={(name) => {
            onIconsChange({ ...icons, [pickingIconFor!]: name });
            setPickingIconFor(null);
          }}
          onClose={() => setPickingIconFor(null)}
        />
      )}
    </Field>
  );
}

function EntityIconsPicker({
  field,
  entities,
  value,
  onChange,
}: {
  field: ParamField;
  entities: string[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const states = useStates();
  const { registries } = useConnection();
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  if (entities.length === 0) {
    return (
      <Field label={field.label} hint={field.hint}>
        <div className="text-text-tertiary text-xs px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 italic">
          Сначала выбери сущности выше
        </div>
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.hint}>
      <div className="flex flex-col gap-1.5">
        {entities.map((id) => {
          const display = getEntityDisplay(states[id], registries, id);
          const haIcon = states[id]?.attributes.icon as string | undefined;
          const current = value[id];
          const showIcon = current || haIcon;
          return (
            <div
              key={id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setPickingFor(id)}
                aria-label={`Выбрать иконку для ${display.name}`}
                className="w-10 h-10 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
                title="Выбрать иконку"
              >
                {showIcon && getMdiPath(showIcon) ? (
                  <MdiIcon name={showIcon} size={22} className="text-accent" />
                ) : (
                  <span className="text-text-tertiary text-xs">mdi</span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{display.name}</div>
                <div className="text-[10px] text-text-tertiary truncate">
                  {current ? (
                    <code className="font-mono">mdi:{current.replace(/^mdi[:-]?/, '')}</code>
                  ) : haIcon ? (
                    <span>из HA: <code className="font-mono">{haIcon}</code></span>
                  ) : (
                    <span className="italic">по умолчанию</span>
                  )}
                </div>
              </div>
              {current && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...value };
                    delete next[id];
                    onChange(next);
                  }}
                  aria-label={`Сбросить иконку для ${display.name}`}
                  className="text-text-tertiary hover:text-text-primary shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 rounded-xs"
                  title="Сбросить иконку"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {pickingFor && (
        <MdiPickerModal
          current={value[pickingFor] ?? ''}
          onPick={(name) => {
            onChange({ ...value, [pickingFor!]: name });
            setPickingFor(null);
          }}
          onClose={() => setPickingFor(null)}
        />
      )}
    </Field>
  );
}

function IconPicker({
  field,
  value,
  onChange,
}: {
  field: ParamField;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isMdi = !!value && !!getMdiPath(value);
  return (
    <Field label={field.label} hint={field.hint || 'Иконка из набора Material Design Icons (как в HA), либо эмодзи'}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Выбрать иконку"
          className="w-12 h-12 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          title="Выбрать иконку"
        >
          {value ? (
            <GlanceIcon value={value} size={26} className="text-accent" fallback={field.default} />
          ) : (
            <span className="text-text-tertiary text-xs">mdi</span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default || 'lightbulb или 💡'}
            aria-label="Имя иконки или эмодзи"
            className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm font-mono"
          />
          <div className="text-[11px] text-text-tertiary mt-1">
            {isMdi ? (
              <>MDI: <code>{value}</code></>
            ) : value ? (
              <>Эмодзи</>
            ) : (
              <>Дефолтная иконка</>
            )}
          </div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Сбросить иконку"
            className="text-text-tertiary hover:text-text-primary shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 rounded-xs"
            title="Сбросить"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <MdiPickerModal
          current={value ?? ''}
          onPick={(name) => {
            onChange(name);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </Field>
  );
}

function MdiPickerModal({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(current);
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    searchMdi(search || 'lightbulb', 96).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <ModalSheet
      open
      onClose={onClose}
      position="center"
      zIndex={60}
      title="Material Design Icons"
      subtitle="Выбор иконки"
      className="w-full max-w-2xl rounded-2xl bg-bg-secondary border border-black/10 dark:border-white/10 p-5 max-h-[80vh] flex flex-col"
    >
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="lightbulb, switch, thermometer…"
          aria-label="Поиск иконки"
          className="w-full pl-8 pr-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
        />
      </div>
      <div className="flex-1 overflow-auto grid grid-cols-6 sm:grid-cols-8 gap-2">
        {results.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            title={name}
            aria-label={name}
            aria-pressed={current === name}
            className={`aspect-square rounded-md border flex items-center justify-center transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${
              current === name
                ? 'bg-accent/20 border-accent/40'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <MdiIcon name={name} size={28} className="text-text-primary" />
          </button>
        ))}
      </div>
      {results.length === 0 && (
        <div className="text-text-tertiary text-sm text-center py-8">
          Ничего не найдено
        </div>
      )}
    </ModalSheet>
  );
}

function MultiEntityPicker({
  field,
  value,
  onChange,
}: {
  field: ParamField;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const states = useStates();
  const { registries } = useConnection();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const domain = field.domain ?? '';
  const selected = Array.isArray(value) ? value : [];

  const groups = useMemo(() => {
    if (!adding) return [];
    const q = search.toLowerCase().trim();
    // Фильтр по домену + исключаем уже добавленные. registry-флаги
    // hidden_by / disabled_by НЕ режем: сущность в `states` = активна и
    // отдаёт значение (как sensor.blood_sugar от nightscout —
    // disabled_by='config_entry' в registry, но работает и есть в states).
    const filtered = Object.values(states)
      .filter((s) => matchDomain(s.entity_id, domain))
      .filter((s) => !selected.includes(s.entity_id));
    const displayed = filtered.map((s) => getEntityDisplay(s, registries, s.entity_id));
    const matched = q
      ? displayed.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.entityId.toLowerCase().includes(q) ||
            (d.area ?? '').toLowerCase().includes(q) ||
            (d.device ?? '').toLowerCase().includes(q)
        )
      : displayed;
    return groupByArea(matched);
  }, [states, registries, search, domain, adding, selected]);

  function add(id: string) {
    onChange([...selected, id]);
    setAdding(false);
    setSearch('');
  }

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id));
  }

  return (
    <Field label={`${field.label} (${selected.length})`} hint={field.hint}>
      <div className="flex flex-col gap-1.5">
        {/* Выбранные — отдельными строками с крестиком: убрать можно сразу,
            не открывая общий каталог. Раньше был свёрнутый список с
            галочками, и чтобы убрать одну сущность приходилось искать её
            среди сотен. Логика выровнена с MultiEntityCombinedPicker. */}
        {selected.map((id) => {
          const display = getEntityDisplay(states[id], registries, id);
          return (
            <div
              key={id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{display.name}</div>
                <div className="text-[10px] text-text-tertiary truncate">
                  {display.area && <span>{display.area} · </span>}
                  <span className="font-mono">{id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`Убрать ${display.name}`}
                title="Убрать из списка"
                className="text-text-tertiary hover:text-red-400 shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-400/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-2.5 rounded-md border border-dashed border-black/20 dark:border-white/20 text-sm text-text-secondary hover:border-accent/60 hover:text-accent hover:bg-accent/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 transition"
          >
            + Добавить {selected.length === 0 ? '' : 'ещё'}
          </button>
        )}

        {adding && (
          <div className="rounded-md border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-2">
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={domain ? `поиск (${domain.replace('.', '')})…` : 'поиск…'}
                aria-label="Поиск"
                className="w-full pl-8 pr-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-sm"
              />
            </div>
            <div className="max-h-64 overflow-auto rounded-md bg-black/2 dark:bg-white/2">
              {groups.length === 0 ? (
                <div className="text-text-tertiary text-xs p-3 text-center">
                  {selected.length > 0 ? 'Все доступные уже добавлены' : 'Ничего не найдено'}
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.areaId ?? '__no_area__'}>
                    <div className="px-3 py-1.5 bg-black/3 dark:bg-white/3 text-[10px] uppercase tracking-wider text-text-tertiary sticky top-0 backdrop-blur-sm">
                      {g.areaName}
                    </div>
                    {g.entities.map((e) => (
                      <button
                        key={e.entityId}
                        type="button"
                        onClick={() => add(e.entityId)}
                        className="block w-full text-left px-3 py-2 hover:bg-accent/10 border-b border-black/5 dark:border-white/5 last:border-0 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-text-primary truncate flex-1">{e.name}</div>
                          <div className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                            {e.state}
                          </div>
                        </div>
                        <div className="text-[10px] text-text-tertiary truncate">
                          {e.device && <span>{e.device} · </span>}
                          <span className="font-mono">{e.entityId}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setSearch('');
                }}
                className="text-xs text-text-secondary hover:text-text-primary px-2 py-1"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
