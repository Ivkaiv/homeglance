'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/i18n/I18nProvider';
import {
  loadExternalWidgetUrls,
  saveExternalWidgetUrls,
} from '@/lib/sdk/external-loader';

const DOCS_URL = 'https://github.com/Ivkaiv/homeglance/blob/main/docs/15-sdk.md';

export function ExternalWidgetsSection() {
  const t = useT();
  const [urls, setUrls] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setUrls(loadExternalWidgetUrls());
  }, []);

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (urls.includes(v)) {
      setDraft('');
      return;
    }
    if (!/^https?:\/\//i.test(v)) return;
    const next = [...urls, v];
    setUrls(next);
    saveExternalWidgetUrls(next);
    setDraft('');
  }

  function remove(url: string) {
    const next = urls.filter((u) => u !== url);
    setUrls(next);
    saveExternalWidgetUrls(next);
  }

  return (
    <div className="text-sm">
      <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-300/20 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{t('settings.external.description')}</span>
      </div>

      {urls.length === 0 ? (
        <div className="text-xs text-text-tertiary px-3 py-2 rounded-lg bg-white/5 border border-white/10 mb-3">
          {t('settings.external.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-3">
          {urls.map((u) => (
            <div
              key={u}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <span className="flex-1 text-xs font-mono break-all text-text-secondary">{u}</span>
              <button
                onClick={() => remove(u)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-red-300/85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder={t('settings.external.placeholder')}
          className="flex-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-text-primary text-xs font-mono focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-3 py-2 rounded-md bg-accent/20 border border-accent/40 text-accent text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-accent/30"
        >
          <Plus size={14} aria-hidden="true" /> {t('settings.external.add')}
        </button>
      </div>

      <p className="text-xs text-text-tertiary mt-3 leading-relaxed">
        {t('settings.external.reloadHint')}
      </p>

      <a
        href={DOCS_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="text-xs text-accent inline-flex items-center gap-1 mt-2 hover:underline"
      >
        {t('settings.external.docs')} <ExternalLink size={11} aria-hidden="true" />
      </a>
    </div>
  );
}
