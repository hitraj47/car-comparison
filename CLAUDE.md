# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # tsc -b (type-check) then vite build
npm run preview        # preview the production build
npm run lint           # oxlint (config in .oxlintrc.json)
npm test               # vitest run (single pass)
npm run test:watch     # vitest watch mode
```

Run a single test file or test by name:

```bash
npx vitest run src/lib/ranking.test.ts
npx vitest run -t "stepsBehindBest"
```

Tests use jsdom + Testing Library; global setup is [src/test/setup.ts](src/test/setup.ts) (wired via `test.setupFiles` in [vite.config.ts](vite.config.ts)).

## Architecture

Local-first, single-page app: **no server and no accounts**. All state lives in the browser's IndexedDB; JSON export/import is the only persistence beyond the local database.

**Data flow.** [src/db/index.ts](src/db/index.ts) defines the Dexie database (`car-comparison`) and every CRUD helper. Components read live data with `dexie-react-hooks`' `useLiveQuery`, so the UI reacts to DB writes without manual refresh — mutate through the `db/index.ts` helpers rather than touching Dexie tables directly. Four tables: `cars`, `comparisons`, `proConItems`, `attributeDefs`. Schema is versioned inside the `CarComparisonDB` constructor; **adding an indexed field or table requires a new `this.version(n).stores({...})` migration** (v2 added `attributeDefs`).

**External car-data lookup (CAR-13).** The one exception to "no server": an optional lookup that auto-fills car specs from two free public APIs. Serverless functions in [api/](api/) (Vercel Node runtime) call NHTSA vPIC + FuelEconomy.gov and are edge-cached (`Cache-Control`/`s-maxage`) for menus, with compiled variants cached in Vercel KV (keyed `car:year:make:model:variant`). All the real logic lives in [src/lib/carData/](src/lib/carData/) so it stays type-checked and unit-tested: `transform.ts` holds the pure merge/mapping (fuel-type detection, EV horsepower from motor kW, VClass→body style, cargo, cache keys), `sources.ts` the two-API fetch/merge (fetch is injected for tests), `kv.ts`/`cache.ts` the KV cache-through (config passed in, never `process.env` from `src`), and `client.ts` the browser wrapper the CAR-14 UI consumes. KV and NHTSA both degrade gracefully when unavailable. The `api/` handlers are thin and are built by Vercel, not by `npm run build`.

**Domain model** lives entirely in [src/types/index.ts](src/types/index.ts) — read it first. Notable shapes: `Price` is a discriminated union (`static` amount vs `min`/`max` range); pros/cons are a **reusable global catalog** (`ProConItem` with a 1–10 `weight`) that cars reference by id via `CarProConAssignment` (polarity pro/con); custom numeric attributes (`AttributeDef`) work the same way, with per-car values in `Car.customAttrs`. `ScoringConfig` is stored per `Comparison` and falls back to `DEFAULT_SCORING`.

**Scoring is the core of the app** and spans two modules that a `Comparison` blends together:

- [src/lib/ranking.ts](src/lib/ranking.ts) — the **Specs Score** and cell coloring. The central concept is a **"meaningful difference"**: coloring/scoring is anchored to absolute per-metric thresholds (from `ScoringConfig`), *not* to the spread of the current cars. `stepsBehindBest` computes how many meaningful-difference steps a value sits behind the best; `proximityTier` maps that to color tiers and `metricScore` to a 0–100 score. `specsScores` averages equal-weighted per-metric scores (price, MPG, MPGe, cargo, custom attrs); missing data is excluded, never penalized; cargo up/folded average into one category to avoid double-weighting. Facts in `config.excludedFacts` are shown but left out of the score.
- [src/lib/proConScoring.ts](src/lib/proConScoring.ts) — the weighted **Pro/Con Score** (`Σ(pro) − Σ(con)` over catalog weights).
- `blendScores` (in ranking.ts) combines the two into the **Final Score**, weighting pros/cons by `config.proConWeight`% and specs by the rest. If only one side has data, weights renormalize so it stands alone.

**The comparison view.** [src/components/ComparisonTable.tsx](src/components/ComparisonTable.tsx) is the heart of the UI — it builds the color-coded, per-metric table plus the derived Specs / Pro-Con / Final score rows. Routing is flat in [src/App.tsx](src/App.tsx): Comparisons (index), Cars, ComparisonDetail (`comparisons/:id`), Settings, all under a shared `Layout`.

**Import/export** ([src/lib/importExport.ts](src/lib/importExport.ts)) produces a versioned `BackupFile` (`version: 2`). Photos are stored as `Blob`s in IndexedDB but base64-encoded for the JSON backup, so cars are serialized/deserialized (not passed through raw) on export/import. Import merges by id.

## Conventions

- oxlint enforces React rules-of-hooks (error) and only-export-components (warn). No Prettier config; match the existing 2-space, no-semicolon style.
- IDs are `crypto.randomUUID()`; timestamps are ISO strings set by the `db` helpers — don't set `createdAt`/`updatedAt` at call sites.

## Linear / PR workflow

The `ticket-agent` skill ([.claude/skills/ticket-agent/SKILL.md](.claude/skills/ticket-agent/SKILL.md)) governs work driven by Linear issues (this repo's issues use the `CAR-` prefix). "Work on issue [ID]" implements + tests + opens a PR; "Start in plan mode and work on issue [ID]" ingests the ticket but makes no file or git changes until cleared. Branch naming follows `[label]/CAR-NN-description`. If blocked, post a Linear comment and pause rather than failing silently; never use headless/bypass flags for `gh pr create`.
