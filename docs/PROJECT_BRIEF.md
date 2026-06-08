# Shinto Shrine Website — Project Brief (LOCKED for handoff)

> **Purpose of this document.** A self-contained brief for an AI assistant to brainstorm against. It contains the product vision, locked data model, design decisions, content rules, and explicitly-open questions. Read the whole thing before proposing ideas; many "obvious" suggestions are already decided below.

---

## 1. Product Overview

An **interactive bilingual (EN/JA) website for discovering and learning about Shinto shrines** named Jinja Meguri (神社巡り), aimed at travelers and people interested in Japanese mythology/religion who want to visit shrines in Japan. It combines structured cultural data (shrines, deities, lore, festivals) with practical visitor guidance (location, timing, what you can actually see).

**The site is a bridge** between deep Japanese cultural knowledge and English-speaking visitors. Research is done in Japanese (official shrine sites, ja.wikipedia, academic/tourism sources) and surfaced in natural English with original Japanese terms (kanji/kana) preserved.

### Target audience
- Travelers planning shrine visits in Japan.
- Enthusiasts of Shinto, Japanese mythology, and folklore.
- Secondary: organic search visitors landing on a specific shrine/festival.

### Non-goals (out of scope, do not brainstorm)
- Booking, ticketing, or e-commerce.
- User accounts / social features (at least v1).
- Real-time data (no live crowd levels, no live transit).
- Exhaustive coverage — this is a curated set of major/notable shrines, not every shrine in Japan.

---

## 2. Core Features

1. **Landing page** — entry / orientation.
2. **Listing page** — all curated shrines with key info and **faceted filters** (by prayer category / "strong for", shrine rank, region, prefecture, enshrined deity). Filters operate on rows, never on prose.
3. **Detail view** — full info per shrine. **Decision: real routed pages (`/shrines/<slug>`) presented as a side modal when navigated from the listing** (Next.js intercepting/parallel routes). Direct hits (search, shared link) render the full page. Rationale: modal-only kills shareability + SEO, which is the primary acquisition channel for this audience.
4. **Maps** — *both* a single all-shrines map (PostGIS coordinates fed into one Leaflet/Mapbox layer) **and** a focused per-shrine view on detail pages. Not per-shrine iframes.
5. **Festival calendar** — monthly view of which events occur when. Dates vary per year (lunar / "Nth weekday" timing), so the owner **manually uploads concrete dates each January** into `event_occurrences`. The calendar queries that table by **date-range overlap** (`start_date <= range_end AND end_date >= range_start`) so multi-day / boundary-spanning festivals appear in every month they touch.
6. **Search** — one search surface over shrine name, city, deity (romaji + kanji), prayer category, and event names. Backed by Postgres FTS (ranked English) + pg_trgm (Japanese terms + typo tolerance). Returns ranked shrines → click → detail page.

### Displayed per shrine
Name (EN/JA), enshrined deities, what it's "strong for", shrine lore/history, per-deity lore, shrine rank(s), notes, festivals & events, map location, best season/timing, sources.

---

## 3. Tech Stack

- **Frontend:** Next.js / React (chosen for SSR/SSG → SEO, image optimization, and native modal-as-page routing). *Not yet scaffolded.*
- **Database:** Neon — serverless PostgreSQL + pg_trgm.
- **Data volume:** small — tens of shrines (currently ~10 researched), dozens of deities, a few hundred event occurrences/year. Optimize for query clarity and good UX, not big-data scale.

---

## 4. Data Model (LOCKED)

PostgreSQL + PostGIS. **Naming rule:** a catalog table is the bare plural noun (`ranks`, `prayer_categories`, `deities`); its junction is `shrine_` + that noun (`shrine_ranks`, `shrine_prayer_categories`, `shrine_deities`). Full DDL is in `schema.sql`; visual ERD in `erd.html`.

### Tables

**Reference / controlled vocabulary**
- `regions` — 8 traditional regions. `name_en`, `name_ja`.
- `prefectures` — ~47, each FK to a region. `name_en`, `name_ja`.
- `ranks` — shrine rank hierarchy (Honsha → Sonsha + Templeshrine). `code`, `name_en/ja`, `rank_order` (1 = highest). "Highest rank" is derived as `MIN(rank_order)`, not stored.
- `prayer_categories` — fixed 24-value vocab (Victory, Protection, Love, Marriage, Seafaring, …). Powers the listing facet filter.

**Core entities**
- `deities` — canonical, one row per kami, deduped on `name_kanji`. Holds invariant data only: `name_romaji`, `name_kanji`, `domain` (portfolio ONLY, no narrative), `title` (human historical identity, NULL for primordial), `deity_type` (`origin|deified human|syncretic|imported`), `canonical_lore` (Kojiki/Nihon Shoki fallback narrative).
- `shrines` — `slug` (URL key), `name_en/ja`, FK `prefecture_id`, denormalized FK `region_id` (cheap region filter), `city`, `address`, `coordinates` (PostGIS geography Point), `notes`, timestamps.

**Junctions**
- `shrine_deities` — shrine↔deity. Carries SHRINE-SPECIFIC data: `is_primary`, `sort_order`, `role`, `regional_lore`. (Per-shrine lore lives here, NOT on `deities`, because the same kami has different stories at different shrines.)
- `shrine_ranks` — shrine↔rank (all ranks as rows, many-to-many).
- `shrine_prayer_categories` — shrine↔category (the "strong for" facet).
- `event_deities` — event↔deity, with event-specific `role`.

**Detail (1:1)**
- `shrine_details` — `history`, `why_visit`, `prayer_focus`, `best_season`. (No festival summary field — derived from `event_occurrences` to avoid drift.)

**Events / calendar**
- `events` — festival *definition* (written once): `name_en/ja`, `time_prose` (DISPLAY ONLY, e.g. "dawn, 2nd Sunday of May"), `origin`, `meaning`, `ritual`, `prayer`, `access_type` (`public_witness|pilgrimage_experience`), `visitor_notes`.
- `event_occurrences` — concrete dated rows the **calendar queries**. `event_id`, denormalized `shrine_id` (calendar hot path), `start_date`, `end_date`. Indexed `(start_date, end_date)`. Manually uploaded per year.

**Provenance & derived**
- `sources` — per-shrine citations: `url`, `title`, `source_type` (`official|wikipedia_ja|tourism|academic`), `note`.
- `shrine_deity_lore` (VIEW) — applies the lore-priority rule: `COALESCE(regional_lore, canonical_lore)` + `is_regional` flag.
- `shrine_search` (MATERIALIZED VIEW) — one row/shrine: a `tsvector` (ranked EN) and a trigram `search_blob` (JP + fuzzy) aggregating deities, categories, events. `REFRESH` after ingest.

---

## 5. Design Decisions (LOCKED — don't re-litigate)

- **Detail = real pages shown as modal.** SEO + shareability required.
- **Separate queryable attributes from prose.** Filters need tagged rows; prose can't be faceted.
- **Deity = canonical table + per-shrine junction lore.** Prefer regional lore, fall back to canonical (`COALESCE`).
- **`deity_type` = current official status only.** Historical syncretism (e.g. Gozu Tennō ↔ Susanoo) goes in lore fields, never in the type.
- **`domain` = portfolio only; `title` = human identity only (NULL for primordial).**
- **Shrine ranks are many-to-many.** Store all ranks as rows; derive "highest" at query time.
- **Calendar = manual `event_occurrences`, queried by range overlap.** Lunar / "Nth weekday" dates can't be computed reliably.
- **`time_prose` (display) is separate from dated occurrences (query).**

## 6. Content / Research Rules (for any AI generating shrine data)
- Research in Japanese first; prefer official shrine sites, ja.wikipedia, academic + local tourism sources. Output English with kanji/kana preserved.
- Prioritize shrine-specific / regional lore over generic Kojiki/Nihon Shoki narrative.
- Major/uniquely-significant festivals only (skip daily/monthly rites). Max 2 events flagged `pilgrimage_experience` (by spiritual significance). `public_witness` requires genuinely visible ceremonies/processions.
- For festivals shared across many shrines (祈年祭, 新嘗祭), summarize the shared structure and elaborate only on what's unique here.
- Never hallucinate dates, ritual names, or facts. Capture citations into `sources`.
- Narrative fields (`origin/meaning/ritual/prayer/visitor_notes`) are full flowing prose, not summaries.

## 7. Data Pipeline (intended)
Research output is **clean JSON** (one shrine), which an **ingest script** maps into the relational tables. The script (not the LLM) owns: deity dedup (upsert on kanji), rank parsing, EN/JA splitting, and deriving `event_occurrences` rows (with a human assist for lunar/Nth-weekday dates). Research JSON should carry explicit `occurrences[]`, `ranks[]`, and `sources[]` arrays so structured data isn't buried in prose. ~10 shrines already researched in an older static-file format → need migration onto this schema.

---

## 8. OPEN QUESTIONS — brainstorm here
These are genuinely undecided. Strong ideas welcome.
1. **Discovery UX beyond filters.** "Shrines near me," themed trails (e.g. "love shrines of Kansai"), map-first vs list-first browsing, deity-centric browsing (start from a god → see all its shrines).
2. **The deity as a first-class page.** Should deities get their own detail pages (lineage, all shrines enshrining them, cross-shrine lore)? Schema supports it; is it worth building?
3. **Calendar UX.** Month grid vs agenda list; how to show a festival whose date for the chosen year isn't uploaded yet (fall back to `time_prose`?); filtering the calendar by region/category.
4. **Onboarding for non-experts.** How much Shinto context to teach a first-time visitor without overwhelming them. Glossary? Inline term tooltips (torii, kami, ema…)?
5. **Bilingual UX.** Full EN/JA site toggle, or English UI with Japanese terms inline? How far does `name_ja` get surfaced?
6. **Migration strategy** for the ~10 existing shrines from old static JSON.
7. **Landing page concept** — what's the hook in the first 5 seconds for this audience?
8. **Trust / provenance display.** Should `sources` be visible to users (cited like footnotes) to build credibility?

## 9. Constraints to respect when brainstorming
- Neon free tier; small data volume; solo builder.
- Bilingual integrity (never strip the Japanese).
- Cultural accuracy and respect — this is living religious practice, not mythology trivia.
- SEO matters (organic search is the main acquisition channel).

---

### Attached artifacts
- `schema.sql` — full PostgreSQL/PostGIS DDL (14 tables + 1 view + 1 materialized view + indexes).
- `erd.html` — interactive visual ERD (open in a browser).
