# Jinja Meguri 神社巡り

A field guide to the shrines of Japan — their kami, lore, and festivals — surfaced in English with the original Japanese preserved.

A Next.js (App Router) site that browses the shrine database: an atmospheric landing page, a faceted shrine listing, shrine detail shown as a side modal from the list (and as a full page on direct navigation), a deity ("Pantheon") browser, a festival calendar, and search. A private admin area manages the content.

## Architecture

The site is **server-rendered on demand**. Each route queries a [Neon](https://neon.tech) serverless Postgres database at request time (via a pooled `pg` connection) and renders fresh HTML — so admin edits appear on the next page load without a rebuild.

- Data access (`lib/db/`, server-only) queries the 13 normalized tables and assembles typed view models. `loadStore()` is wrapped in React `cache()` (one query pass per request). Pure logic (`lib/`) is unit-tested.
- `/shrines`, `/deities`, `/calendar`, and `/search` pass their prebuilt data to small client components for interactivity (URL-synced filters, month navigation, fuzzy search).
- Shrine detail is rendered as a Next.js **intercepting + parallel route** (`@modal`): a side modal on soft navigation from the listing, a full page on a direct hit / shared link.
- Search is **Fuse.js** over a per-shrine text blob (English + Japanese + typo tolerance) built in `lib/search.ts` from the loaded data.
- The per-shrine map is a **keyless Google Maps `output=embed` iframe**, lazy-loaded on scroll and unloaded (`about:blank`) when the modal closes. The URL builder lives in `lib/maps.ts` so swapping to the keyed Embed API later is a one-file change.
- The **admin area** (`/admin`) is authenticated with Neon Auth and gated by an `app_admin` allowlist. Admins paste contract-shaped JSON (validated with Zod) to upsert shrines and deities through server actions. See [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md).

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (lib/)
npm run test:e2e     # Playwright acceptance tests (builds + serves, then drives a browser)
npm run db:setup     # apply docs/schema.sql + docs/seed.sql to Neon
npm run db:reset     # drop the public schema, then reapply schema + seed
```

## Environment

Set these in `.env.local`:

- `DATABASE_URL` — pooled Neon connection string (used by the app at runtime).
- `DATABASE_URL_UNPOOLED` — direct connection, preferred by the schema/seed scripts.
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` — Neon Auth (admin sign-in).

## Data

Shrine and deity data lives in **Neon Postgres** (schema: [`docs/schema.sql`](docs/schema.sql); catalog seed: [`docs/seed.sql`](docs/seed.sql)). To add or update content, sign in to the admin area at `/admin` and paste contract-shaped JSON into the shrine or deity import form — the research prompts and worked examples are in [`docs/ai-research/`](docs/ai-research/). Validation and a key-completeness check run before the record is written.

The current shrines may be development placeholders to be replaced with real research.

## Deploy (Vercel Hobby — free)

1. Import the repository in Vercel. The framework is auto-detected as Next.js.
2. Add the environment variables above in Vercel project settings.
3. Register the deployed domain as a trusted origin with the Neon Auth service (required for the admin password-reset email links).

Routes render on demand against Neon at request time (not a static export).

## Project layout

```
app/         routes (App Router): public pages, @modal intercepting route, admin, auth API
components/  UI (nav, cards, filters, detail view, modal, map, calendar, search, admin forms)
lib/         types, data access (db/ incl. mutations), auth, admin contracts, calendar, maps, search (+ unit tests)
docs/        project brief/spec, schema, seed, AI research prompts (ai-research/), admin notes
scripts/     db schema + seed setup
tests/e2e/   Playwright acceptance tests
```
