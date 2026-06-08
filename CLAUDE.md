# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production SSG build (requires DATABASE_URL)
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (lib/**/*.test.ts)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright acceptance tests (builds + serves first)
npm run db:setup     # apply schema to Neon (scripts/db/apply-schema.mjs)
npm run db:reset     # drop and reapply schema
```

Run a single unit test file: `npx vitest run lib/calendar.test.ts`

## Environment

Requires `DATABASE_URL` (pooled Neon connection string) in `.env.local`. Optionally `DATABASE_URL_UNPOOLED` for migration scripts.

## Architecture

### Static site with build-time DB access

The site is **fully static (SSG)**. All DB access happens at build time — there are no runtime queries and no API routes exposed to users.

### Data flow

```
Neon Postgres
  └─ lib/db/store.ts (loadStore)   — fetches all 14 tables in parallel, caches in module-level var
       └─ lib/db/repo.ts           — pure functions assembling typed view models from the Store
            └─ app/*/page.tsx      — server components call repo functions, pass results to client components
```

`Store` (defined in `lib/types.ts`) holds every table as a typed array. `loadStore()` is called at build time by each page's server component; the module-level cache means Neon is only queried once per build process.

### View model layers (`lib/types.ts`)

- **Row types** (`ShrineRow`, `EventRow`, etc.) mirror DB columns exactly
- **View models** (`ShrineCard`, `ShrineDetail`, `CalendarEntry`, etc.) are what the UI consumes — assembled by `lib/db/repo.ts`
- `ShrineCard` embeds facet membership arrays (`rank_codes`, `category_codes`, `deity_kanji`) so client-side filtering needs no additional lookups

### Shrine detail: intercepting + parallel route

`app/@modal/(.)shrines/[slug]/page.tsx` — renders as a side modal on soft navigation from the listing (`/shrines → /shrines/slug`).

`app/shrines/[slug]/page.tsx` — renders as a full page on direct navigation or shared links.

Both call the same `getShrineDetail` + `ShrineDetailView`; the `variant` prop (`"modal"` | `"page"`) controls layout. `app/@modal/default.tsx` renders nothing, preventing the modal slot from blocking direct page navigation.

### Client interactivity

Pages are server components that hand pre-built data to client components:
- `ShrineListing` — faceted filtering (URL-synced) over `ShrineCard[]`
- `Calendar` — month navigation over `CalendarEntry[]`
- `SearchBox` / `SearchResults` — Fuse.js over `SearchDoc[]` (built in `lib/search.ts`)

### Maps

`lib/maps.ts` builds keyless Google Maps `output=embed` iframe URLs. The map in `ShrineMap` is lazy-loaded on scroll and unloaded (`about:blank`) on modal close.

### Unit tests

Vitest covers `lib/` only (pure logic). The `server-only` package is stubbed in `vitest.config.ts` so `store.ts` can be imported without a React Server context.

### Adding / updating shrine data

Edit or add contract-shaped JSON files under `data/`, run the ingest script (writes to Neon), then rebuild. The schema is in `docs/schema.sql`. After ingest, run `REFRESH MATERIALIZED VIEW shrine_search` (or use `db:reset`).
