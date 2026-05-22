# Contributing to Homeglance

Thanks for wanting to help! Homeglance is an open-source MIT project, and
contributors are welcome.

## Stack

- **TypeScript** strict
- **React 18** (functional components, hooks)
- **Tailwind CSS 4**
- **Bun** (package manager and development runtime)
- **Next.js 14** App Router

## Getting started

1. **Fork** the repository on GitHub
2. Clone your fork locally: `git clone https://github.com/<your-username>/homeglance`
3. Install dependencies: `bun install`
4. Copy `.env.example` → `.env.local`
5. Start dev mode: `bun dev`
6. Open `http://localhost:3040` → connect to HA
7. Create a branch: `git checkout -b feat/my-feature`

## Which tasks to pick

- Issues labeled **`good-first-issue`** — easy ones, for first contributions
- **`help-wanted`** — tasks the maintainers are hoping for help with
- **`bug`** — fix a bug (you should be able to reproduce and fix it)
- **`feature`** — new functionality (discuss it in an issue first)
- Your own ideas — open an issue with a `[proposal]` prefix and let's discuss

## Creating a new widget

The easiest way to contribute.

1. Create `src/components/widgets/MyWidget.tsx` with a named export `MyWidget` (the component)
2. Add `MY_WIDGET_META: WidgetMeta` to `src/components/widgets/meta.ts`
3. Register it in `src/components/widgets/index.tsx` (lazily via `next/dynamic`)
4. Open a PR with a screenshot

If you are making a widget that loads as a standalone `.js` file without
building the project — see [docs/sdk.md](docs/sdk.md).

## Code style

### TypeScript

- Strict mode is on
- No `any` (use `unknown` when the type is unknown; `any` is acceptable only in the widget registry, where dispatch is runtime)
- Public functions have an explicit return type

### React

- Functional components only
- Hooks for logic
- `React.memo` for heavy widgets
- Props via an interface

### Styles

- Tailwind utility classes
- CSS variables for themes (`bg-bg-primary`, `text-text-primary`, `accent`, etc.)
- `style={{}}` only for dynamic values (glows, sizes)

### Files

- One React component = one file
- Helpers in separate modules
- File names match the main export name

## Before a PR

```bash
bun typecheck  # tsc --noEmit
bun run build  # the production build must pass
```

(Tests will come later — there are none yet, verification is done live in
the browser.)

## Pull Request

### Title

[Conventional commits](https://www.conventionalcommits.org/):

- `feat(widgets): add cover widget`
- `fix(client): handle ws reconnect`
- `docs(setup): add HACS install steps`
- `refactor(storage): extract migrations`
- `perf(bundle): code-split widget catalog`

### Body

- **What changed**
- **Why** (motivation)
- Screenshots (if UI)
- `Closes #X` (if it fixes an issue)

### Size

We prefer **small PRs** — five PRs of one feature each beats one large PR.
If a PR is larger than 500 lines, discuss it in an issue first.

## Code Review

- At least 1 approval from a maintainer
- All comments must be resolved
- typecheck / build — green

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). In short: be friendly,
constructive criticism only, no toxicity or discrimination.

## License

By contributing to Homeglance, you agree that your code will be licensed
under [MIT](LICENSE).
