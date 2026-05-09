'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  LayoutGrid,
  PenLine,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { useT } from '@/lib/i18n/I18nProvider';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { usePages } from '@/lib/pages/PagesProvider';
import { markWizardDone } from '@/lib/wizard/firstRun';
import { buildAutopilotPages, summarizeHA } from '@/lib/wizard/autopilot';
import { TEMPLATES } from '@/lib/wizard/templates';
import type { Page } from '@/lib/pages/types';

type Step = 'welcome' | 'autopilot' | 'templates' | 'applying';

/**
 * Полноэкранный wizard первого запуска.
 *
 * Показывается вместо Dashboard когда профиль свежий (см. firstRun.ts).
 * Три пути:
 *  - Auto-pilot — Glance читает HA и создаёт несколько страниц сам.
 *  - Templates — пользователь выбирает один из 5 шаблонов.
 *  - Empty — skip wizard, далее обычный пустой Dashboard.
 */
export function FirstRunWizard({ onFinish }: { onFinish: () => void }) {
  const t = useT();
  const { states, registries, isReady } = useConnection();
  const { active } = useProfiles();
  const { pages, addPage, updatePage, setWidgets } = usePages();

  const [step, setStep] = useState<Step>('welcome');
  const [applyingMessage, setApplyingMessage] = useState('');

  // Применяем набор страниц: первую — поверх дефолтной home, остальные —
  // отдельными addPage. Возвращаемся не в реальный dashboard, а через
  // onFinish — он сделает скрытие wizard'а в родителе.
  async function applyPages(newPages: Array<Omit<Page, 'protected' | 'hidden'>>) {
    if (!active) return;
    setStep('applying');
    setApplyingMessage(t('wizard.applying.preparing'));

    // Дефолтная страница «home» уже существует (создана PagesProvider'ом
    // если был пустой профиль). Найдём её по id, иначе используем первую.
    const home = pages.find((p) => p.id === 'home') ?? pages[0];
    const [first, ...rest] = newPages;

    if (home && first) {
      updatePage(home.id, { title: first.title, icon: first.icon });
      setWidgets(home.id, first.widgets);
    } else if (first) {
      addPage({
        title: first.title,
        icon: first.icon,
        kind: first.kind,
        widgets: first.widgets,
      });
    }

    for (const p of rest) {
      addPage({
        title: p.title,
        icon: p.icon,
        kind: p.kind,
        widgets: p.widgets,
      });
    }

    setApplyingMessage(t('wizard.applying.done'));
    // Небольшая пауза чтобы пользователь увидел «готово ✓», и закрываем.
    setTimeout(() => {
      markWizardDone(active.id);
      onFinish();
    }, 700);
  }

  function applyAutopilot() {
    if (!isReady) return;
    setStep('autopilot');
    // Сразу читаем HA, генерируем страницы. Имитируем секунду «анализа»
    // чтобы анимация была видна — реально работа занимает миллисекунды.
    const result = buildAutopilotPages(states, registries);
    setTimeout(() => applyPages(result.pages), 900);
  }

  function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find((x) => x.id === templateId);
    if (!tpl) return;
    const newPages = tpl.apply(states, registries);
    void applyPages(newPages);
  }

  function skipWizard() {
    if (active) markWizardDone(active.id);
    onFinish();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <WelcomeStep
                onAutopilot={applyAutopilot}
                onTemplates={() => setStep('templates')}
                onSkip={skipWizard}
              />
            </motion.div>
          )}

          {step === 'autopilot' && (
            <motion.div
              key="autopilot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AutopilotProgress states={states} registries={registries} />
            </motion.div>
          )}

          {step === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TemplatesStep onPick={applyTemplate} onBack={() => setStep('welcome')} />
            </motion.div>
          )}

          {step === 'applying' && (
            <motion.div
              key="applying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <ApplyingStep message={applyingMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Welcome ──────────────────────────────────────────────────────────────────
function WelcomeStep({
  onAutopilot,
  onTemplates,
  onSkip,
}: {
  onAutopilot: () => void;
  onTemplates: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  return (
    <div className="text-center">
      <div className="text-5xl mb-3">✨</div>
      <h1 className="text-2xl font-medium mb-2">{t('wizard.welcome.title')}</h1>
      <p className="text-sm text-text-secondary mb-8 max-w-md mx-auto">
        {t('wizard.welcome.subtitle')}
      </p>

      <div className="flex flex-col gap-3">
        <PathCard
          icon={<Wand2 size={20} aria-hidden="true" />}
          title={t('wizard.welcome.autopilot.title')}
          subtitle={t('wizard.welcome.autopilot.subtitle')}
          accent="purple"
          onClick={onAutopilot}
        />
        <PathCard
          icon={<LayoutGrid size={20} aria-hidden="true" />}
          title={t('wizard.welcome.templates.title')}
          subtitle={t('wizard.welcome.templates.subtitle')}
          accent="sky"
          onClick={onTemplates}
        />
        <PathCard
          icon={<PenLine size={20} aria-hidden="true" />}
          title={t('wizard.welcome.empty.title')}
          subtitle={t('wizard.welcome.empty.subtitle')}
          accent="neutral"
          onClick={onSkip}
        />
      </div>

      <p className="text-xs text-text-tertiary mt-6">{t('wizard.welcome.skipHint')}</p>
    </div>
  );
}

function PathCard({
  icon,
  title,
  subtitle,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: 'purple' | 'sky' | 'neutral';
  onClick: () => void;
}) {
  const tones = {
    purple: 'border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/15 text-purple-300',
    sky: 'border-sky-300/30 bg-sky-500/10 hover:bg-sky-500/15 text-sky-300',
    neutral: 'border-white/10 bg-white/5 hover:bg-white/10 text-text-secondary',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full px-5 py-4 rounded-2xl border text-left flex items-center gap-4 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${tones[accent]}`}
    >
      <div className="shrink-0 w-11 h-11 rounded-full bg-black/20 dark:bg-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-text-primary">{title}</div>
        <div className="text-xs text-text-secondary mt-0.5 leading-snug">{subtitle}</div>
      </div>
    </button>
  );
}

// ── Auto-pilot progress ──────────────────────────────────────────────────────
function AutopilotProgress({
  states,
  registries,
}: {
  states: ReturnType<typeof useConnection>['states'];
  registries: ReturnType<typeof useConnection>['registries'];
}) {
  const t = useT();
  const stats = summarizeHA(states, registries);
  const items = [
    { label: t('wizard.autopilot.areas'), value: stats.areas },
    { label: t('wizard.autopilot.lights'), value: stats.lights },
    { label: t('wizard.autopilot.switches'), value: stats.switches },
    { label: t('wizard.autopilot.climates'), value: stats.climates },
    { label: t('wizard.autopilot.cameras'), value: stats.cameras },
    { label: t('wizard.autopilot.scenes'), value: stats.scenes + stats.scripts },
    { label: t('wizard.autopilot.sensors'), value: stats.sensors },
  ];

  return (
    <div className="text-center">
      <div className="text-4xl mb-3">🪄</div>
      <h2 className="text-xl font-medium mb-1">{t('wizard.autopilot.title')}</h2>
      <p className="text-sm text-text-secondary mb-6">{t('wizard.autopilot.subtitle')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md mx-auto">
        {items
          .filter((i) => i.value > 0)
          .map((i) => (
            <motion.div
              key={i.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * Math.random() }}
              className="glass px-3 py-2 text-center"
            >
              <div className="text-2xl font-light tabular-nums">{i.value}</div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wide">
                {i.label}
              </div>
            </motion.div>
          ))}
      </div>

      <div className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        {t('wizard.autopilot.building')}
      </div>
    </div>
  );
}

// ── Templates ────────────────────────────────────────────────────────────────
function TemplatesStep({
  onPick,
  onBack,
}: {
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const t = useT();
  return (
    <div>
      <button
        onClick={onBack}
        className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1 text-sm mb-4"
      >
        <ChevronLeft size={18} aria-hidden="true" /> {t('common.back')}
      </button>

      <h2 className="text-2xl font-medium mb-2">{t('wizard.templates.title')}</h2>
      <p className="text-sm text-text-secondary mb-6">{t('wizard.templates.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onPick(tpl.id)}
            className="glass p-4 text-left flex flex-col gap-2 hover:bg-white/10 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tpl.emoji}</span>
              <span className="text-base font-medium">{tpl.title}</span>
            </div>
            <div className="text-xs text-text-secondary leading-snug">{tpl.description}</div>
            <ul className="text-[10px] text-text-tertiary mt-1 space-y-0.5">
              {tpl.preview.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Applying ─────────────────────────────────────────────────────────────────
function ApplyingStep({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="inline-block"
        >
          ✨
        </motion.span>
      </div>
      <div className="text-base text-text-secondary inline-flex items-center gap-2">
        {message.includes('готово') || message.includes('done') ? (
          <Check size={16} className="text-emerald-400" aria-hidden="true" />
        ) : (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        )}
        {message}
      </div>
    </div>
  );
}
