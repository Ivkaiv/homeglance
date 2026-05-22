'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, Eye, EyeOff, Download, Upload, Cloud, Activity } from 'lucide-react';
import { usePages } from '@/lib/pages/PagesProvider';
import { buildGlucosePage } from '@/lib/pages/presets';
import { extractEntities, buildImportPlan } from '@/lib/lovelace/import';
import {
  DEFAULT_WEATHER_SECTIONS,
  type Page,
  type WeatherPageConfig,
  type WeatherPageSections,
} from '@/lib/pages/types';
import {
  serializeLayout,
  parseLayout,
  downloadJson,
  pickJsonFile,
  makeFilename,
  ImportError,
} from '@/lib/pages/import-export';
import { useStates, useConnection } from '@/lib/ha/ConnectionProvider';
import { getEntityDisplay } from '@/lib/ha/entity-display';
import { useT } from '@/lib/i18n/I18nProvider';
import { SearchableEntitySelect, type EntityOption } from '@/components/ui/SearchableEntitySelect';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function PageManagerSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { pages, addPage, updatePage, deletePage, reorderPages } = usePages();
  const { client, states, isReady } = useConnection();
  const [editing, setEditing] = useState<Page | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Page | null>(null);
  const [importMessage, setImportMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [lovelaceBusy, setLovelaceBusy] = useState(false);

  function startNew() {
    setEditing({ id: '', title: '', icon: '📄', kind: 'grid', widgets: [] });
  }

  function addGlucosePreset() {
    const preset = buildGlucosePage(t);
    const created = addPage(preset);
    setImportMessage({
      kind: 'success',
      text: t('page.manager.glucosePresetAdded', {
        title: created.title,
        n: preset.widgets.length,
      }),
    });
  }

  function exportPage(page: Page) {
    downloadJson(makeFilename(page.title), serializeLayout([page]));
  }

  function exportAll() {
    downloadJson(makeFilename('all-pages'), serializeLayout(pages));
  }

  async function importLayout() {
    const text = await pickJsonFile();
    if (!text) return;
    try {
      const data = parseLayout(text);
      // Импортируем как новые страницы, чтобы не перетереть существующие.
      // addPage сам разрулит коллизии id (добавит -2/-3 суффикс).
      let imported = 0;
      for (const p of data.pages) {
        addPage({
          title: p.title,
          icon: p.icon,
          kind: p.kind,
          widgets: p.widgets,
          weather: p.weather,
        });
        imported++;
      }
      setImportMessage({ kind: 'success', text: t('pages.manager.importSuccess', { n: imported }) });
    } catch (e: unknown) {
      const hint = e instanceof ImportError ? e.hint : undefined;
      const key = hint ? `pages.manager.importError.${hint}` : 'pages.manager.importError.generic';
      setImportMessage({ kind: 'error', text: t(key) });
    }
  }

  async function importFromLovelace() {
    if (!isReady) {
      setImportMessage({ kind: 'error', text: t('pages.manager.importLovelace.error.notReady') });
      return;
    }
    setLovelaceBusy(true);
    setImportMessage(null);
    try {
      // Берём дефолтный dashboard (url_path=null). Если у пользователя
      // несколько dashboards — добавим выбор отдельной итерацией.
      const config = await client.getLovelaceConfig(null);
      if (!config) {
        setImportMessage({
          kind: 'error',
          text: t('pages.manager.importLovelace.error.noConfig'),
        });
        return;
      }
      const found = extractEntities(config);
      const plan = buildImportPlan(found, states, 9);
      if (plan.widgets.length === 0) {
        setImportMessage({
          kind: 'error',
          text: t('pages.manager.importLovelace.error.empty'),
        });
        return;
      }
      const created = addPage({
        title: t('page.manager.importedPageTitle'),
        icon: '🏠',
        kind: 'grid',
        widgets: plan.widgets,
      });
      setImportMessage({
        kind: 'success',
        text: t('pages.manager.importLovelace.success', {
          title: created.title,
          n: plan.widgets.length,
          total: plan.validCount,
        }),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setImportMessage({
        kind: 'error',
        text: t('pages.manager.importError.generic') + ': ' + message,
      });
    } finally {
      setLovelaceBusy(false);
    }
  }

  function save(p: Page) {
    if (p.id) {
      updatePage(p.id, {
        title: p.title,
        icon: p.icon,
        weather: p.weather,
        music: p.music,
      });
    } else {
      addPage({
        title: p.title,
        icon: p.icon,
        kind: p.kind,
        weather: p.weather,
        music: p.music,
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
        title={editing ? undefined : t('page.manager.sheetTitle')}
        subtitle={editing ? undefined : t('page.manager.sheetSubtitle')}
        ariaLabel={
          editing
            ? editing.id
              ? t('page.manager.ariaEditPage')
              : t('page.manager.ariaNewPage')
            : t('page.manager.ariaManage')
        }
      >
        {!editing ? (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className={`px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm ${
                    p.hidden ? 'opacity-60' : ''
                  }`}
                >
                  {/* Title row — занимает всю ширину на mobile, чтобы actions
                      ушли на вторую строку и не давили друг на друга. */}
                  <div className="flex items-center gap-2 min-w-0 flex-1 basis-full sm:basis-auto">
                    <span className="text-xl shrink-0" aria-hidden="true">{p.icon}</span>
                    <span className="flex-1 truncate">
                      {p.title}
                      {p.kind === 'weather' && (
                        <span className="text-[10px] text-amber-300/80 ml-2">{t('page.manager.badge.weather')}</span>
                      )}
                      {p.kind === 'music' && (
                        <span className="text-[10px] text-fuchsia-300/80 ml-2">{t('page.manager.badge.music')}</span>
                      )}
                      {p.hidden && (
                        <span className="text-[10px] text-text-tertiary ml-2">{t('page.manager.badge.hidden')}</span>
                      )}
                      {p.protected && (
                        <span className="text-[10px] text-text-tertiary ml-2">{t('page.manager.badge.protected')}</span>
                      )}
                    </span>
                  </div>
                  {/* Actions row — компактные иконки, фиксированный размер 32×32. */}
                  <div className="flex items-center gap-0.5 ml-auto">
                    <ActionIcon
                      onClick={() => updatePage(p.id, { hidden: !p.hidden })}
                      title={p.hidden ? t('page.manager.show') : t('page.manager.hide')}
                      aria-label={
                        p.hidden
                          ? t('page.manager.showAria', { title: p.title })
                          : t('page.manager.hideAria', { title: p.title })
                      }
                    >
                      {p.hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      aria-label={t('page.manager.moveUp')}
                    >
                      <ChevronUp size={14} aria-hidden="true" />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => moveDown(idx)}
                      disabled={idx >= pages.length - 1}
                      aria-label={t('page.manager.moveDown')}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => exportPage(p)}
                      aria-label={t('pages.manager.exportPage')}
                      title={t('pages.manager.exportPage')}
                    >
                      <Download size={14} aria-hidden="true" />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => setEditing(p)}
                      aria-label={t('page.manager.editAria', { title: p.title })}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </ActionIcon>
                    {/* Кнопка удаления показывается всегда — даже для protected
                        страниц. Защита от «остаться с 0 страниц» уже встроена
                        в `deletePage`: при удалении последней автоматически
                        создаётся пустая «Главная». До этого protected-страницы
                        нельзя было удалить через UI вообще — после импорта
                        раскладки появлялся дубль «Главная», и старую пустую
                        protected-страницу удалить было нельзя. */}
                    <ActionIcon
                      onClick={() => setConfirmDelete(p)}
                      aria-label={t('page.manager.deleteAria', { title: p.title })}
                      variant="danger"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </ActionIcon>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startNew}
              className="w-full px-4 py-3 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            >
              <Plus size={16} aria-hidden="true" /> {t('pages.manager.add')}
            </button>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={importLayout}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                <Upload size={14} aria-hidden="true" /> {t('pages.manager.import')}
              </button>
              <button
                onClick={exportAll}
                disabled={pages.length === 0}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                <Download size={14} aria-hidden="true" /> {t('pages.manager.exportAll')}
              </button>
            </div>

            <button
              onClick={importFromLovelace}
              disabled={!isReady || lovelaceBusy}
              className="mt-2 w-full px-3 py-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs flex items-center justify-center gap-1.5 hover:bg-purple-500/25 disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-400/70"
            >
              <Cloud size={14} aria-hidden="true" />
              {lovelaceBusy ? t('pages.manager.importLovelace.busy') : t('pages.manager.importLovelace')}
            </button>

            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                {t('page.manager.readyPages')}
              </div>
              <button
                onClick={addGlucosePreset}
                className="w-full px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/25 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-400/70"
              >
                <Activity size={14} aria-hidden="true" />
                {t('page.manager.glucosePreset')}
              </button>
              <div className="text-[10px] text-text-tertiary mt-1.5 leading-snug">
                {t('page.manager.glucosePresetHint')}
              </div>
            </div>

            {importMessage && (
              <div
                role="status"
                className={`mt-3 text-xs px-3 py-2 rounded-lg border ${
                  importMessage.kind === 'success'
                    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-300/20'
                    : 'text-red-300 bg-red-500/10 border-red-300/20'
                }`}
              >
                {importMessage.text}
              </div>
            )}
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
        title={confirmDelete ? t('page.manager.deleteTitle', { title: confirmDelete.title }) : ''}
        message={t('page.manager.deleteMessage')}
        confirmLabel={t('common.delete')}
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
  const t = useT();
  const [page, setPage] = useState<Page>({
    ...initial,
    kind: initial.kind ?? 'grid',
  });
  const isNew = !page.id;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-text-tertiary uppercase tracking-wider">{t('page.manager.editor.section')}</div>
          <div className="text-lg font-medium">
            {page.id ? t('page.manager.editor.editing') : t('page.manager.editor.newPage')}
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label={t('page.manager.editor.backToList')}
          title={t('common.back')}
          className="w-9 h-9 rounded-full bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs text-text-secondary mb-1">{t('page.manager.editor.nameLabel')}</div>
          <input
            type="text"
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
            placeholder={t('page.manager.editor.namePlaceholder')}
            className="w-full px-3 py-2 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
          />
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">{t('page.manager.editor.iconLabel')}</div>
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
            <div className="text-xs text-text-secondary mb-1">{t('page.manager.editor.kindLabel')}</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPage({ ...page, kind: 'grid' })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page.kind === 'grid'
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
                }`}
              >
                {t('page.manager.editor.kind.grid')}
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
                {t('page.manager.editor.kind.weather')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage({
                    ...page,
                    kind: 'music',
                    icon: page.icon === '📄' ? '🎵' : page.icon,
                    music: page.music || {},
                  })
                }
                className={`px-3 py-2 rounded-md border text-sm ${
                  page.kind === 'music'
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary'
                }`}
              >
                {t('page.manager.editor.kind.music')}
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
          {t('common.cancel')}
        </button>
        <button
          disabled={
            !page.title.trim() ||
            (page.kind === 'weather' && !page.weather?.weatherEntity)
          }
          onClick={() => onSave(page)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Check size={16} /> {t('common.save')}
        </button>
      </div>
    </>
  );
}

// i18n-ключи подписей секций; перевод делается в компоненте.
const SECTION_LABEL_KEYS: Record<keyof WeatherPageSections, string> = {
  header: 'page.manager.section.header',
  alerts: 'page.manager.section.alerts',
  hourly: 'page.manager.section.hourly',
  daily: 'page.manager.section.daily',
  extras: 'page.manager.section.extras',
  lightning: 'page.manager.section.lightning',
  storm: 'page.manager.section.storm',
};

function WeatherPageConfigEditor({
  config,
  onChange,
}: {
  config?: WeatherPageConfig;
  onChange: (c: WeatherPageConfig) => void;
}) {
  const t = useT();
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
        {t('page.manager.weatherSettings')}
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">{t('page.manager.weatherProvider')}</div>
        <SearchableEntitySelect
          value={c.weatherEntity || undefined}
          onChange={(v) => update({ weatherEntity: v ?? '' })}
          options={weatherOptions}
          placeholder={t('page.manager.pickPlaceholder')}
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">
          {t('page.manager.outdoorTemp')}
        </div>
        <SearchableEntitySelect
          value={c.outdoorTempEntity}
          onChange={(v) => update({ outdoorTempEntity: v })}
          options={tempSensorOptions}
          placeholder={t('page.manager.useProvider')}
          emptyOptionLabel={t('page.manager.useProviderOption')}
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1">
          {t('page.manager.apparentSensor')}
        </div>
        <SearchableEntitySelect
          value={c.apparentTempEntity}
          onChange={(v) => update({ apparentTempEntity: v })}
          options={tempSensorOptions}
          placeholder={t('page.manager.takeFromProvider')}
          emptyOptionLabel={t('page.manager.takeFromProviderOption')}
        />
      </div>

      <div>
        <div className="text-xs text-text-secondary mb-1.5">{t('page.manager.whichSections')}</div>
        <div className="flex flex-col gap-1 p-2 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
          {(Object.keys(SECTION_LABEL_KEYS) as Array<keyof WeatherPageSections>).map((k) => (
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
              <span>{t(SECTION_LABEL_KEYS[k])}</span>
            </label>
          ))}
        </div>
      </div>

      {c.sections.alerts && (
        <MultiEntitySelect
          label={t('page.manager.alertEntities')}
          hint={t('page.manager.alertEntitiesHint')}
          domain="sensor."
          value={c.alertEntities ?? []}
          onChange={(v) => update({ alertEntities: v })}
        />
      )}

      {c.sections.extras && (
        <MultiEntitySelect
          label={t('page.manager.extraSensors')}
          hint={t('page.manager.extraSensorsHint')}
          domain="sensor."
          value={c.extraSensors ?? []}
          onChange={(v) => update({ extraSensors: v })}
        />
      )}

      {c.sections.lightning && (
        <MultiEntitySelect
          label={t('page.manager.lightningSensors')}
          hint={t('page.manager.lightningSensorsHint')}
          domain="sensor."
          value={c.lightningSensors ?? []}
          onChange={(v) => update({ lightningSensors: v })}
        />
      )}

      {c.sections.storm && (
        <div className="flex flex-col gap-2 p-3 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary">
            {t('page.manager.stormRadarTitle')}
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              {t('page.manager.stormDistance')}
            </div>
            <SearchableEntitySelect
              value={c.stormDistanceEntity}
              onChange={(v) => update({ stormDistanceEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              {t('page.manager.stormBearing')}
            </div>
            <SearchableEntitySelect
              value={c.stormBearingEntity}
              onChange={(v) => update({ stormBearingEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">
              {t('page.manager.stormMovement')}
            </div>
            <SearchableEntitySelect
              value={c.stormEntity}
              onChange={(v) => update({ stormEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary mt-2">
            {t('page.manager.geomagneticTitle')}
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">{t('page.manager.today')}</div>
            <SearchableEntitySelect
              value={c.magneticStormEntity}
              onChange={(v) => update({ magneticStormEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">{t('page.manager.tomorrow')}</div>
            <SearchableEntitySelect
              value={c.magneticStormTomorrowEntity}
              onChange={(v) => update({ magneticStormTomorrowEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">{t('page.manager.afterTomorrow')}</div>
            <SearchableEntitySelect
              value={c.magneticStormAfterTomorrowEntity}
              onChange={(v) => update({ magneticStormAfterTomorrowEntity: v })}
              options={allSensorOptions}
              placeholder={t('page.manager.none')}
              emptyOptionLabel={t('page.manager.none')}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <div>
          <div className="text-xs text-text-secondary mb-1">{t('page.manager.unit.temp')}</div>
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
          <div className="text-xs text-text-secondary mb-1">{t('page.manager.unit.wind')}</div>
          <select
            value={c.windUnit ?? 'm/s'}
            onChange={(e) => update({ windUnit: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
          >
            <option value="m/s">{t('page.manager.unit.windMs')}</option>
            <option value="km/h">{t('page.manager.unit.windKmh')}</option>
            <option value="mph">{t('page.manager.unit.windMph')}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">{t('page.manager.unit.pressure')}</div>
          <select
            value={c.pressureUnit ?? 'mmHg'}
            onChange={(e) => update({ pressureUnit: e.target.value as any })}
            className="w-full px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
          >
            <option value="mmHg">{t('page.manager.unit.pressureMm')}</option>
            <option value="hPa">{t('page.manager.unit.pressureHpa')}</option>
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
  const t = useT();
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
        placeholder={t('page.manager.multiSelect.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-1.5 mb-1 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
      />
      <div className="max-h-44 overflow-y-auto p-2 rounded-md bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10">
        {value.length > 0 && (
          <div className="text-[10px] text-text-tertiary mb-1.5">
            {t('page.manager.multiSelect.selected', { n: value.length })}
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
          <div className="text-xs text-text-tertiary text-center py-2">{t('page.manager.multiSelect.notFound')}</div>
        )}
      </div>
    </div>
  );
}

function ActionIcon({
  onClick,
  disabled,
  title,
  "aria-label": ariaLabel,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  "aria-label": string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  const base =
    "w-8 h-8 rounded-md flex items-center justify-center disabled:opacity-20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-secondary";
  const tone =
    variant === "danger"
      ? "text-red-300/85 hover:bg-red-500/20 focus-visible:ring-red-300"
      : "text-text-secondary hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-accent/70";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`${base} ${tone}`}
    >
      {children}
    </button>
  );
}
