# Architecture

## Boundaries

- `src/app`: React 19 application shell and React Router routes (`/`, `/mission`, `/research`).
- `src/components`: readable dashboard, crew selection, diagnostics and assignment controls. `ui/button.tsx` is a locally owned shadcn-style CVA/Slot component. `components.json` configures future shadcn additions; the reset confirmation uses Radix Dialog focus management directly.
- `src/game`: PixiJS 8 scene mounted through `@pixi/react` 8. Assets API loads original PNGs. `AnimatedSprite` controls frame animation, `useTick` handles movement only. No renderer code advances a day.
- `src/simulation`: deterministic engine, serializable Zod-backed model definitions, illustrative parameter set. No React, Pixi, Zustand, storage, network, DOM, clock, or ambient random dependencies. `structuredClone` is a standard JavaScript operation; use a modern JS runtime (Node 22+ recommended).
- `src/store`: Zustand is the bridge. React and Pixi subscribe to the same mission and selected ID. Queued orders and selection are transient, intentionally not saved. A separate UI store would add no value yet.
- `src/persistence`: Dexie database with one versioned slot, full telemetry/history and Zod validation. All access errors are caught at store boundaries and displayed in the live status line.
- `scripts/generate-placeholder-sprites`: repeatable original art production using pngjs, not browser rendering APIs.

## State flow

1. Select a crew member from a sprite or accessible crew button.
2. Click an assignment or room. This queues/replaces one order for that astronaut. Nothing happens to the mission clock or visible activity yet.
3. Execute next day calls `simulateTurn(currentState, decisions, parameters)`.
4. Pure engine validates orders and affordability, clones state, consumes resources, increments day, records effective orders, resolves due effects, updates routines and health, creates events and telemetry, and evaluates mission outcomes.
5. Store publishes the resulting snapshot and clears the order queue.
6. Pixi moves toward locations derived from the committed activity. Arrival animations match that activity; fatigue affects visual speed. Travel time is purely presentational and never blocks or alters simulation calculations.
7. Serialized autosave writes the complete state. Failed saves leave the in-memory mission playable. Save/load/reset buttons are locked while a persistence operation is in flight; queued writes cannot overwrite newer state out of order.

## Determinism and testing

PRNG is a 32-bit LCG using `Math.imul`. Each astronaut consumes one draw in fixed crew order per valid turn. Rejected or terminal turns never mutate input or advance PRNG state. Decisions omitted by the player continue the current activity; history records these effective decisions, not only overrides. Parameters and seed must match for a replay.

Vitest uses jsdom and fake-indexeddb, with React Testing Library for actual crew controls. Pure engine tests freeze inputs, check delayed effects and simulate a winning policy. Component tests deliberately do not import or mount WebGL. Playwright exercises actual Pixi rendering, canvas pointer interactions, IndexedDB restore and mobile integer scaling in Chromium.

## Saves

Dexie database `pulse-mission-control`, database version 1, table `saves`, key `mission`. Envelope has `version: 1`, ISO `savedAt` and Zod-validated `schemaVersion: 1` state. Unknown versions/corruption are rejected; loading never silently resets a mission. Reset explicitly removes the saved slot before publishing a new mission. No automatic load on startup: use Load to resume. A failed autosave may leave the previous valid slot on disk. One browser origin/device only; no cloud, sync, export or migrations beyond v1 yet.

## Rendering and deployment

480×270 logical coordinates. Station background bakes the sky, hull and prop layers into one original texture for the slice. Interactive areas, animated astronauts, health markers and selection effects are separate Pixi objects. Future tilemaps can replace the baked layers without touching engine rules.

Vite serves everything locally with no runtime API. History-router deployments must rewrite non-asset routes to `index.html`. No service worker/offline install support; after loading, gameplay needs no network. WebGL is required for the station; the rest of the UI does not depend on rendering. The React error boundary can handle render errors, but browser graphics initialization failures may require reload or enabling WebGL.

## Compatibility

Installed versions are locked in `pnpm-lock.yaml`. React/DOM 19.3.1, PixiJS 8.23.0 and @pixi/react 8.0.5 have been typechecked, production-built and exercised together in Chromium. Tailwind 4.3.5 uses its Vite plugin; no obsolete PostCSS/Tailwind v3 config. Vite 8.3.8 uses its React plugin 6.3.0. TypeScript is pinned to 5.9.x because typescript-eslint 8.72.2 does not support the template's TypeScript 7 yet. No dependency peer conflicts after this correction.

## Deliberate omissions

No backend, authentication, remote datasets, clinical inference, ECS, skeletal animation, procedural pathfinding, audio engine or speculative abstractions. Immer is available but unnecessary because each short turn clones its serializable snapshot. Asset textures are cached for the application lifetime; scene remounts reuse shared textures.
