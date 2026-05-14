'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { usePages } from '@/lib/pages/PagesProvider';

export function DockBar({
  editing,
  onManagePages,
}: {
  editing: boolean;
  onManagePages: () => void;
}) {
  const { pages, current, setCurrentId } = usePages();
  // В dock-баре не показываем скрытые страницы — но в режиме редактирования
  // их видно, чтобы можно было быстро переключиться и снять флаг.
  const visiblePages = pages.filter((p) => editing || !p.hidden);

  // При смене активной страницы — скроллим её в центр видимой части дока.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!current || !navRef.current) return;
    const el = navRef.current.querySelector<HTMLElement>(
      `[data-page-id="${CSS.escape(current.id)}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [current?.id]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none z-30 gap-1.5"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <motion.nav
        ref={navRef}
        aria-label="Страницы"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto rounded-full bg-bg-secondary/70 backdrop-blur-xl border border-black/12 dark:border-white/12 shadow-2xl px-2 py-2 flex items-end gap-1.5 max-w-[calc(100vw-1rem)] overflow-x-auto overflow-y-hidden dock-scroll"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: '12px',
        }}
      >
        {visiblePages.map((p) => (
          <DockItem
            key={p.id}
            id={p.id}
            label={p.title}
            icon={p.icon}
            active={p.id === current?.id}
            hidden={p.hidden}
            onClick={() => setCurrentId(p.id)}
          />
        ))}

        {editing && (
          <>
            <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-0.5 self-center shrink-0" />
            <DockButton
              label="Управление"
              onClick={onManagePages}
              icon={<LayoutGrid size={20} />}
            />
          </>
        )}
      </motion.nav>
    </div>
  );
}

function DockItem({
  id,
  label,
  icon,
  active,
  hidden,
  onClick,
}: {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  hidden?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      data-page-id={id}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.1, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      title={hidden ? `${label} (скрыта)` : label}
      aria-label={hidden ? `${label} (скрыта)` : label}
      aria-current={active ? 'page' : undefined}
      className={`relative w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
        active ? 'bg-accent/20 border border-accent/40' : 'hover:bg-black/5 dark:hover:bg-white/5'
      } ${hidden ? 'opacity-40' : ''}`}
      style={{
        scrollSnapAlign: 'center',
        ...(active ? { boxShadow: '0 0 16px rgb(var(--accent) / 0.4)' } : null),
      }}
    >
      <span className="leading-none" aria-hidden="true">{icon}</span>
      {hidden && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-text-tertiary border-2 border-bg-secondary" />
      )}
    </motion.button>
  );
}

function DockButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.1, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-text-secondary hover:bg-black/8 dark:hover:bg-white/8 hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
    >
      {icon}
    </motion.button>
  );
}
