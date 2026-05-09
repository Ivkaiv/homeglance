# 03 · Визуальный дизайн

## Эстетика

**iOS-вдохновлённая**, но не copy-paste. Чистая, мягкая, с эффектами «жидкого стекла» (frosted glass, vibrancy). Минимализм без аскетизма.

### Референсы

- iOS 17+ Control Center / Home Screen
- macOS Sonoma — окна, dock
- visionOS — стеклянные слои, depth
- Things 3 (приложение задач) — типографика, мягкие тени
- iA Writer — пустоты, акценты на главном

## Палитра

### Тёмная тема (по умолчанию)

```
--bg-primary:    #0a0e1a   ← глубокий тёмно-синий
--bg-secondary:  #15172a   ← модалки, поднятые поверхности
--bg-tertiary:   rgba(255,255,255,0.04) ← "стекло"

--text-primary:    rgba(255,255,255,0.92)
--text-secondary:  rgba(255,255,255,0.55)
--text-tertiary:   rgba(255,255,255,0.40)

--border-subtle:   rgba(255,255,255,0.08)
--border-default:  rgba(255,255,255,0.12)

--accent:        #34d399   ← emerald (можно менять в настройках)
--accent-soft:   rgba(52, 211, 153, 0.15)

--success: #34d399
--warning: #fbbf24
--danger:  #ef4444
--info:    #60a5fa
```

### Светлая тема

```
--bg-primary:    #f4f5f7
--bg-secondary:  #ffffff
--bg-tertiary:   rgba(0,0,0,0.04)

--text-primary:    rgba(0,0,0,0.88)
--text-secondary:  rgba(0,0,0,0.55)
--text-tertiary:   rgba(0,0,0,0.40)

--border-subtle:   rgba(0,0,0,0.08)
--border-default:  rgba(0,0,0,0.12)
```

Выбор темы: настройки → light / dark / **auto** (по `prefers-color-scheme`).

## Типографика

```
--font-family: -apple-system, "SF Pro Display", "Inter", system-ui, sans-serif;
--font-mono:   "SF Mono", "JetBrains Mono", monospace;

--text-display: 60px / 1.0 / -0.02em / 200 (light)  — главная температура
--text-h1:      32px / 1.1 / -0.01em / 600
--text-h2:      24px / 1.2 / 600
--text-h3:      18px / 1.3 / 500
--text-body:    16px / 1.5 / 400
--text-small:   14px / 1.4 / 400
--text-tiny:    11px / 1.3 / 500 (uppercase, tracking 0.05em)
```

Числа везде с `tabular-nums` чтобы не «дрожали» при обновлении.

## Spacing & Radius

```
--space: базовая единица 4px
gap-1 = 4px, gap-2 = 8px, gap-3 = 12px, gap-4 = 16px, gap-5 = 20px, gap-6 = 24px

--radius-sm: 8px   (кнопки, чипы)
--radius-md: 12px  (поля ввода)
--radius-lg: 16px  (виджеты)
--radius-xl: 24px  (модалки)
--radius-full: 9999px (круглые)
```

## Эффекты

### "Жидкое стекло" (Liquid Glass)
Главный визуальный эффект. Применяется к:
- Поверхностям виджетов
- Модалкам
- Бэкграунду dock-bar
- Поднятым меню

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius-lg);
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.glass-active {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.18);
}
```

### Свечение (Glow)
Применяется к **активным** элементам (включённый свет, активная вкладка):

```css
.glow-warm {
  box-shadow:
    0 0 36px rgba(251, 191, 36, 0.22),
    0 4px 30px rgba(0, 0, 0, 0.3);
}
.glow-cool {
  box-shadow:
    0 0 28px rgba(96, 165, 250, 0.18),
    0 4px 30px rgba(0, 0, 0, 0.3);
}
.glow-success {
  box-shadow: 0 0 24px rgba(52, 211, 153, 0.4);
}
```

### Анимации
- **Появление модалки**: `opacity 0→1 + translateY 16→0` за 280ms, ease `[0.22, 1, 0.36, 1]`
- **Тап**: `scale 1 → 0.96` за 100ms
- **Hover**: `scale 1 → 1.012` за 200ms (только desktop)
- **Drag в edit**: «дрожание» rotate -0.4° ↔ 0.4° за 600ms, infinite alternate
- **Стейт-смена** (свет вкл): фейд background + glow за 300ms

## Иконки

- **Material Design Icons** (~7000 штук, `mdi:lightbulb-on`, `mdi:thermometer`...)
- Совместимость с HA — пользователь привычно вводит `mdi:home-outline`
- **Lucide Icons** для UI-чрома (стрелки, крестики, гамбургер)
- **Эмодзи** как опциональная замена (для названий комнат, рубрик)

Размер иконки в виджете ~ 55% от размера контейнера кнопки.

## Сетка / Layout

- **Mobile-first** — базовый дизайн под 390px (iPhone 13/14/15)
- Breakpoints: `xs 480 → sm 768 → md 996 → lg 1200`
- Сетка виджетов: **24 cols на desktop, 16 на tablet, 9 на mobile**
- Высота строки: 32px (для тонкого позиционирования)

Минимальные размеры виджетов:
- Tiny: 1×1 (32×32 px) — только иконка
- Small: 2×2 (~80×80) — иконка + значение
- Medium: 4×3 (~160×120) — карточка
- Large: 6×4+ (~240×160+) — полная карточка с метаданными

## Принципы UI

1. **Один экран = одна цель** — не пытайся показать всё сразу
2. **Никаких alert()** — используй inline-уведомления и toast
3. **Любое действие можно откатить** — undo, восстановление, бэкап
4. **Жёсткая иерархия типографики** — display, h1, h2, body, small, tiny — никаких «средних» размеров
5. **Цвет — только для смысла** — серое дефолтное, цветное = state (вкл/предупреждение/успех)
