# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working principles

- **Think before acting.** Brainstorm the approach and trade-offs before writing code. For anything non-trivial, outline a short plan first instead of jumping straight in.
- **Clarify, don't guess.** If a requirement is ambiguous or under-specified, ask before implementing rather than building on an assumption.
- **Propose better ideas.** If you see a cleaner, safer, or more maintainable approach than the one requested, say so with brief reasoning before proceeding.
- **Write clean, minimal code.** Favor readability and simplicity over cleverness. Reuse existing components, helpers, and the view-model layers (`lib/db/repo.ts`, `lib/types.ts`) instead of duplicating logic; add comments only for non-obvious decisions.
- **Keep it fast.** Avoid redundant work and N+1 patterns — respect the single `loadStore()`-per-request model and do filtering/assembly in the repo layer, not at render time. Don't micro-optimize at the expense of clarity.
- **Make surgical changes.** Touch only what the task needs and follow existing conventions, including the server-component → client-component data-handoff split.
- **Verify before calling it done.** Run `npm run typecheck` and the relevant tests; handle errors explicitly rather than swallowing them.
- **Keep docs in sync.** When you change code, update every related docs it affects in the same changes.

## Commands

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build (requires DATABASE_URL)
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (lib/**/*.test.ts)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright acceptance tests (builds + serves first)
npm run db:setup     # apply docs/schema.sql + docs/seed.sql to Neon (scripts/db/apply-schema.mjs)
npm run db:reset     # drop the public schema, then reapply schema + seed
```

Run a single unit test file: `npx vitest run lib/calendar.test.ts`

## Environment

Required in `.env.local`:

- `DATABASE_URL` — pooled Neon connection string (used by the app at runtime).
- `DATABASE_URL_UNPOOLED` — direct connection, preferred by the schema/seed scripts.
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` — Neon Auth (powers the admin sign-in). See `docs/ACCOUNTS.md`.

## Architecture

### Dynamic site with request-time DB access

The site is **server-rendered on demand**, not statically exported. Every page sets
`export const dynamic = "force-dynamic"` and calls `loadStore()`, which queries Neon at
request time. There is one DB-backed admin section with server actions and an auth API
route; the rest is read-only public content.

### Data flow (read path)

```
Neon Postgres
  └─ lib/db/store.ts (loadStore)   — fetches all 13 tables in parallel via a pg.Pool, wrapped in React cache()
       └─ lib/db/repo.ts           — pure functions assembling typed view models from the Store
            └─ app/*/page.tsx      — server components call repo functions, pass results to client components
```

`Store` (defined in `lib/types.ts`) holds every table as a typed array. `loadStore()` is
wrapped in React `cache()`, so within a single request Neon is queried once; a fresh cache
is created per request, so admin writes show up on the next page load. The shared
`pg.Pool` is exported from `lib/db/store.ts` and reused by auth and mutations.

### View model layers (`lib/types.ts`)

- **Row types** (`ShrineRow`, `FestivalRow`, etc.) mirror DB columns exactly.
- **View models** (`ShrineCard`, `ShrineDetail`, `CalendarEntry`, `DeityListing` data, etc.) are what the UI consumes — assembled by `lib/db/repo.ts`.
- `ShrineCard` embeds facet membership arrays (`rank_codes`, `category_codes`, `deity_kanji`) so client-side filtering needs no additional lookups.

### Schema & data model — keep `DATA_MODEL.md` in sync

`docs/DATA_MODEL.md` is the human-readable reference for the database — every table, column,
type, constraint, enum, and the view-model layers built on top. **Consult it first** when
reasoning about the data model. **Whenever you change the DB or schema** — `docs/schema.sql`,
`docs/seed.sql`, the row/view-model types in `lib/types.ts`, or the admin contracts in
`lib/admin/` — **update `docs/DATA_MODEL.md` in the same change** so it never drifts. The
research prompts and examples in `docs/ai-research/` should stay consistent with it too.

### Shrine detail: intercepting + parallel route

`app/@modal/(.)shrines/[slug]/page.tsx` — renders as a side modal on soft navigation from the listing (`/shrines → /shrines/slug`).

`app/shrines/[slug]/page.tsx` — renders as a full page on direct navigation or shared links.

Both call the same `getShrineDetail` + `ShrineDetailView`; the `variant` prop (`"modal"` | `"page"`) controls layout. `app/@modal/default.tsx` renders nothing, preventing the modal slot from blocking direct page navigation.

### Client interactivity

Pages are server components that hand pre-built data to client components:
- `ShrineListing` — faceted filtering (URL-synced) over `ShrineCard[]`
- `DeityListing` — the public `/deities` ("Pantheon") browse view
- `Calendar` — month navigation over `CalendarEntry[]`
- `SearchResults` — Fuse.js over `SearchDoc[]` (blob built in `lib/search.ts` from the Store)

### Admin section (dynamic, authenticated)

`app/admin/*` is a private content-management area, not linked from the public site and
excluded from indexing (`app/admin/layout.tsx` sets `robots: noindex`).

- **Auth:** Neon Auth (`@neondatabase/auth`) owns sign-in/sessions; the auth API handler is
  `app/api/auth/[...path]/route.ts`. Authorization is a second layer — the signed-in email
  must appear in the `app_admin` allowlist table. Guards live in `lib/auth/server.ts`
  (`requireAdmin` 404s unauthorized visitors; `assertAdmin` throws in server actions).
- **Writes:** server actions in `app/admin/actions.ts` validate pasted JSON with Zod
  (`lib/admin/shrineContract.ts`, `lib/admin/deityContract.ts`), then call runtime mutations
  in `lib/db/mutations.ts` (transactional upsert/delete, deity dedup on `name_ja`,
  catalog code→id resolution).
- **Authoring aids:** `lib/admin/keyCompleteness.ts` checks a pasted object carries every
  expected key; AI research prompts and example JSON live in `docs/ai-research/`.

### Maps

`lib/maps.ts` builds keyless Google Maps `output=embed` iframe URLs from a shrine's
`lat`/`lng`. The map in `ShrineMap` is lazy-loaded on scroll and unloaded (`about:blank`) on modal close.

### Ambient audio / motion

`lib/audioSynthesizer.ts` + `components/BackgroundAmbient.tsx` / `AmbientByRoute.tsx`
drive route-aware ambient sound. Motion uses `motion` (Framer Motion) and `gsap`.

### Unit tests

Vitest covers `lib/` only (pure logic). The `server-only` package is stubbed in `vitest.config.ts` so `store.ts` can be imported without a React Server context.

### Adding / updating shrine & deity data

Use the admin UI (`/admin`): paste contract-shaped JSON (see `docs/ai-research/` for the
research prompts and examples) into the shrine or deity import form. Zod validation +
the key-completeness check run before the data is upserted to Neon via `lib/db/mutations.ts`.
The schema is in `docs/schema.sql`; catalogs are seeded by `docs/seed.sql`. There is no
separate ingest script and no `data/` directory.

**Authoring order & deferred fields** (see `docs/DATA_MODEL.md` §10 for detail):
- **Deities are created first**, with `canonical_lore`. Then shrines link them by `name_ja`; the shrine's
  embedded `deities[].canonical` block is identity-only (no `canonical_lore`), so the shrine research
  flow never re-gathers deity lore.
- **Festival `start_date`/`end_date` are deferred** — left null at shrine-research time (no date fields in
  the shrine form/prompt). Yearly dates are uploaded later into `festival_occurrences`.
- The `canonical_lore` and festival-date **columns + Zod contract fields still exist** and accept values
  on import; they are just not gathered by the shrine flow. Don't strip them.
