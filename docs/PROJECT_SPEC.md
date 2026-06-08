# Shinto Shrine Website — Project Specification

**Status:** v1 locked, ready for build. This document supersedes `PROJECT_BRIEF.md` where they differ — it reflects every decision made after the brief.

---

## 1. Overview

An interactive website for **discovering and learning about Shinto shrines** named Jinja Meguri (神社巡り), aimed at travelers and people interested in Japanese mythology and religion. It pairs structured cultural data (shrines, deities, lore, festivals) with practical visitor guidance (location, timing, what is actually visible).

Research is done **Japanese-first** (official shrine sites, ja.wikipedia, academic and local tourism sources) and surfaced in natural **English with original Japanese terms (kanji/kana) preserved**. The site is a bridge between deep Japanese cultural knowledge and English-speaking visitors.

**Audience:** travelers planning shrine visits; enthusiasts of Shinto, mythology, and folklore.

**Scale:** a curated set of **100–200 shrines**, dozens of deities, a few hundred event occurrences per year. Optimize for query clarity and UX, not big-data scale.

**SEO is not a goal.** Acquisition does not depend on organic search; shareable URLs still matter for UX.

---

## 2. Scope

### v1 (this build)
Landing · shrine listing with faceted filters · shrine detail (as side modal from the listing, full page on direct hit) · festival calendar · search · one Google Map embed per detail page.

### v2 backlog (do not build now)
Deity detail pages · all-shrines map · themed trails ("love shrines of Kansai") · EN/JA language toggle · provenance/credibility expansions.

### Non-goals (out of scope entirely)
Booking/ticketing/e-commerce · user accounts/social · real-time data (crowds, transit) · exhaustive coverage of every shrine.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|------|--------|-------|
| Frontend | **Next.js (App Router) + React + TypeScript** | SSG/ISR for shrine pages. Chosen for intercepting/parallel routes (detail-as-modal) and static rendering — **not** for SEO (dropped). |
| Hosting | **Vercel Hobby** or **Cloudflare Pages** | Free. |
| Database | **Neon** — serverless PostgreSQL + pg_trgm | Free tier (0.5 GB) is ample at this scale. |
| Maps | **Google Maps keyless embed iframe** | No API key, no Cloud project. Detail page only. See §8. |
| Search | **Postgres FTS + pg_trgm** via the `shrine_search` materialized view | All in-DB. |
| Ingest | **Single standalone Python file** (`psycopg` v3) | Disposable; not coupled to the app. |
| i18n | **English UI + Japanese terms inline** | No language toggle in v1. |

**Neon note:** compute scales to zero after inactivity but this has no user-visible impact because the site is fully static — the DB is only hit at build time. Use `DATABASE_URL_UNPOOLED` (direct connection) for migrations and `DATABASE_URL` (pooled via PgBouncer) for build-time queries.

---

## 4. Data Model

PostgreSQL (Neon). Full DDL in `schema.sql` (14 tables + 1 view + 1 materialized view). **Naming rule:** catalog = bare plural noun (`ranks`, `deities`); junction = `shrine_` + that noun.

**Tables:** `regions`, `prefectures`, `ranks`, `prayer_categories` (controlled vocab); `deities`, `shrines` (core); `shrine_deities`, `shrine_ranks`, `shrine_prayer_categories`, `event_deities` (junctions); `shrine_details` (1:1 prose); `events`, `event_occurrences` (calendar); `sources` (provenance). **Views:** `shrine_deity_lore` (lore priority), `shrine_search` (materialized search index).

**Two additions on top of `schema.sql`** (applied via `seed.sql`, both `IF NOT EXISTS`):
- `prayer_categories.group_label text` — for grouped facet display.
- `ranks.description text` — short explanation per rank.

**Decided against:** a `map_embed_url` field. The map URL is built at runtime from `coordinates`, so no stored field is needed.

### Key model rules (locked)
- **Separate queryable attributes from prose** — filters operate on tagged junction rows, never on prose fields.
- **Deities are canonical** (one row per kami, deduped on `name_kanji`); shrine-specific role and `regional_lore` live on the `shrine_deities` junction. Read layer prefers regional, falls back to canonical (`COALESCE`).
- **`deity_type` = current official status only** (`origin | deified human | syncretic | imported`). Historical syncretism (e.g. Gozu Tennō ↔ Susanoo) lives in lore fields, never in the type.
- **`domain` = portfolio only; `title` = human identity only** (NULL for primordial kami).
- **Ranks are many-to-many** — store all as rows; "highest rank" derived as `MIN(rank_order)` at query time.
- **Calendar = manual `event_occurrences`, queried by range overlap** (`start_date <= range_end AND end_date >= range_start`); `time_prose` (display) is separate from dated occurrences (query).
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
Research (JA-first) → one contract-shaped JSON per shrine → ingest.py → Neon Postgres → REFRESH shrine_search
```

- The **contract** (`shrine_ingest_contract.jsonc`) is the JSON shape research produces and the script consumes. It carries explicit `ranks[]`, `prayer_categories[]`, `deities[]` (with `regional_lore`), `events[]` + `occurrences[]`, and `sources[]` so structured data is never buried in prose. Real data files are plain `.json` (the `.jsonc` is the annotated template).
- The **ingest script** owns: validation, deity dedup (upsert on `name_kanji`), code→id resolution (ranks, categories, region, prefecture), and idempotent re-ingest by `slug`. It is a single disposable Python file.
- **Migration** of the ~10 legacy shrines = transform old format → contract shape → same ingest script. (Migration and ingest are one tool, not two.)
- **Human pause points:** unmatched deity (no canonical block and not in DB), and validation failure.
- **Annual manual task:** each January, upload concrete `event_occurrences` dates for lunar / "Nth-weekday" festivals (these cannot be computed). Fixed-Gregorian dates can ship in the research JSON directly.

---

## 8. Maps

**Google Maps keyless public embed — no API key, no Google Cloud project.**

- URL built at runtime: `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`, from the shrine's `coordinates`. `name + city` is a last-resort fallback only when coordinates are missing (address geocoding is fuzzy for small shrines; coordinates are exact).
- **Detail page only.** One embed per shrine. **No iframes on listing cards** (performance) — cards show a static pin + city hint.
- **Lazy-load** the iframe (`data-src` + `IntersectionObserver`, ~200px margin; `loading="lazy"`) and **unload on close** (`src = about:blank`).
- The embedded map's built-in links open the **Google Maps app on mobile** for directions — the reason this provider was chosen.
- The `output=embed` endpoint is undocumented; the embed-URL builder lives in one small module so the keyed Maps Embed API (~10-min setup) can be swapped in if it ever breaks.
- The **all-shrines map** is dropped for v1 (an iframe shows one location only); a free keyless MapLibre layer is the v2 path if revived.

---

## 9. User Flows

- **The planner** (has a trip): landing → `/shrines` → filter by region + prayer category → open detail modal → check best season and `/calendar`.
- **The enthusiast** (has a god or theme): browses deity/lore across shrines; fully served in v2 by deity pages, partially in v1 via deity filtering and per-shrine lore.

Detail pages are real routed pages shown as a **side modal when opened from the listing**, and as a **full page on direct/shared links** (shareability, not SEO).

---

## 10. Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing — **visual-wonder hero**, single entry into the listing |
| `/shrines` | Listing + faceted filters (prayer category grouped by label, rank, region, prefecture, deity) |
| `/shrines/[slug]` | Detail — modal from listing, full page on direct hit |
| `/calendar` | Festival calendar — month grid + agenda toggle, range-overlap query, `time_prose` fallback |
| *(v2, reserved)* | `/deities`, `/deities/[slug]`, `/map` |

**Nav bar (v1):** Shrines · Calendar (logo → landing). Built extensibly for future Deities and Map items.

**Detail page shows:** names (EN/JA); deities with lore via `shrine_deity_lore` and per-shrine `role`; "strong for" categories; all ranks (highest highlighted); `shrine_details` prose; festivals; the Google Map embed; **sources as visible footnotes**; shrine images with a **placeholder** when none exist (owner sources images).

---

## 11. Build Status

1. **Data layer** — ✅ Neon project provisioned; schema + catalog seed applied; 6 placeholder shrines in `db/` (read layer swap to Neon pending).
2. **Frontend v1** — ✅ Next.js app built and tested against the placeholder data.

---

## 12. File Manifest

| File | Role |
|------|------|
| `PROJECT_SPEC.md` | This document — master reference. |
| `schema.sql` | Base DDL (applied to Neon). |
| `seed.sql` | Catalog seed (applied to Neon). |
| `shrine_ingest_contract.jsonc` | Per-shrine JSON contract for ingest.py. |
| `PROJECT_BRIEF.md` | Original brief (background; superseded by this spec). |

---

## 13. Constraints & Risks

- **Neon scale-to-zero** — no user impact (site is static; DB only hit at build time).
- **Undocumented Google embed endpoint** — isolated in one module; keyed Embed API is the fallback.
- **Manual touchpoints** — annual `event_occurrences` upload and image sourcing are owner tasks, not automated; design them to be low-friction.
- **Cultural accuracy and respect** — this is living religious practice. Never strip the Japanese; never hallucinate facts; cite sources.
- **Solo builder** — keep operations terminal/script-based; defer any admin UI until it earns itself.
