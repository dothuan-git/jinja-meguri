# Shinto Shrine Website — Project Specification

**Status:** built and evolving. This document supersedes `PROJECT_BRIEF.md` where they differ, and reflects the code as it currently stands (schema v3, request-time rendering, public deity pages, and an authenticated admin area). Where this spec and the original v1 plan diverge, the code wins; notable changes are called out inline.

---

## 1. Overview

An interactive website for **discovering and learning about Shinto shrines** named Jinja Meguri (神社巡り), aimed at travelers and people interested in Japanese mythology and religion. It pairs structured cultural data (shrines, deities, lore, festivals) with practical visitor guidance (location, timing, what is actually visible).

Research is done **Japanese-first** (official shrine sites, ja.wikipedia, academic and local tourism sources) and surfaced in natural **English with original Japanese terms (kanji/kana) preserved**. The site is a bridge between deep Japanese cultural knowledge and English-speaking visitors.

**Audience:** travelers planning shrine visits; enthusiasts of Shinto, mythology, and folklore.

**Scale:** a curated set of **100–200 shrines**, dozens of deities, a few hundred event occurrences per year. Optimize for query clarity and UX, not big-data scale.

**SEO is not a goal.** Acquisition does not depend on organic search; shareable URLs still matter for UX.

---

## 2. Scope

### Built
Landing · shrine listing with faceted filters · shrine detail (as side modal from the listing, full page on direct hit) · **deity browse page (`/deities`, "Pantheon")** · festival calendar · search · one Google Map embed per detail page · **authenticated admin area for managing shrines and deities**.

> Change from the original v1 plan: deity pages and a content-management admin were originally v2/deferred. Both now ship. The deity page is currently a browse/listing view; per-deity detail pages remain a candidate enhancement.

### Backlog (not built)
Per-deity detail pages · all-shrines map · themed trails ("love shrines of Kansai") · EN/JA language toggle · provenance/credibility expansions.

### Non-goals (out of scope entirely)
Booking/ticketing/e-commerce · user accounts/social · real-time data (crowds, transit) · exhaustive coverage of every shrine.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|------|--------|-------|
| Frontend | **Next.js (App Router) + React 19 + TypeScript** | Chosen for intercepting/parallel routes (detail-as-modal). Pages render **on demand** (`dynamic = "force-dynamic"`), not as a static export — so admin edits appear without a rebuild. SEO is not a goal. |
| DB driver | **`pg` (node-postgres) pooled `Pool`** | Shared pool in `lib/db/store.ts`, reused by reads, auth, and writes. |
| Hosting | **Vercel Hobby** | Free. |
| Database | **Neon** — serverless PostgreSQL | Free tier (0.5 GB) is ample at this scale. No PostGIS / pg_trgm. |
| Maps | **Google Maps keyless embed iframe** | No API key, no Cloud project. Detail page only. See §8. |
| Search | **Fuse.js** over a per-shrine text blob | Built client-side in `lib/search.ts` from the loaded data (EN + JA + typo tolerance). No DB full-text index. |
| Auth | **Neon Auth** (`@neondatabase/auth`) + `app_admin` allowlist | Powers the admin sign-in; see §7 and `ACCOUNTS.md`. |
| Validation | **Zod** | Admin JSON contracts (`lib/admin/*Contract.ts`). |
| UI / motion | **Tailwind v4**, `motion` (Framer Motion), `gsap`, `lucide-react`, ambient audio (`lib/audioSynthesizer.ts`) | |
| i18n | **English UI + Japanese terms inline** | No language toggle. |

**Neon note:** compute scales to zero after inactivity. Because pages query Neon at request time, the **first** request after idle pays a brief cold-start; subsequent requests are warm. Use `DATABASE_URL_UNPOOLED` (direct connection) for the schema/seed scripts and `DATABASE_URL` (pooled) for the app.

---

## 4. Data Model

PostgreSQL (Neon). Full DDL in `schema.sql` — **schema v3, 13 base tables, no views, no materialized view, no PostGIS** (catalogs seeded by `seed.sql`). **Naming rule:** catalog = bare plural noun (`ranks`, `deities`); junction = `shrine_` + that noun.

**Tables:** `regions`, `prefectures`, `ranks`, `prayer_categories` (controlled vocab); `deities`, `shrines` (core); `shrine_deities`, `shrine_ranks`, `shrine_prayer_categories` (junctions); `shrine_details` (1:1 prose); `festivals`, `festival_occurrences` (calendar); `sources` (provenance). An `app_admin` allowlist table (email → admin) is created out of band, not in `schema.sql` (see §7 / `ACCOUNTS.md`).

> Changes from the original v1 model:
> - `events` → **`festivals`**; `event_occurrences` → **`festival_occurrences`** (now carries an explicit `year`, `UNIQUE (festival_id, year)`). The festival's own `start_date`/`end_date` are nullable structured dates on the definition; `festival_occurrences` holds dated rows per year.
> - Shrine coordinates are now plain `lat`/`lng` (`double precision`), **not** PostGIS; shrines also carry `image_urls text[]`.
> - `deities`: `domain` removed and `title` replaced by **`titles text[]`**; `deity_type` enum is now `mythological | deified_human | syncretic`.
> - `festivals.festival_type` enum is `spectacle | pilgrimage` (was `access_type` = `public_witness | pilgrimage_experience`).
> - `shrine_details` fields are `history`, `description`, `prayer_focus`, `best_time`.
> - `sources` carries `url` + `title` only.
> - Dropped: the `event_deities` junction, the `shrine_deity_lore` view, and the `shrine_search` materialized view (search is now Fuse.js; see §3).
> - `group_label` (on `prayer_categories`) and `description` (on `ranks`) are columns in `schema.sql`, not seed-time additions.

### Key model rules
- **Separate queryable attributes from prose** — filters operate on tagged junction rows, never on prose fields.
- **Deities are canonical** (one row per kami, deduped on `name_ja`); shrine-specific `regional_lore` lives on the `shrine_deities` junction. The UI shows the primary deity's `canonical_lore` (with `regional_lore` as a supplementary note) and `regional_lore` for secondary deities.
- **`deity_type` = current official status only** (`mythological | deified_human | syncretic`). Historical syncretism (e.g. Gozu Tennō ↔ Susanoo) lives in lore fields, never in the type.
- **`titles` = divine epithets / human identity** (array; empty for primordial kami).
- **Ranks are many-to-many** — store all as rows; "highest rank" derived as `MIN(rank_order)` at query time.
- **Calendar = manual `festival_occurrences`, queried by range overlap** (`start_date <= range_end AND end_date >= range_start`); `time_prose` (display) is separate from dated occurrences (query).
- **Collective deity groups** (e.g. 八柱御子神) are stored as a single deity row (convention; revisit if individual kami are needed).

---

## 5. Catalogs (seeded by `seed.sql`)

- **`regions`** — 8 traditional regions.
- **`prefectures`** — 47, each mapped to a region (Mie placed in Kinki).
- **`ranks`** — 17 rows, a **consolidated cross-system list** spanning classical (Shikinai, Ichinomiya), modern shakaku (Kanpei/Kokuhei tiers), and post-1946 administrative (Beppyō). `rank_order` 1 = highest prestige; **`Honso` (本宗) at order 0 is unique to Ise Jingū** (the head of all Shinto, outside the ranking system); `Sohonsha` (総本社, head of a network) at order 1. Name-suffixes (`Jingu`, `Taisha`) and structural terms (`honsha`, `Shōgū`) are **not** ranks and are excluded.
- **`prayer_categories`** — 25 *goriyaku*, grouped into 7 labels: Fortune & Success, Love & Family, Health, Prosperity, Protection & Safety, Scholarship, Nation. (No official taxonomy exists; this is the project's curated set.)

---

## 6. Content & Research Rules

- Research Japanese-first; prefer official shrine sites, ja.wikipedia, academic and local tourism sources. Output English with kanji/kana preserved.
- Prioritize shrine-specific / regional lore over generic Kojiki/Nihon Shoki narrative.
- **Major / uniquely significant festivals only** (skip daily/monthly rites). Max **2** events per shrine flagged `pilgrimage_experience` (by spiritual significance); `public_witness` requires genuinely visible ceremonies/processions.
- For festivals shared across many shrines (祈年祭, 新嘗祭), summarize the shared structure and elaborate only on what is unique here.
- **Never hallucinate** dates, ritual names, or facts. Capture citations into `sources`.
- Narrative fields are full flowing prose, not summaries.

---

## 7. Data Pipeline / Workflow

```
Research (JA-first) → in-place editor draft (ShrineInput / DeityInput) → Zod validation → lib/db/mutations.ts → Neon Postgres
```

> Change from the original v1 plan: there is **no standalone Python ingest script and no `data/` directory**, and **no `/admin` JSON-import UI** — content is authored in place on the public surfaces (`/shrines`, `/deities`, and the create pages); the "ingest" is server actions + runtime mutations.

- The **contract** is a JSON shape (one per shrine, one per deity) carrying explicit `ranks[]`, `prayer_categories[]`, `deities[]` (with `regional_lore` and an optional canonical block), `festivals[]` + `occurrences[]`, and `sources[]` so structured data is never buried in prose. It is defined by the **Zod schemas** in `lib/admin/shrineContract.ts` and `lib/admin/deityContract.ts`. The **AI research prompts and worked examples** live in `docs/ai-research/` (`SHRINE_RESEARCH_PROMPT.md`, `DEITY_RESEARCH_PROMPT.md`, `*_MD` variants, and example JSON).
- **Authoring flow:** everything is **in place** — shrines edit/create on the shrine detail layout (`/shrines/[slug]`, `/shrines/new`); deities edit/create on the `/deities` carousel (`/deities/new`). There are no JSON-import or structured-form pages. The editors serialize their draft to the contract shape, Zod validates → `lib/db/mutations.ts` upserts transactionally, owning deity dedup (upsert on `name_ja`), catalog code→id resolution (ranks, categories, region, prefecture), and idempotent re-save by `slug`.
- **Auth & authorization:** Neon Auth owns sessions; the email must also be present in the `app_admin` allowlist table. Guards: `requireAdmin` (404s unauthorized page visitors), `assertAdmin` (throws in server actions), and `getAdminEmail` (toggles the in-place editing affordances), all in `lib/auth/server.ts`. The sign-in UI was removed and is being re-implemented from scratch; the auth backend (`app/api/auth/[...path]/route.ts`) remains. Onboarding/offboarding admins is described in `docs/ACCOUNTS.md`.
- **Annual manual task:** each January, concrete `festival_occurrences` dates (with `year`) are needed for lunar / "Nth-weekday" festivals (these cannot be computed). The importer UI was removed; for now these are loaded via the DB scripts / `upsertOccurrences` pending a re-implemented uploader. Fixed-Gregorian dates can ship in the festival definition directly.

---

## 8. Maps

**Google Maps keyless public embed — no API key, no Google Cloud project.**

- URL built at runtime (`lib/maps.ts`): `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`, from the shrine's `lat`/`lng`. `name + city` is a last-resort fallback only when coordinates are missing (address geocoding is fuzzy for small shrines; coordinates are exact).
- **Detail page only.** One embed per shrine. **No iframes on listing cards** (performance) — cards show a static pin + city hint.
- **Lazy-load** the iframe (`data-src` + `IntersectionObserver`, ~200px margin; `loading="lazy"`) and **unload on close** (`src = about:blank`).
- The embedded map's built-in links open the **Google Maps app on mobile** for directions — the reason this provider was chosen.
- The `output=embed` endpoint is undocumented; the embed-URL builder lives in one small module so the keyed Maps Embed API (~10-min setup) can be swapped in if it ever breaks.
- The **all-shrines map** is dropped for v1 (an iframe shows one location only); a free keyless MapLibre layer is the v2 path if revived.

---

## 9. User Flows

- **The planner** (has a trip): landing → `/shrines` → filter by region + prayer category → open detail modal → check best season and `/calendar`.
- **The enthusiast** (has a god or theme): browses deity/lore across shrines via the `/deities` ("Pantheon") page, deity filtering, and per-shrine lore. Per-deity detail pages are a candidate enhancement.

Detail pages are real routed pages shown as a **side modal when opened from the listing**, and as a **full page on direct/shared links** (shareability, not SEO).

---

## 10. Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing — **visual-wonder hero**, single entry into the listing |
| `/shrines` | Listing + faceted filters (prayer category grouped by label, rank, region, prefecture, deity) |
| `/shrines/[slug]` | Detail — modal from listing (`@modal` intercept), full page on direct hit |
| `/deities` | Deity browse ("Pantheon") |
| `/calendar` | Festival calendar — month grid + agenda toggle, range-overlap query, `time_prose` fallback |
| `/search` | Fuse.js search over shrines |
| `/shrines/new`, `/deities/new` | Admin-guarded in-place create pages |
| `/api/auth/[...path]` | Neon Auth handler (session) |
| *(reserved)* | `/deities/[slug]`, `/map`; sign-in UI (to be re-implemented) |

> Content management is **inline** on `/shrines`, `/shrines/[slug]`, `/deities`, and the create pages above (gated by `getAdminEmail`/`requireAdmin`). The standalone `/admin` UI (dashboard, structured-form / JSON-import pages, sign-in, password reset) was removed.

**Nav bar:** Sanctuaries (`/shrines`) · Pantheon (`/deities`) · Festivals (`/calendar`); logo → landing. The home route is full-bleed (no chrome).

**Detail page shows:** names (EN/JA); deities with lore (primary: canonical, plus regional as a supplementary note; secondary: regional only); "strong for" categories; all ranks (highest highlighted); `shrine_details` prose; festivals; the Google Map embed; **sources as visible footnotes**; shrine images (`image_urls`) with a **placeholder** when none exist (owner sources images).

---

## 11. Build Status

1. **Data layer** — ✅ Neon provisioned; schema v3 + catalog seed applied; read layer (`lib/db/store.ts` → `repo.ts`) queries Neon at request time.
2. **Frontend** — ✅ Next.js app built: landing, shrine listing/detail, deity browse, calendar, search.
3. **Admin** — ✅ `app_admin` allowlist + `getAdminEmail`/`requireAdmin` guards; shrine & deity create/edit/delete entirely in place. Sign-in UI removed pending a from-scratch rebuild (auth backend retained).

---

## 12. File Manifest

| File | Role |
|------|------|
| `PROJECT_SPEC.md` | This document — master reference. |
| `schema.sql` | DDL (schema v3, applied to Neon). |
| `seed.sql` | Catalog seed (applied to Neon). |
| `ai-research/` | AI research prompts + example JSON for authoring shrine/deity records. |
| `ACCOUNTS.md` | Admin auth model and onboarding (high level). |
| `erd.html` | Visual ERD. |
| `PROJECT_BRIEF.md` | Original brief (background; superseded by this spec). |

The shrine/deity JSON contracts are defined in code (`lib/admin/shrineContract.ts`, `lib/admin/deityContract.ts`); there is no `shrine_ingest_contract.jsonc` and no `ingest.py`.

---

## 13. Constraints & Risks

- **Neon scale-to-zero** — first request after idle pays a brief cold-start (pages query at request time); warm thereafter.
- **Undocumented Google embed endpoint** — isolated in one module (`lib/maps.ts`); keyed Embed API is the fallback.
- **Manual touchpoints** — annual `festival_occurrences` dates and image sourcing are owner tasks; image URLs are entered in the in-place shrine editor, while the occurrences uploader is pending re-implementation (currently seeded via the DB scripts). Keep them low-friction.
- **Admin surface** — the admin area runs runtime DB writes; access is gated by Neon Auth **and** the `app_admin` allowlist, and the routes 404 for unauthorized visitors.
- **Cultural accuracy and respect** — this is living religious practice. Never strip the Japanese; never hallucinate facts; cite sources.
- **Solo builder** — keep operations low-maintenance.
