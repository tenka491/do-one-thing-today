# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # Vite dev server (PWA service worker is inactive here by default)
npm run build      # production build to dist/ (this is where the PWA/manifest is generated)
npm run preview    # serve the built dist/ locally — use this to test PWA behavior
npm run deploy     # build + push dist/ to gh-pages branch via the `gh-pages` package
npm test           # run the Vitest suite once
npm run test:watch # Vitest in watch mode
```

Tests run under **Vitest** with its own `vitest.config.js` (node environment, `src/**/*.test.js`) — deliberately separate from `vite.config.js` so the Vue/PWA plugins don't load for unit tests. Test files sit next to the module they cover (`src/stats.test.js`, `src/storage.test.js`). Only the pure logic modules are covered; `App.vue` has no component test. There is no linter configured.

`npm run deploy` relies on `gh-pages`, which is referenced in the `deploy` script but not listed in `package.json` dependencies — install it (`npm i -D gh-pages`) or rely on the GitHub Actions path instead.

## Architecture

Single-screen PWA: "one or more tasks per day + a history + streak stats", Vue 3 + Vite, no backend, no router, no state library.

- **`src/App.vue`** (a `<script setup>` SFC) holds the component: `reactive` `state`, computed stats, and the `addTask` / `toggleTask` handlers. `src/main.js` just mounts it. `src/components/HelloWorld.vue` and `src/assets/vue.svg` are leftover Vite scaffold and unused — do not build on them.
- **`src/storage.js`** owns load / save / migration for the single `localStorage` key `do-one-thing-today` (tracked history/streak data). **`src/prefs.js`** owns a separate key, `do-one-thing-today:prefs`, for display-only preferences (which stat blocks are visible, whether history shows, whether completed tasks show in today's list) — kept out of the v2 schema since it's UI state, not history, and needs no migration. **`src/stats.js`** holds the pure streak/best-day math. Keep those concerns out of `App.vue`.
- **Persistence (schema v2)** is one JSON blob: `{ version: 2, days: { "YYYY-MM-DD": { tasks: [{ id, text, completed, createdAt, completedAt }] } }, meta: { bestStreakFloor } }`. A `watch(state, …, { deep: true })` in `App.vue` saves on every change. Old v1 blobs (`{ savedDate, task, completed, streak, lastCompletedDate }`) are auto-migrated by `storage.load()` on first read: today's task is carried over, a synthetic completed day is seeded at `lastCompletedDate` to keep the current streak continuous, and the old `streak` number is stored as `meta.bestStreakFloor` so the best-streak achievement isn't lost.
- **Stats are derived, never stored** (`src/stats.js`, recomputed as Vue `computed`). A day counts toward the streak if **at least one** of its tasks is completed. `currentStreak` is the consecutive run of counting days ending today or yesterday (0 if the last counting day is older than yesterday). `bestStreak` is the longest such run ever, floored by `meta.bestStreakFloor`. `bestDay` is the day with the most completed tasks (ties → most recent).
- Tasks are add + toggle only — no edit or delete yet. Input is always visible; tasks are added one at a time into the current day's list.

## Versioning

The app version is defined once in `package.json` and flows outward:
- `vite.config.js` injects it as the compile-time global `__APP_VERSION__` (used in `App.vue`'s footer).
- `vite.config.js` also copies it into the PWA `manifest.version`.

Bump `package.json` `version` and both consumers follow — do not hardcode the version elsewhere.

## GitHub Pages deployment

- `vite.config.js` sets `base: '/do-one-thing-today/'` and the PWA `start_url` to the same path. Both are tied to the repo name `tenka491/do-one-thing-today`; changing the repo/owner means updating both.
- `.github/workflows/deploy.yml` builds and publishes `dist/` to `gh-pages` on every push to `main` (peaceiris/actions-gh-pages). This is the primary deploy path; the `npm run deploy` script does the same thing manually.
- Live site: https://tenka491.github.io/do-one-thing-today/
