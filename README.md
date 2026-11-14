# PULSE — Mission Control

A playable browser-based astronaut health strategy simulation for a NASA Space Apps Challenge concept.

> Not a quiz. Not a slideshow. A living simulation where every choice costs something.

Original 8-bit-inspired station art, three animated selectable astronauts, five functional areas, six persistent activities, a deterministic daily simulation, delayed consequences, a telemetry chart, mission journal, resource budgets, victory/abort conditions and local IndexedDB saves.

**All health coefficients are illustrative game values. No NASA datasets have been integrated. This is not a medical device or an operational planning tool.**

## Run

Requires modern Node (22.12+; developed on Node 26.3.0), pnpm 10, and a WebGL-capable modern browser.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, normally http://localhost:5173.

If pnpm is not installed, bootstrap it **inside this project**, without sudo or global packages:

```sh
npm install --prefix .tooling pnpm@10
export PATH="$PWD/.tooling/node_modules/.bin:$PATH"
pnpm install
pnpm dev
```

The current workspace already contains that local pnpm bootstrap. Fresh terminal sessions need the PATH export above. `.tooling` and package caches are not source-controlled.

## Play

1. Okafor starts with fatigue 72 and low sleep recovery. Click his sprite or crew card.
2. Click **Rest**, or click the sleeping quarters. This queues a shift; it does not advance time.
3. Review costs, then **Execute next day**. Crew move to the areas matching their committed routines.
4. Reassign crew to Duty when recovered. Routines repeat until changed; leaving everyone resting consumes reserves without producing progress.
5. Reach 100% Mars transfer readiness within 30 shifts. Avoid exhausting reserves or leaving the whole crew critical.
6. Turns autosave. **Save** stores the current committed mission; **Load** explicitly restores the device's local slot after reload. **New** asks for confirmation before deleting it. Queued orders are transient and are not saved.

On narrow screens, pan the station horizontally; it deliberately stays at integer scale instead of becoming blurry. Every canvas control also has an accessible React counterpart. The simulation waits for player execution, never a timer or rendering frame.

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `pnpm dev`             | Vite development server                              |
| `pnpm build`           | Strict TypeScript project checks + production bundle |
| `pnpm preview`         | Serve production build                               |
| `pnpm typecheck`       | Check app, configs and tests without emitting JS     |
| `pnpm lint`            | ESLint with TypeScript and React Hooks rules         |
| `pnpm format`          | Prettier source/docs/config formatting               |
| `pnpm test`            | Vitest engine, storage, store and component tests    |
| `pnpm test:watch`      | Vitest watch mode                                    |
| `pnpm test:browser`    | Playwright real-browser integration tests            |
| `pnpm assets:generate` | Rebuild original PNG art from source                 |

For Playwright, install a project-local Chromium or use an existing executable:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" pnpm exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/playwright" pnpm test:browser
# Alternatively, with an existing Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:browser
```

No system packages are installed by these commands. If browser shared libraries are missing, use an already configured compatible browser environment; do not use sudo. The browser suite starts Vite automatically. Tests write screenshots into ignored `.cache/`.

## Structure

```text
public/assets/pixel-art/   Original station PNG and three crew sprite sheets
src/
  app/                    Application shell and three routes
  components/crew/        Accessible crew selection and assignment controls
  components/ui/          Locally owned shadcn-style button
  game/                   Pixi canvas, scene, entities and asset loader
  simulation/
    engine/               Mission initialization, PRNG and pure simulateTurn
    models/               Serializable types and Zod save validation
    parameters/           Explicit illustrative tuning values
  store/                  Zustand bridge, queued orders and safe persistence actions
  persistence/            Dexie schema and versioned save/load/reset
  lib/                    Class composition utility
  styles/                 Tailwind 4 and responsive mission-control styling
scripts/generate-placeholder-sprites/
tests/{simulation,components,browser}/
docs/                     Architecture, gameplay, art and scientific assumptions
```

## Final dependencies

Exact resolutions are committed in `pnpm-lock.yaml`; `package.json` lists all direct dependencies.

**Runtime:** React/React DOM 19.3.1; React Router 8.5.1; PixiJS 8.23.0; @pixi/react 8.0.5; Zustand 5.1.0; Immer 11.2.10; Dexie 4.4.7; Zod 4.6.7; @radix-ui/react-dialog 1.3.1; @radix-ui/react-slot 1.5.0; Lucide React 1.73.0; Motion 14.14.0; Recharts 3.10.1; clsx 2.1.1; tailwind-merge 3.7.0; class-variance-authority 0.7.1; date-fns 4.4.0. Immer/date-fns are available for future work but not needed in the short clone-based turn engine.

**Development:** TypeScript 5.9.3; Vite 8.3.8; @vitejs/plugin-react 6.3.0; Tailwind CSS/@tailwindcss/vite 4.3.5; Vitest 5.1.0; jsdom 31.0.1; React Testing Library 16.3.3; jest-dom 7.0.1; user-event 14.6.10; fake-indexeddb 6.2.8; Playwright 1.65.1; ESLint 10.15.0; @eslint/js 10.0.1; typescript-eslint 8.72.2; React Hooks plugin 7.1.1; React Refresh plugin 0.5.7; globals 17.14.0; Prettier 3.10.1; pngjs 7.0.0; types for Node 24.19.2, React 19.3.0, React DOM 19.3.0 and pngjs 6.0.5.

shadcn/ui is initialized through `components.json` with a locally owned Button using its CVA/Radix Slot convention; it is not a runtime package. No network-loaded fonts or external art assets. TypeScript was downgraded from the template's 7.x to 5.9.x to satisfy the ESLint parser's supported peer range.

## Validation

Validated in this workspace: **24 Vitest tests passed**, **2 Chromium browser tests passed**, strict TypeScript and ESLint passed without errors or warnings, and production build succeeded. Browser tests used the existing `/usr/bin/chromium` (the optional browser download was not required).

Run the commands above for current results. Coverage includes initialization, turn progression, rest, fatigue, costs, delayed strain/adaptation/reports, PRNG replay, frozen-state immutability, terminal outcomes, a winning policy, IndexedDB round trips, invalid saves, persistence failures, duplicate-execution prevention, React astronaut selection and queued assignments. Playwright verifies actual WebGL rendering, sprite click selection, room click assignments, turn execution, reload/load and mobile canvas cropping without page overflow.

Production builds currently emit a non-fatal large-chunk warning. Further splitting of charting/renderer dependencies is recommended before deployment. SPA hosting must rewrite `/mission` and `/research` to `index.html`.

## Documentation and next steps

- [Architecture](docs/ARCHITECTURE.md)
- [Game design and complete activity trade-offs](docs/GAME_DESIGN.md)
- [Pixel art scale, palette, frame map and provenance](docs/PIXEL_ART_GUIDELINES.md)
- [Scientific sources, full coefficients and limitations](docs/SCIENTIFIC_SOURCES.md)

Current limitations: one scenario, one local save slot, basic action animations and baked background layers, no station capacity/pathfinding, no sound, no hidden sensor uncertainty, and no validated physiology model. Assessments currently report already-visible scores. Save migrations beyond v1, cloud storage and offline installation are not implemented.

Next: improve sprite/equipment interactions and occupancy; introduce meaningful sensor uncertainty and event variety; tune difficulty using seeded playthroughs; add export/import and accessibility review; then pursue provenance-tracked NASA dataset integration and expert-reviewed calibration. Preserve the separation between game balance and evidence-backed parameters.
