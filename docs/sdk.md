# Custom widgets — developer SDK

Homeglance accepts custom widgets — standalone `.js` files that register a
new widget type through a global SDK. The file can be hosted anywhere
(GitHub Pages, your own server, an npm CDN such as jsDelivr) — the user adds
its URL under Settings → External widgets.

## Minimal example

Create `my-clock.js`:

```js
// Wait until the SDK is initialized — it appears after the first React
// render of Homeglance.
function init() {
  if (!window.Homeglance) return setTimeout(init, 100);

  const { React, registerWidget, hooks } = window.Homeglance;

  // A widget is an ordinary React component. It receives props.params
  // typed by your schema.
  function ClockWidget({ params }) {
    const [now, setNow] = React.useState(new Date());
    React.useEffect(() => {
      const t = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(t);
    }, []);
    return React.createElement(
      'div',
      { className: 'glass h-full w-full p-4 flex flex-col items-center justify-center' },
      React.createElement('div', { className: 'text-3xl font-light tabular-nums' },
        now.toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit', second: params.showSeconds ? '2-digit' : undefined,
          hour12: !params.format24h
        })
      ),
    );
  }

  registerWidget({
    meta: {
      type: 'my_clock',                  // must be unique
      name: 'My Clock',
      emoji: '⏱',
      description: 'A simple timer with millisecond precision',
      category: 'misc',                  // one of: lights, switches, sensors, climate, media, cameras, rooms, misc
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 2, h: 2 },
      paramSchema: [
        { key: 'format24h', label: '24-hour format', kind: 'boolean', default: true },
        { key: 'showSeconds', label: 'Show seconds', kind: 'boolean', default: false },
      ],
    },
    Component: ClockWidget,
  });
}

init();
```

Once the user has:

1. Hosted this file (for example, `https://example.com/my-clock.js`)
2. Opened Glance → Settings → External widgets → entered the URL → Add
3. Reloaded the page

— the widget appears in the "+ Widget" catalog under the name "My Clock" and
can be added to any page.

## The global object API

After loading, Homeglance declares `window.Homeglance`:

```ts
interface HomeglanceSDK {
  version: '1';                                     // SDK major version
  React: typeof React;                              // the same React copy Glance uses
  registerWidget(entry: WidgetEntry): void;
  hooks: {
    useEntity(entityId?: string): HAState | undefined;
    useStates(): Record<string, HAState>;
    useCallService(): (
      domain: string, service: string, entityId?: string, data?: object
    ) => Promise<void>;
    useConnection(): { client, status, states, isReady, ... };
  };
}
```

### `registerWidget(entry)`

Registers a widget type. If a widget with that `meta.type` is already
registered, a warning is logged to the console and the old registration is
overwritten.

### `hooks.useEntity`

Subscribes to a single HA entity. Returns the current state, or undefined.
Re-renders the component only when the state of that specific entity changes
(not others).

```js
const { useEntity } = window.Homeglance.hooks;
function MyWidget({ params }) {
  const e = useEntity(params.entity);
  return React.createElement('div', null, e?.state ?? '—');
}
```

### `hooks.useCallService`

Returns a function for calling an HA service — for example, toggling a light:

```js
const callService = useCallService();
await callService('light', 'toggle', 'light.bedroom');
```

## WidgetEntry — the registration format

```ts
interface WidgetEntry {
  meta: {
    type: string;                       // must be unique (recommended: a prefix like `myorg_clock`)
    name: string;                       // display name in the catalog
    emoji: string;                      // emoji next to the name
    description: string;                // short description
    category: 'lights' | 'switches' | 'sensors' | 'climate' | 'media' | 'cameras' | 'rooms' | 'misc';
    defaultSize: { w: number; h: number };  // size when added
    minSize: { w: number; h: number };      // minimum size when resizing
    paramSchema: ParamField[];          // configuration fields (see below)
  };
  Component: React.ComponentType<{ params: Record<string, any> }>;
  computeMinSize?(params): { w: number; h: number };  // dynamic minSize
}
```

### ParamField

```ts
interface ParamField {
  key: string;                          // key in params
  label: string;                        // label in the form
  kind: 'entity' | 'multi-entity' | 'text' | 'number' | 'boolean'
      | 'color' | 'select' | 'multi-select' | 'icon' | 'entity-icons';
  domain?: string;                      // filter for kind=entity (e.g. 'light.')
  options?: { value: string; label: string }[];  // for kind=select / multi-select
  required?: boolean;
  default?: any;
  placeholder?: string;
  hint?: string;                        // hint shown under the field
  group?: string;                       // field group (fields sharing one are laid out together)
}
```

## Styling

Use Homeglance's Tailwind classes — the built-in widgets are built on them
too:

- `glass` — a frosted background panel with blur
- `text-text-primary`, `text-text-secondary`, `text-text-tertiary` — text hierarchy
- `text-accent`, `bg-accent/20`, `border-accent/40` — the accent (changes in Settings)
- `bg-bg-primary`, `bg-bg-secondary` — backgrounds

All classes adapt to the dark/light theme automatically.

## Security

- An external script runs in the normal page context — it has access to
  localStorage, to the HA token and to the whole DOM.
- Only add sources you trust.
- There is no sandbox isolation on the Homeglance side.

## SDK versions

- `1` — current (Homeglance v0.1.x). The API is stable within 1.x. Breaking
  changes only come with `version: '2'`.

## Publishing

The simplest options:

1. GitHub Pages: push `my-widget.js` to a `username.github.io/my-widget`
   repo. URL: `https://username.github.io/my-widget/my-widget.js`.
2. jsDelivr: if the widget is in an npm package —
   `https://cdn.jsdelivr.net/npm/my-widget@1/dist/index.js`.
3. Your own server with HTTPS.

The community can publish widgets by opening a PR to the main repository
that adds them to the README's "Community widgets" section.
