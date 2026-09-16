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
- **External car data (optional)** — look a car up by year → make → model →
  variant and auto-fill specs from free public APIs (NHTSA vPIC +
  FuelEconomy.gov), served through cached Vercel serverless functions. See
  [External car data](#external-car-data) below.

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
api/            Vercel serverless endpoints for the car-data lookup
src/
  components/   Layout, Modal, CarForm, ProConEditor, CarPicker,
                NameDialog, ComparisonTable
  db/           Dexie schema + CRUD helpers
  lib/          ranking, proConScoring, format, importExport (+ tests)
  lib/carData/  external car-data lookup (client + pure transforms + tests)
  pages/        Comparisons, Cars, ComparisonDetail, Settings
  types/        domain types
```

## External car data

The app is still local-first: all your cars live in IndexedDB. The lookup is an
**optional** convenience that fills in specs when adding a car. It runs entirely
on free, keyless public APIs plus a serverless cache — no accounts, no API keys.

**Endpoints** (Vercel functions in [`api/`](api/)):

- `GET /api/menu?field=years` — model years
- `GET /api/menu?field=makes&year=` — makes for a year
- `GET /api/menu?field=models&year=&make=` — models (FuelEconomy ∪ NHTSA)
- `GET /api/variants?year=&make=&model=` — engine/transmission variants
- `GET /api/car?id=&year=&make=&model=&variant=` — compiled specs for a variant

Menu/variant responses are edge-cached for a day (`Cache-Control` /
`s-maxage`). Compiled variants are cached in **Vercel KV** under a key like
`car:2025:toyota:corolla-cross:hybrid` so repeat visitors hit Redis in
milliseconds. KV is optional — set `KV_REST_API_URL` and `KV_REST_API_TOKEN`
(from a Vercel KV/Upstash store) to enable it; without them the lookup still
works, just without the shared cache.

The APIs never provide everything (price is never returned; cargo and some specs
are often missing), so the compiled result lists what is `missing` for the user
to fill in manually. Horsepower for EVs is computed from motor kW. The drill-down
UI that consumes these endpoints is built in CAR-14.

