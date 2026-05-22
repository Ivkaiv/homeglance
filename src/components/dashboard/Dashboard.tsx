'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Settings, Plus, X, Sliders, Cog, Check, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { registerBuiltinWidgets } from '@/components/widgets';
import { getWidget } from '@/lib/widgets/registry';
import type { WidgetConfig } from '@/lib/widgets/types';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { WidgetSkeleton } from '@/components/widgets/_states';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { useT } from '@/lib/i18n/I18nProvider';
import { usePages } from '@/lib/pages/PagesProvider';
import { DockBar } from './DockBar';
import { ProfileSwitcher } from '@/components/profile/ProfileSwitcher';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RGLGrid, RGLItem } from './RGLGrid';
import { useLongPress } from '@/lib/gestures/useLongPress';
import { generatePageContent } from '@/lib/wizard/autoGenerate';
import { Wand2 } from 'lucide-react';
import { flowLayout } from '@/lib/layout/flow';

// Тяжёлые редко-используемые куски — lazy-load. Эти модалки и weather-страница
// открываются только по действию пользователя (edit-mode, long-press, выбор weather-page),
// поэтому в initial bundle они тащат лишние ~200кб.
const AddWidgetSheet = dynamic(() => import('./AddWidgetSheet').then((m) => m.AddWidgetSheet), {
  ssr: false,
});
const ConfigSheet = dynamic(() => import('./ConfigSheet').then((m) => m.ConfigSheet), {
  ssr: false,
});
const PageManagerSheet = dynamic(
  () => import('./PageManagerSheet').then((m) => m.PageManagerSheet),
  { ssr: false }
);
const WidgetContextMenu = dynamic(
  () => import('./WidgetContextMenu').then((m) => m.WidgetContextMenu),
  { ssr: false }
);
const WeatherPageView = dynamic(
  () => import('@/components/weather-page/WeatherPageView').then((m) => m.WeatherPageView),
  { ssr: false }
);
const MusicPageView = dynamic(
  () => import('@/components/music-page/MusicPageView').then((m) => m.MusicPageView),
  { ssr: false }
);

// Grid скопирован 1:1 из reference-проекта ha-pwa-lab: 24/16/12/9 колонок
// × ROW_HEIGHT 32px, minSize виджетов 2×2 (см. ADR 007).
//
// MAX_GRID_WIDTH — раскладка хранит ОДИН набор координат w/h. Если число
// колонок меняется между breakpoint'ами, та же раскладка на десктопе
// расползается: виджеты, собранные в 9-col сетке (≈ как на телефоне или
// импорт с другого устройства), занимают левые ~37% 24-col грида и
// «прилипают» к левому краю. Решение: на широких экранах грид не тянется
// во всю ширину, а ограничен 760px и центрируется. При effectiveWidth ≤ 760
// COLS_BY_WIDTH всегда даёт 9 — раскладка выглядит одинаково на телефоне и
// на десктопе (на десктопе — как центрированная колонка).
const MAX_GRID_WIDTH = 760;
const COLS_BY_WIDTH = [
  { min: 1200, cols: 24 },
  { min: 996, cols: 16 },
  { min: 768, cols: 12 },
  { min: 0, cols: 9 },
];
const ROW_HEIGHT = 32;
const GAP = 10;

function useResponsiveCols() {
  const [cols, setCols] = useState(9);
  useEffect(() => {
    const update = () => {
      // Считаем от ширины грид-контейнера (клампится к MAX_GRID_WIDTH),
      // а не от window.innerWidth — иначе на десктопе cols=24, а контейнер
      // узкий, и ячейки выходят микроскопическими.
      const w = Math.min(window.innerWidth, MAX_GRID_WIDTH);
      const found = COLS_BY_WIDTH.find((b) => w >= b.min);
      setCols(found ? found.cols : 9);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

interface DashboardProps {
  /**
   * Под HA Ingress sandbox iframe не пускает window.location-навигацию,
   * поэтому settings рендерится inline на главной (см. app/page.tsx).
   * Если prop передан, кнопка «Настройки» дёргает его вместо <Link>.
   */
  onOpenSettings?: () => void;
}

export function Dashboard({ onOpenSettings }: DashboardProps = {}) {
  const t = useT();
  const { current, setWidgets } = usePages();
  const { isReady, states, registries } = useConnection();
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [managingPages, setManagingPages] = useState(false);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const cols = useResponsiveCols();

  useEffect(() => {
    registerBuiltinWidgets();
  }, []);

  const widgets = current?.widgets ?? [];

  function addWidget(type: string) {
    if (!current) return;
    const meta = getWidget(type)?.meta;
    if (!meta) return;
    const i = `${type}-${Date.now()}`;
    const defaultParams = Object.fromEntries(
      meta.paramSchema.filter((f) => f.default !== undefined).map((f) => [f.key, f.default])
    );
    // Кладём в самый конец сетки — RGL сам подвинет «вверх» при vertical compact
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    setWidgets(current.id, [
      ...widgets,
      { i, type, x: 0, y: maxY, w: meta.defaultSize.w, h: meta.defaultSize.h, params: defaultParams },
    ]);
    setAdding(false);
    if (meta.paramSchema.some((f) => f.required)) setConfiguring(i);
  }

  function removeWidget(id: string) {
    if (!current) return;
    setWidgets(current.id, widgets.filter((w) => w.i !== id));
  }

  function updateParams(id: string, params: Record<string, any>) {
    if (!current) return;
    setWidgets(
      current.id,
      widgets.map((w) => (w.i === id ? { ...w, params: { ...w.params, ...params } } : w))
    );
  }

  function applyLayoutChange(updated: RGLItem[]) {
    if (!current) return;
    const map = new Map(updated.map((u) => [u.i, u]));
    setWidgets(
      current.id,
      widgets.map((w) => {
        const u = map.get(w.i);
        if (!u) return w;
        return { ...w, x: u.x, y: u.y, w: u.w, h: u.h };
      })
    );
  }

  // Migration / responsive reflow: перепаковываем виджеты через flowLayout если:
  //  (а) все позиции в (0,0) — свежий импорт или старая раскладка без x/y
  //  (б) какой-то виджет вылезает за текущее число колонок (x+w > cols) —
  //      раскладка была собрана на широком экране, теперь открыли на узком
  //      и виджеты «слипаются» в одну колонку слева, потому что RGL клампит x.
  // Сохраняем reading-order (порядок в массиве) и подкладываем реальные x/y.
  const needsSeed =
    !!current &&
    widgets.length > 1 &&
    (
      widgets.every((w) => w.x === 0 && w.y === 0) ||
      widgets.some((w) => (w.x ?? 0) + w.w > cols)
    );

  useEffect(() => {
    if (!needsSeed || !current) return;
    const seeded = flowLayout(
      widgets.map((w) => ({ i: w.i, w: Math.min(w.w, cols), h: w.h })),
      cols
    );
    const map = new Map(seeded.map((p) => [p.i, p]));
    setWidgets(
      current.id,
      widgets.map((w) => {
        const p = map.get(w.i);
        return p ? { ...w, x: p.x, y: p.y, w: p.w } : w;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSeed, current?.id, cols]);

  if (!current) {
    return <div className="p-8 text-text-tertiary">{t('page.dashboard.noPages')}</div>;
  }

  const rglItems: RGLItem[] = widgets.map((w) => {
    const entry = getWidget(w.type);
    // Если виджет даёт динамический minSize по своим параметрам (например
    // RoomHubWidget — больше когда подключён плеер/climate/сенсоры), берём его.
    // Иначе — статический minSize из meta.
    const dynMin = entry?.computeMinSize?.(w.params);
    const minW = dynMin?.w ?? entry?.meta.minSize.w ?? 1;
    const minH = dynMin?.h ?? entry?.meta.minSize.h ?? 1;
    // Если сохранённое значение w/h меньше нового minW/minH (после
    // расширения параметров — добавили media/climate и т.п.) — подтягиваем.
    // RGL уважает minW/minH при ресайзе, но не корректирует уже
    // существующий layout: без этого старые узкие виджеты остаются
    // меньше своего фактического минимума.
    return {
      i: w.i,
      x: w.x ?? 0,
      y: w.y ?? 0,
      w: Math.max(w.w, minW),
      h: Math.max(w.h, minH),
      minW,
      minH,
    };
  });

  return (
    <div className="min-h-screen pb-32">
      {/* sticky-header не наследует safe-area родителя (он уходит к верху
          viewport, под notch). Прибиваем его именно к нижней границе
          safe-area-inset-top — заголовок всегда стоит под status bar. */}
      <header
        className="sticky z-30 backdrop-blur-md bg-bg-primary/80 border-b border-black/5 dark:border-white/5 px-3 sm:px-4 py-3 flex items-center justify-between gap-2"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        {/* Левый блок (название страницы) уступает кнопкам в edit-mode на mobile,
            чтобы хватило ширины для всех кнопок. В обычном режиме показываем
            полностью. */}
        <div className={`flex items-center gap-2.5 min-w-0 ${editing ? 'shrink' : ''}`}>
          <span className="text-2xl sm:text-3xl shrink-0 leading-none">{current.icon}</span>
          <div className={`min-w-0 ${editing ? 'hidden sm:block' : ''}`}>
            <div className="text-base sm:text-lg font-medium truncate leading-tight">{current.title}</div>
            <div className="text-[10px] text-text-tertiary hidden sm:block">{t('page.dashboard.brand')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ProfileSwitcher />
          {onOpenSettings ? (
            <button
              onClick={onOpenSettings}
              title={t('dashboard.settings')}
              aria-label={t('dashboard.settings')}
              className="px-2.5 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-xs flex items-center hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <Sliders size={14} aria-hidden="true" />
            </button>
          ) : (
            <Link
              href="/settings"
              title={t('dashboard.settings')}
              aria-label={t('dashboard.settings')}
              className="px-2.5 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-xs flex items-center hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              <Sliders size={14} aria-hidden="true" />
            </Link>
          )}
          {editing && (
            <>
              <button
                onClick={() => setManagingPages(true)}
                aria-label={t('dashboard.pages')}
                title={t('dashboard.pages')}
                className="px-2.5 sm:px-3 py-2 rounded-full bg-sky-500/15 border border-sky-300/25 text-sky-100 text-xs flex items-center gap-1.5"
              >
                <LayoutGrid size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{t('dashboard.pages')}</span>
              </button>
              {current.kind !== 'weather' && current.kind !== 'music' && (
                <button
                  onClick={() => setAdding(true)}
                  aria-label={t('dashboard.addWidget')}
                  title={t('dashboard.addWidget')}
                  className="px-2.5 sm:px-3 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">{t('dashboard.addWidget')}</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? t('dashboard.doneButton') : t('dashboard.editButton')}
            title={editing ? t('dashboard.doneButton') : t('dashboard.editButton')}
            // В edit-режиме кнопка визуально превращается в «Готово»: акцентный
            // фон, галочка вместо шестерёнки, видимый текст даже на мобиле.
            // Раньше иконка оставалась Cog на мобиле без текста, и пользователь
            // не сразу понимал что эта же кнопка выходит из режима.
            className={`px-2.5 sm:px-3 py-2 rounded-full text-xs flex items-center gap-1.5 transition ${
              editing
                ? 'bg-accent/20 border border-accent/40 text-accent'
                : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary'
            }`}
          >
            {editing ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Cog size={14} aria-hidden="true" />
            )}
            <span className={editing ? 'inline' : 'hidden sm:inline'}>
              {editing ? t('dashboard.doneButton') : t('dashboard.editButton')}
            </span>
          </button>
        </div>
      </header>

      {current.kind === 'music' ? (
        <main key={current.id} className="page-fade-in">
          <MusicPageView config={current.music ?? {}} pageTitle={current.title} />
        </main>
      ) : current.kind === 'weather' && current.weather ? (
        <main key={current.id} className="page-fade-in">
          <WeatherPageView config={current.weather} pageTitle={current.title} />
        </main>
      ) : widgets.length === 0 ? (
        <main
          key={current.id}
          className="page-fade-in flex flex-col items-center justify-center px-6 text-center text-text-tertiary"
          style={{ minHeight: 'calc(100vh - 200px)' }}
        >
          <div className="text-6xl mb-3">{current.icon}</div>
          <div className="mb-4 text-sm">
            {t('dashboard.empty.title', { title: current.title })}
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                if (!current) return;
                const result = generatePageContent(current.title, states, registries);
                setMagicMessage(result.message);
                if (result.ok && result.widgets.length > 0) {
                  setWidgets(current.id, result.widgets);
                }
              }}
              disabled={!isReady}
              className="px-5 py-2.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-400 dark:text-purple-300 text-sm flex items-center gap-2 hover:bg-purple-500/30 disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-400/70"
              title={t('dashboard.empty.autoFillTooltip')}
            >
              <Wand2 size={14} aria-hidden="true" />
              {t('dashboard.empty.autoFill')}
            </button>
            <button
              onClick={() => {
                setEditing(true);
                setAdding(true);
              }}
              className="px-5 py-2.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              {t('dashboard.empty.addManual')}
            </button>
            {magicMessage && (
              <div className="mt-3 max-w-sm text-xs text-text-tertiary px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                {magicMessage}
              </div>
            )}
          </div>
        </main>
      ) : (
        <main
          key={current.id}
          className="page-fade-in p-3 mx-auto w-full"
          style={{ maxWidth: MAX_GRID_WIDTH }}
        >
          <RGLGrid
            items={rglItems}
            cols={cols}
            rowHeight={ROW_HEIGHT}
            gap={GAP}
            editing={editing}
            onLayoutChange={applyLayoutChange}
            renderItem={(item) => {
              const w = widgets.find((x) => x.i === item.i);
              if (!w) return null;
              if (!isReady) return <WidgetSkeleton />;
              const entry = getWidget(w.type);
              const Component = entry?.Component;
              const inner = Component ? (
                <WidgetErrorBoundary widgetType={w.type} resetKey={JSON.stringify(w.params)}>
                  <Component params={w.params} />
                </WidgetErrorBoundary>
              ) : (
                <div className="glass h-full p-4 text-text-tertiary text-sm">
                  {t('dashboard.unknownWidget', { type: w.type })}
                </div>
              );
              // В edit-mode RGL уже накрывает виджет drag-overlay'ем — long-press
              // не сработает, и это правильно: тащишь чтобы переставить.
              // В обычном режиме — long-press открывает контекстное меню.
              if (editing) return inner;
              return (
                <LongPressWrapper
                  onLongPress={(p) => setCtxMenu({ id: item.i, x: p.clientX, y: p.clientY })}
                >
                  {inner}
                </LongPressWrapper>
              );
            }}
            renderControls={(item) => (
              <>
                {/*
                  Drag-handle — только верхняя полоса 36px шириной. Раньше overlay
                  закрывал весь виджет и блокировал scroll: палец на любом месте
                  виджета сразу запускал drag. Теперь основная площадь виджета
                  пропускает touch на scroll, а перетаскивать можно за «ручку»
                  с эмодзи-захватом.
                */}
                <div
                  className="rgl-drag-area absolute top-0 left-9 right-9 h-9 z-10 cursor-grab active:cursor-grabbing flex items-start justify-center pt-1.5"
                  style={{ touchAction: 'none' }}
                  title={t('common.edit')}
                >
                  <span
                    className="block w-9 h-1 rounded-full bg-black/30 dark:bg-white/40"
                    aria-hidden="true"
                  />
                </div>
                <button
                  onClick={() => setConfirmRemoveId(item.i)}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  className="no-drag absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg z-20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                >
                  <X size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setConfiguring(item.i)}
                  aria-label={t('configSheet.title')}
                  title={t('configSheet.title')}
                  className="no-drag absolute top-1 left-1 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white/70 text-xs flex items-center justify-center z-20 hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                >
                  <Settings size={13} aria-hidden="true" />
                </button>
              </>
            )}
          />
        </main>
      )}

      <DockBar editing={editing} onManagePages={() => setManagingPages(true)} />

      {adding && <AddWidgetSheet onAdd={addWidget} onClose={() => setAdding(false)} />}
      {managingPages && <PageManagerSheet onClose={() => setManagingPages(false)} />}
      {configuring && (
        <ConfigSheet
          widget={widgets.find((w) => w.i === configuring)!}
          onUpdate={(p) => updateParams(configuring, p)}
          onClose={() => setConfiguring(null)}
        />
      )}
      <ConfirmDialog
        open={!!confirmRemoveId}
        title={t('dashboard.removeWidget.title')}
        message={t('dashboard.removeWidget.body')}
        confirmLabel={t('dashboard.removeWidget.confirm')}
        cancelLabel={t('dashboard.removeWidget.cancel')}
        variant="danger"
        onConfirm={() => {
          if (confirmRemoveId) removeWidget(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
      {ctxMenu && (
        <WidgetContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onConfigure={() => setConfiguring(ctxMenu.id)}
          onDelete={() => setConfirmRemoveId(ctxMenu.id)}
        />
      )}
    </div>
  );
}

/** Обёртка, перехватывающая long-press на виджете и пробрасывающая
 *  координаты в callback. Не блокирует обычные клики внутри виджета —
 *  long-press срабатывает только если палец удержался > 500мс без движения. */
function LongPressWrapper({
  onLongPress,
  children,
}: {
  onLongPress: (p: { clientX: number; clientY: number }) => void;
  children: React.ReactNode;
}) {
  const handlers = useLongPress(onLongPress);
  return (
    <div className="contents" {...handlers}>
      {children}
    </div>
  );
}
