# Car Comparison

A desktop-first web app for comparing cars side by side. All data is stored
locally in your browser (IndexedDB) — no server, no accounts — with JSON
export/import for backup and sharing.

## v1 features

- **Cars library** — add/edit/delete cars with year/make/model, body style,
  fuel type, price (single or range), MPG/MPGe (city/highway/combined), and
  cargo volume (seats up / folded).
- **Reusable pros & cons** — type a pro/con to create a reusable catalog item
  with a global weight (1–10); reuse it across cars as a pro or a con.
- **Comparisons** — group 2+ cars into a named comparison and reorder columns.
- **Color-coded table** — numeric rows are ranked (green best / red worst /
  amber mid / gray neutral), plus per-item pro/con rows and a weighted
  `Σ(pro) − Σ(con)` score.
- **Import / export** — download a JSON backup or merge one back in by id.

Photos (Phase 2) and an AI comparison summary (Phase 3) are planned — see
[`plan.md`](plan.md).

## Tech stack

Vite · React 19 · TypeScript · React Router · Dexie (IndexedDB) · Tailwind CSS
v4 · Vitest.

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # type-check and build for production
npm run preview    # preview the production build
npm test           # run unit tests (ranking + pro/con scoring)
npm run lint       # oxlint
```

## Project layout

```
src/
  components/   Layout, Modal, CarForm, ProConEditor, CarPicker,
                NameDialog, ComparisonTable
  db/           Dexie schema + CRUD helpers
  lib/          ranking, proConScoring, format, importExport (+ tests)
  pages/        Comparisons, Cars, ComparisonDetail, Settings
  types/        domain types
```
