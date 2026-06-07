# Jinja Meguri 神社巡り

A field guide to the shrines of Japan — their kami, lore, and festivals — surfaced in English with the original Japanese preserved.

A Next.js (App Router) site that browses the shrine database: an atmospheric landing page, a faceted shrine listing, shrine detail shown as a side modal from the list (and as a full page on direct navigation), a festival calendar, and search.

## Architecture

The site is **fully static (SSG)**. It reads the local JSON store under [`db/`](db/) at **build time** — there is no runtime database, no API keys, and no external service to wake. (Handoff A produced this store via [`ingest.py`](ingest.py); it is a deliberately swappable layer with the same row shapes a Postgres/Supabase sink would use.)

- Data access (`lib/db/`, server-only) loads the 14 normalized tables and assembles typed view models. Pure logic (`lib/`) is unit-tested.
- `/shrines`, `/calendar`, and `/search` pass their prebuilt data to small client components for interactivity (URL-synced filters, month navigation, fuzzy search).
- Shrine detail is rendered as a Next.js **intercepting + parallel route** (`@modal`): a side modal on soft navigation from the listing, a full page on a direct hit / shared link.
- Search is **Fuse.js** over the `shrine_search` blob (English ranking + Japanese + typo tolerance), isolated in `lib/search.ts`.
- The per-shrine map is a **keyless Google Maps `output=embed` iframe**, lazy-loaded on scroll and unloaded (`about:blank`) when the modal closes. The URL builder lives in `lib/maps.ts` so swapping to the keyed Embed API later is a one-file change.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (prerenders every route)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (lib/)
npm run test:e2e     # Playwright acceptance tests (builds + serves, then drives a browser)
```

## Data

The frontend renders whatever is in [`db/`](db/). To change the data, edit/add contract-shaped shrine files under [`data/`](data/) (see [`docs/shrine_ingest_contract.jsonc`](docs/shrine_ingest_contract.jsonc)) and regenerate the store:

```bash
python ingest.py data/        # idempotent by slug; refreshes db/shrine_search.json
```

Then rebuild (`npm run build`) to pick up the changes. The current `data/` shrines are development placeholders to be replaced with real research.

## Deploy (Vercel Hobby — free)

1. Import the repository in Vercel. The framework is auto-detected as Next.js.
2. Keep **Root Directory = repository root** so `db/` is included in the build.
3. No environment variables are required.

The default Next.js output prerenders every route as static HTML on Vercel. (For Cloudflare Pages, add `output: "export"` — note that intercepting routes have caveats under static export.)

## Project layout

```
app/         routes (App Router) incl. @modal intercepting route
components/  UI (nav, cards, filters, detail view, modal, map, calendar, search)
lib/         types, data access (db/), calendar, maps, search  (+ unit tests)
db/          normalized JSON store, read at build time
data/        contract-shaped shrine sources for ingest.py
docs/        project brief, handoffs, schema, spec + plan
tests/e2e/   Playwright acceptance tests
```
