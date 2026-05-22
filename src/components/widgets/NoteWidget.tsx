'use client';

import { GlanceIcon } from '@/components/icons/MdiIcon';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  text?: string;
  icon?: string;
  color?: string;
}

export function NoteWidget({ params }: { params: Params }) {
  const t = useT();
  const text = params.text || t('w.note.defaultText');
  const iconValue = params.icon;
  const color = params.color;

  // tiny (<80): иконка или первые 4 символа по центру
  // small (80-140): иконка сверху + мелкий текст, паддинг 3
  // medium+ (>=140): иконка покрупнее + обычный текст
  return (
    <div
      className="glass h-full w-full flex items-center justify-center @[80px]:flex-col @[80px]:items-stretch @[80px]:justify-start @[80px]:gap-2 p-1 @[80px]:p-3 overflow-hidden text-center @[80px]:text-left"
      style={
        color
          ? { borderLeft: `3px solid ${color}` }
          : undefined
      }
      title={text}
    >
      {/* Иконка/инициалы для tiny — только если виджет совсем маленький */}
      <div className="@[80px]:hidden text-xs leading-tight">
        {iconValue ? <GlanceIcon value={iconValue} size={20} /> : text.slice(0, 4)}
      </div>

      {/* Иконка сверху для small+ */}
      {iconValue && (
        <div className="hidden @[80px]:block">
          <GlanceIcon value={iconValue} size={28} />
        </div>
      )}

      {/* Полный текст для small+ */}
      <div
        className="hidden @[80px]:block text-xs @[140px]:text-sm leading-snug @[140px]:leading-relaxed"
        style={{ wordBreak: 'break-word' }}
      >
        {text}
      </div>
    </div>
  );
}
