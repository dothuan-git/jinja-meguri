# Jinja Meguri 神社巡り

A field guide to the shrines of Japan — their kami, lore, and festivals — surfaced in English with the original Japanese preserved.

A Next.js (App Router) site that browses the shrine database: an atmospheric landing page, a faceted shrine listing, shrine detail shown as a side modal from the list (and as a full page on direct navigation), a festival calendar, and search.

## Architecture

The site is **fully static (SSG)**. At **build time** it queries a [Neon](https://neon.tech) serverless Postgres database and prerenders every route as static HTML — there are no runtime database calls and no API exposed to end users.

- Data access (`lib/db/`, server-only) queries the 14 normalized tables and assembles typed view models. Pure logic (`lib/`) is unit-tested.
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

Shrine data lives in **Neon Postgres** (schema: [`docs/schema.sql`](docs/schema.sql)). To add or update shrines, edit/add contract-shaped files under [`data/`](data/) (see [`docs/shrine_ingest_contract.jsonc`](docs/shrine_ingest_contract.jsonc)) and run the ingest script (which writes to Neon). Then rebuild to pick up the changes.

The current shrines are development placeholders to be replaced with real research.

## Deploy (Vercel Hobby — free)

1. Import the repository in Vercel. The framework is auto-detected as Next.js.
2. Add the environment variable `DATABASE_URL` (pooled Neon connection string) in Vercel project settings.
3. Optionally add `DATABASE_URL_UNPOOLED` (direct connection string) for migration scripts.

The default Next.js output prerenders every route as static HTML on Vercel. (For Cloudflare Pages, add `output: "export"` — note that intercepting routes have caveats under static export.)

## Project layout

```
app/         routes (App Router) incl. @modal intercepting route
components/  UI (nav, cards, filters, detail view, modal, map, calendar, search)
lib/         types, data access (db/), calendar, maps, search  (+ unit tests)
data/        contract-shaped shrine sources for ingest
docs/        project brief, schema, ingest contract
scripts/     db setup and migration scripts
tests/e2e/   Playwright acceptance tests
```
