'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Page } from './types';
import type { WidgetConfig } from '@/lib/widgets/types';
import { loadPages, savePages, loadActivePageId, saveActivePageId } from './storage';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';

interface PagesContextValue {
  pages: Page[];
  current: Page | undefined;
  setCurrentId: (id: string) => void;

  addPage: (init?: Partial<Page>) => Page;
  updatePage: (id: string, patch: Partial<Page>) => void;
  deletePage: (id: string) => void;
  reorderPages: (ids: string[]) => void;

  setWidgets: (id: string, widgets: WidgetConfig[]) => void;
}

const PagesContext = createContext<PagesContextValue | null>(null);

function genId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[^a-zа-я0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `page-${Date.now()}`;
}

export function PagesProvider({ children }: { children: ReactNode }) {
  const { active } = useProfiles();
  const profileId = active?.id ?? null;
  const [pages, setPages] = useState<Page[]>([]);
  const [currentId, setCurrentIdState] = useState<string>('home');
  const [loaded, setLoaded] = useState(false);

  // При смене активного профиля — перезагружаем его страницы (с сервера).
  useEffect(() => {
    if (!profileId) {
      setPages([]);
      setCurrentIdState('home');
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    loadPages(profileId)
      .then((loadedPages) => {
        if (cancelled) return;
        setPages(loadedPages);
        const stored = loadActivePageId(profileId);
        if (stored && loadedPages.some((p) => p.id === stored)) {
          setCurrentIdState(stored);
        } else {
          setCurrentIdState(loadedPages[0]?.id ?? 'home');
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    if (loaded && profileId) {
      savePages(profileId, pages).catch(() => {});
    }
  }, [pages, loaded, profileId]);

  useEffect(() => {
    if (loaded && profileId) saveActivePageId(profileId, currentId);
  }, [currentId, loaded, profileId]);

  const setCurrentId = useCallback((id: string) => {
    setCurrentIdState(id);
  }, []);

  const addPage: PagesContextValue['addPage'] = useCallback((init) => {
    const title = init?.title || 'Новая';
    let id = init?.id || genId(title);
    const kind = init?.kind ?? 'grid';
    const newPage: Page = {
      id,
      title,
      icon: init?.icon || '📄',
      kind,
      widgets: init?.widgets || [],
      weather: init?.weather,
      protected: false,
    };
    setPages((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      let final = id;
      let n = 2;
      while (existing.has(final)) {
        final = `${id}-${n++}`;
      }
      id = final;
      newPage.id = id;
      return [...prev, newPage];
    });
    setCurrentIdState(id);
    return newPage;
  }, []);

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePage = useCallback(
    (id: string) => {
      // Один диспетч: вычисляем новый список и, если удаляли активную страницу,
      // тут же сбрасываем currentId на первую оставшуюся. Раньше было два
      // подряд `setPages`, что давало двойной ререндер всего дерева страниц.
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (next.length === 0) {
          // Никогда не оставляем 0 страниц
          const home: Page = {
            id: 'home',
            title: 'Главная',
            icon: '🏠',
            widgets: [],
            protected: true,
          };
          if (currentId === id) setCurrentIdState(home.id);
          return [home];
        }
        if (currentId === id && next[0]) setCurrentIdState(next[0].id);
        return next;
      });
    },
    [currentId]
  );

  const reorderPages = useCallback((ids: string[]) => {
    setPages((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      const next: Page[] = [];
      for (const id of ids) {
        const p = map.get(id);
        if (p) next.push(p);
      }
      // Добавим те что не были в новом порядке (не должно случиться)
      for (const p of prev) if (!ids.includes(p.id)) next.push(p);
      return next;
    });
  }, []);

  const setWidgets = useCallback((id: string, widgets: WidgetConfig[]) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, widgets } : p)));
  }, []);

  const current = pages.find((p) => p.id === currentId);

  // Не блокируем рендер если профиль не выбран — pages-stuff просто пустые
  return (
    <PagesContext.Provider
      value={{ pages, current, setCurrentId, addPage, updatePage, deletePage, reorderPages, setWidgets }}
    >
      {children}
    </PagesContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PagesContext);
  if (!ctx) throw new Error('usePages must be used inside <PagesProvider>');
  return ctx;
}
