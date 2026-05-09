'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { usePages } from '@/lib/pages/PagesProvider';
import {
  DEFAULT_WEATHER_SECTIONS,
  type Page,
  type WeatherPageConfig,
  type WeatherPageSections,
} from '@/lib/pages/types';
import { useStates, useConnection } from '@/lib/ha/ConnectionProvider';
import { getEntityDisplay } from '@/lib/ha/entity-display';
import { SearchableEntitySelect, type EntityOption } from '@/components/ui/SearchableEntitySelect';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function PageManagerSheet({ onClose }: { onClose: () => void }) {
  const { pages, addPage, updatePage, deletePage, reorderPages } = usePages();
  const [editing, setEditing] = useState<Page | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Page | null>(null);

  function startNew() {
    setEditing({ id: '', title: '', icon: '📄', kind: 'grid', widgets: [] });
  }

  function save(p: Page) {
    if (p.id) {
      updatePage(p.id, {
        title: p.title,
        icon: p.icon,
        weather: p.weather,
      });
    } else {
      addPage({
        title: p.title,
        icon: p.icon,
        kind: p.kind,
        weather: p.weather,
      });
    }
    setEditing(null);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const ids = pages.map((p) => p.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderPages(ids);
  }
  function moveDown(idx: number) {
    if (idx >= pages.length - 1) return;
    const ids = pages.map((p) => p.id);
    [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
    reorderPages(ids);
  }

  return (
    <>
      <ModalSheet
        open
        onClose={onClose}
        title={editing ? undefined : 'Страницы'}
        subtitle={editing ? undefined : 'Управляй страницами и порядком в dock-баре'}
        ariaLabel={editing ? (editing.id ? 'Редактирование страницы' : 'Новая страница') : 'Управление страницами'}
      >
        {!editing ? (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className={`px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-2 text-sm ${
                    p.hidden ? 'opacity-60' : ''
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">{p.icon}</span>
                  <span className="flex-1 truncate">
                    {p.title}
                    {p.kind === 'weather' && (
                      <span className="text-[10px] text-amber-300/80 ml-2">погода</span>
                    )}
                    {p.hidden && (
                      <span className="text-[10px] text-text-tertiary ml-2">скрыта</span>
                    )}
                    {p.protected && (
                      <span className="text-[10px] text-text-tertiary ml-2">базовая</span>
                    )}
                  </span>
                  <button
                    onClick={() => updatePage(p.id, { hidden: !p.hidden })}
                    title={p.hidden ? 'Показать в dock-баре' : 'Скрыть из dock-бара'}
                    aria-label={p.hidden ? `Показать «${p.title}» в dock-баре` : `Скрыть «${p.title}» из dock-бара`}
                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    {p.hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                  </button>
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    aria-label="Переместить вверх"
                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary disabled:opacity-20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <ChevronUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx >= pages.length - 1}
                    aria-label="Переместить вниз"
                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary disabled:opacity-20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setEditing(p)}
                    aria-label={`Редактировать страницу «${p.title}»`}
                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  {!p.protected && (
                    <button
                      onClick={() => setConfirmDelete(p)}
                      aria-label={`Удалить страницу «${p.title}»`}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-red-300/85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={startNew}
              className="w-full px-4 py-3 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            >
              <Plus size={16} aria-hidden="true" /> Создать страницу
            </button>
          </>
        ) : (
          <PageEditor
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={save}
          />
        )}
      </ModalSheet>
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `Удалить страницу «${confirmDelete.title}»?` : ''}
        message="Действие необратимо."
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) deletePage(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

function PageEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Page;
  onCancel: () => void;
  onSave: (p: Page) => void;
}) {
  const [page, setPage] = useState<Page>({
    ...initial,
    kind: initial.kind ?? 'grid',
  });
  const isNew = !page.id;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-text-tertiary uppercase tracking-wider">Страница</div>
          <div className="text-lg font-medium">
            {page.id ? 'Редактирование' : 'Новая страница'}
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label="Назад к списку страниц"
          title="Назад"
          className="w-9 h-9 rounded-full bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs text-text-secondary mb-1">Название</div>
          <input
            type="text"
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
            placeholder="Кухня, Гостиная, Гараж..."
            className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
          />
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Иконка (эмодзи)</div>
          <input
            type="text"
            value={page.icon}
            onChange={(e) => setPage({ ...page, icon: e.target.value })}
            maxLength={4}
            placeholder="🏠"
            className="w-20 text-center text-2xl px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
          />
        </div>

        {/* Тип страницы — только при создании, переключение после создания может потерять виджеты */}
        {isNew && (
          <div>
            <div className="text-xs text-text-secondary mb-1">Тип страницы</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPage({ ...page, kind: 'grid' })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page.kind === 'grid'
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
                }`}
              >
                🧩 Сетка виджетов
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage({
                    ...page,
                    kind: 'weather',
                    icon: page.icon === '📄' ? '🌤' : page.icon,
                    weather: page.weather || {
                      weatherEntity: '',
                      sections: { ...DEFAULT_WEATHER_SECTIONS },
                    },
                  })
                }
                className={`px-3 py-2 rounded-md border text-sm ${
                  page.kind === 'weather'
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
                }`}
              >
                🌤 Погода
              </button>
            </div>
          </div>
        )}

        {page.kind === 'weather' && (
          <WeatherPageConfigEditor
            config={page.weather}
            onChange={(weather) => setPage({ ...page, weather })}
          />
        )}
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary"
        >
          Отмена
        </button>
        <button
          disabled={
            !page.title.trim() ||
            (page.kind === 'weather' && !page.weather?.weatherEntity)
          }
          onClick={() => onSave(page)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Check size={16} /> Сохранить
        </button>
      </div>
    </>
  );
}

const SECTION_LABELS: Record<keyof WeatherPageSections, string> = {
  header: 'Шапка с большой температурой и графиком',
  alerts: 'Метеопредупреждения',
  hourly: 'Прогноз на 24 часа',
  daily: 'Прогноз на неделю',
  extras: 'Прочие датчики (УФ, порывы, …)',
  lightning: 'Грозы (счётчик, дистанция, азимут)',
  storm: 'Шторм-радар (расстояние, направление, геомагнитка)',
};

function WeatherPageConfigEditor({
  config,
  onChange,
}: {
  config?: WeatherPageConfig;
  onChange: (c: WeatherPageConfig) => void;
}) {
  const c: WeatherPageConfig = config ?? {
    weatherEntity: '',
    sections: { ...DEFAULT_WEATHER_SECTIONS },
  };
  const states = useStates();
  const { registries } = useConnection();

  // Списки сущностей по доменам
  const weatherList = Object.keys(states)
    .filter((id) => id.startsWith('weather.'))
    .sort();
  const sensorList = Object.keys(states)
    .filter((id) => id.startsWith('sensor.'))
    .sort();

  const update = (patch: Partial<WeatherPageConfig>) => onChange({ ...c, ...patch });
  const updateSection = (key: keyof WeatherPageSections, val: boolean) =>
    update({ sections: { ...c.sections, [key]: val } });

  const sensorLabel = (id: string) => {
    const display = getEntityDisplay(states[id], registries, id);
    return display.area ? `${display.area} · ${display.name}` : display.name;
  };

  // Опции для поисковых селекторов
  const weatherOptions: EntityOption[] = weatherList.map((id) => ({
    id,
    label: sensorLabel(id),
    sub: id,
  }));
  const tempSensorOptions: EntityOption[] = sensorList
    .filter((id) => {
      const s = states[id];
      const dc = s?.attributes.device_class;
      const unit = s?.attributes.unit_of_measurement;
      return dc === 'temperature' || unit === '°C' || unit === '°F';
    })
    .map((id) => ({ id, label: sensorLabel(id), sub: id }));
  const allSensorOptions: EntityOption[] = sensorList.map((id) => ({
    id,
    label: sensorLabel(id),
    sub: id,
  }));

  return (
    <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-black/10 dark:border-white/10">
      <div className="text-xs text-text-tertiary uppercase tracking-wider">
        Настройки погоды
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">Поставщик погоды *</div>
        <SearchableEntitySelect
          value={c.weatherEntity || undefined}
          onChange={(v) => update({ weatherEntity: v ?? '' })}
          options={weatherOptions}
          placeholder="— выбери —"
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">
          Уличный датчик температуры (для шапки и графика)
        </div>
        <SearchableEntitySelect
          value={c.outdoorTempEntity}
          onChange={(v) => update({ outdoorTempEntity: v })}
          options={tempSensorOptions}
          placeholder="Использовать данные провайдера"
          emptyOptionLabel="— Использовать данные провайдера —"
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">
          Сенсор «Ощущается как» (свой, по своим данным)
        </div>
        <SearchableEntitySelect
          value={c.apparentTempEntity}
          onChange={(v) => update({ apparentTempEntity: v })}
          options={tempSensorOptions}
          placeholder="Брать из провайдера"
          emptyOptionLabel="— Брать из провайдера —"
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1.5">Какие секции показывать</div>
        <div className="flex flex-col gap-1 p-2 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
          {(Object.keys(SECTION_LABELS) as Array<keyof WeatherPageSections>).map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/4 dark:hover:bg-white/4 rounded-sm px-2 py-1"
            >
              <input
                type="checkbox"
                checked={c.sections[k]}
                onChange={(e) => updateSection(k, e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span>{SECTION_LABELS[k]}</span>
            </label>
          ))}
        </div>
      </div>

      {c.sections.alerts && (
        <MultiEntitySelect
          label="Сущности метеопредупреждений"
          hint="Например, sensor.weather_alerts_o_any (оранжевые), …_w_any (жёлтые)"
          domain="sensor."
          value={c.alertEntities ?? []}
          onChange={(v) => update({ alertEntities: v })}
        />
      )}

      {c.sections.extras && (
        <MultiEntitySelect
          label="Доп. датчики для секции «Прочее»"
          hint="УФ-индекс, порывы, озон, любые другие sensor.*"
          domain="sensor."
          value={c.extraSensors ?? []}
          onChange={(v) => update({ extraSensors: v })}
        />
      )}

      {c.sections.lightning && (
        <MultiEntitySelect
          label="Датчики гроз"
          hint="Например: счётчик молний, дистанция, азимут"
          domain="sensor."
          value={c.lightningSensors ?? []}
          onChange={(v) => update({ lightningSensors: v })}
        />
      )}

      {c.sections.storm && (
        <div className="flex flex-col gap-2 p-3 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
            Шторм-радар (любое поле опционально)
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              Расстояние до ближайшей грозы (км)
            </div>
            <SearchableEntitySelect
              value={c.stormDistanceEntity}
              onChange={(v) => update({ stormDistanceEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              Направление до ближайшей грозы (азимут °)
            </div>
            <SearchableEntitySelect
              value={c.stormBearingEntity}
              onChange={(v) => update({ stormBearingEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              Движение шторма (азимут °)
            </div>
            <SearchableEntitySelect
              value={c.stormEntity}
              onChange={(v) => update({ stormEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary mt-2">
            Геомагнитная активность (Kp)
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Сегодня</div>
            <SearchableEntitySelect
              value={c.magneticStormEntity}
              onChange={(v) => update({ magneticStormEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Завтра</div>
            <SearchableEntitySelect
              value={c.magneticStormTomorrowEntity}
              onChange={(v) => update({ magneticStormTomorrowEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Послезавтра</div>
            <SearchableEntitySelect
              value={c.magneticStormAfterTomorrowEntity}
              onChange={(v) => update({ magneticStormAfterTomorrowEntity: v })}
              options={allSensorOptions}
              placeholder="— нет —"
              emptyOptionLabel="— нет —"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <div>
          <div className="text-xs text-text-secondary mb-1">Темп</div>
          <select
            value={c.tempUnit ?? 'C'}
            onChange={(e) => update({ tempUnit: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
          >
            <option value="C">°C</option>
            <option value="F">°F</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Ветер</div>
          <select
            value={c.windUnit ?? 'm/s'}
            onChange={(e) => update({ windUnit: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
          >
            <option value="m/s">м/с</option>
            <option value="km/h">км/ч</option>
            <option value="mph">миль/ч</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Давление</div>
          <select
            value={c.pressureUnit ?? 'mmHg'}
            onChange={(e) => update({ pressureUnit: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
          >
            <option value="mmHg">мм</option>
            <option value="hPa">гПа</option>
            <option value="inHg">inHg</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function MultiEntitySelect({
  label,
  hint,
  domain,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  domain: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const states = useStates();
  const { registries } = useConnection();
  const [filter, setFilter] = useState('');
  const list = Object.keys(states)
    .filter((id) => id.startsWith(domain))
    .filter((id) => {
      if (!filter) return true;
      const f = filter.toLowerCase();
      const display = getEntityDisplay(states[id], registries, id);
      return (
        id.toLowerCase().includes(f) ||
        display.name.toLowerCase().includes(f) ||
        (display.area || '').toLowerCase().includes(f)
      );
    })
    .sort();

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  return (
    <div>
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      {hint && <div className="text-[10px] text-text-tertiary mb-1.5">{hint}</div>}
      <input
        type="text"
        placeholder="🔍 поиск…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-1.5 mb-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
      />
      <div className="max-h-44 overflow-y-auto p-2 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
        {value.length > 0 && (
          <div className="text-[10px] text-text-tertiary mb-1.5">
            Выбрано: {value.length}
          </div>
        )}
        {list.slice(0, 80).map((id) => {
          const display = getEntityDisplay(states[id], registries, id);
          const label = display.area ? `${display.area} · ${display.name}` : display.name;
          const checked = value.includes(id);
          return (
            <label
              key={id}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/4 dark:hover:bg-white/4 rounded-sm px-1.5 py-1"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="truncate">{label}</span>
            </label>
          );
        })}
        {list.length === 0 && (
          <div className="text-xs text-text-tertiary text-center py-2">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
}
