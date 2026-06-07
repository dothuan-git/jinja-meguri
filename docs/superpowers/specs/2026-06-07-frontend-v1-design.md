# Jinja Meguri — Frontend v1 Design

> **Status:** approved (brainstorm), pending implementation plan.
> **Source spec:** [docs/HANDOFF_B_frontend.md](../../HANDOFF_B_frontend.md) · **Background:** [docs/PROJECT_BRIEF.md](../../PROJECT_BRIEF.md)
> **Goal:** a Next.js (App Router) site that browses the shrine database — landing, faceted shrine listing, shrine detail (side modal from the list / full page direct), festival calendar, and search. Builds and deploys to a free host.

---

## 1. Key decisions (locked in brainstorm)

1. **Data source: build-time static JSON, fully SSG.** Handoff A shipped as a local JSON store (`db/*.json`), not Supabase. The frontend reads those files at build time and renders every route statically. No Supabase, no API keys, no free-tier pause. This matches the deliberately swappable data layer `ingest.py` already produces.
2. **Dummy data: expand to ~6 shrines.** Author ~4 more contract-shaped shrines covering varied regions/prefectures, deities, ranks, and prayer-category groups, including **one lunar/Nth-weekday festival with empty `occurrences[]`** to exercise the calendar fallback.
3. **Aesthetic: vermilion & sumi ink.** Warm washi-paper light ground, torii vermilion (朱) accent, deep sumi-ink text, generous negative space, serif/mincho pairing for EN + JA. Executed via the `frontend-design` skill, refined on real screenshots.

**Divergence from Handoff B noted:** Handoff B assumed a Supabase JS client + RLS and Postgres FTS/pg_trgm search. With the static-JSON decision, "FTS + trigram" search becomes a client-side ranked + fuzzy matcher (Fuse.js) over the same `shrine_search` blob. All other Handoff B requirements are met unchanged.

---

## 2. Stack & repository layout

- **Next.js (App Router) + React + TypeScript + Tailwind CSS.** Output: fully static (SSG). Deploy target: Vercel Hobby (free).
- The Next app lives at the **repo root** so server components can `fs`-read the existing `db/` at build time. Existing `db/`, `docs/`, `ingest.py`, `seed_catalogs.py` stay in place.

```
app/            ← routes (App Router)
components/     ← UI components
lib/            ← data access, maps, search, types
public/         ← static assets / placeholders
db/             ← EXISTING normalized JSON store (read at build)
data/           ← EXISTING + new contract-shaped shrine source JSON
docs/  ingest.py  seed_catalogs.py   ← existing
```

---

## 3. Data access layer (`lib/db/`, server-only)

A memoized loader `fs`-reads the 14 `db/*.json` tables + catalogs once at build (path via `process.cwd()`), and exposes typed repositories that join normalized rows into **view models**. No runtime database.

View models:
- `ShrineCard` — `slug`, `name_en`, `name_ja`, primary deity (the `shrine_deities` row with `is_primary`), "strong for" categories, **highest rank** (`ranks` row with `MIN(rank_order)`), `city`, `prefecture`, `region`.
- `ShrineDetail` — everything `ShrineCard` has plus: all deities with `role` and resolved lore (`COALESCE(regional_lore, canonical_lore)` + `is_regional`, mirroring the `shrine_deity_lore` view), all ranks (with highest flagged), `shrine_details` prose (`history`, `why_visit`, `prayer_focus`, `best_season`), events (with `time_prose`, `origin`, `meaning`, `ritual`, `prayer`, `access_type`, `visitor_notes`), occurrences, coordinates, sources.
- `CalendarOccurrence` — flattened `{ event, shrine, start_date, end_date }` for range queries, plus "expected timing" pseudo-entries derived from `events.time_prose` when a chosen year has no occurrences.
- `SearchDoc` — `{ slug, name_en, name_ja, city, blob }` built from `shrine_search.json` plus structured fields, indexed by Fuse.js.

Derivation rules (single source of truth, unit-testable):
- **Highest rank** = the shrine's rank with the minimum `rank_order`.
- **Deity lore** = `regional_lore ?? canonical_lore`; `is_regional = regional_lore != null`.

---

## 4. Routes & rendering

| Route | Purpose | Render |
|---|---|---|
| `/` | Landing — full-bleed vermilion hero, one CTA into `/shrines` | SSG |
| `/shrines` | Listing + faceted filters | SSG; server builds `ShrineCard[]` + facet catalogs, passes to a client component; **filter state in URL query params** (shareable) |
| `/shrines/[slug]` | Shrine detail | SSG via `generateStaticParams`; **full page on direct hit / shared link** |
| `@modal/(.)shrines/[slug]` | Same detail as a **side modal** over `/shrines` | Intercepting + parallel route |
| `/calendar` | Festival calendar | SSG shell + client month-nav/filters |
| `/search` | Search results | SSG shell + client search over the build-time index; header search box routes here |

**Nav bar:** two items — **Shrines · Calendar** (logo → landing). A header search box opens `/search`. Built so future **Deities / Map** items slot in without restructuring.

**Reserved, do NOT build:** `/deities`, `/deities/[slug]`, `/map` (v2).

---

## 5. Shrine listing (`/shrines`)

**Faceted filters (operate on junction-table rows, never on prose), client-side over the embedded dataset:**
- **Prayer category** ("strong for") — grouped under the 7 `prayer_categories.group_label` headings.
- **Rank** — by `ranks`.
- **Region** and **Prefecture** — prefecture options depend on the selected region.
- **Enshrined deity**.

Filter state is reflected in URL query params so a filtered view is shareable; clearing returns to the full list. Multiple selections within a facet are OR; across facets are AND.

**Cards** show: `name_en` + `name_ja`, primary deity, "strong for" chips, **highest rank** (`MIN(rank_order)`), city, and a lightweight **geographic hint (pin icon + city/prefecture) — NO map iframe.** Clicking a card opens the detail as a side modal.

---

## 6. Shrine detail (`/shrines/[slug]`)

Renders full as a page on direct navigation, and as a side modal when navigated from `/shrines`. Both render the same component from the same `ShrineDetail` view model.

Content:
- Names (EN/JA).
- Enshrined deities with resolved lore (`COALESCE`; show the `is_regional` distinction subtly) and each deity's `role`.
- "Strong for" categories; all ranks (highest highlighted).
- `shrine_details` prose: `history`, `why_visit`, `prayer_focus`, `best_season`.
- **Festivals:** the shrine's `events` with `time_prose`, `origin`/`meaning`/`ritual`/`prayer`, `access_type`, `visitor_notes`.
- **Google Map** — one keyless embed (see §8), detail only.
- **Sources** rendered as visible footnotes (url + title + type) for provenance.
- **Images:** render shrine image(s) when present; otherwise a clean **placeholder component**.

---

## 7. Festival calendar (`/calendar`)

- **Month grid** by default with an **agenda-list** toggle.
- Query occurrences by **date-range overlap**: `start_date <= rangeEnd && end_date >= rangeStart`, so multi-day / boundary-spanning festivals appear in **every** month they touch.
- Filter by **region** and **prayer category**.
- **Fallback:** for a chosen year with no occurrences for an event, show `events.time_prose` as an unpinned **"expected timing — dates TBC"** entry so the festival stays discoverable.

---

## 8. Google Maps embed (detail only) — `lib/maps.ts`

Keyless public embed; **no API key, no Cloud project.**
- URL builder: `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`, built at runtime from the shrine's `coordinates`. Use `name + city` only as a last-resort fallback when coordinates are missing.
- `<ShrineMap>` component: keep the real URL in `data-src`; set the iframe `src` only when it scrolls into view (`IntersectionObserver`, ~200px margin); add `loading="lazy"`.
- **Unload on close:** when the detail modal/map closes, set `src="about:blank"` to free it.
- **No** interactive iframes on listing cards — cards get the static pin + city only.
- Builder isolated in one module so swapping to the keyed Maps Embed API later is trivial.

---

## 9. Search — `lib/search.ts`

- **Fuse.js** over a build-time index derived from the `shrine_search` blob (`name_en`, `name_ja`, `city`, deity romaji + kanji, prayer categories, event names) plus structured fields.
- Ranked results; **Japanese + typo tolerance** via Fuse's fuzzy matching over the blob (which contains kanji). Covers shrine name, city, deity (romaji + kanji), prayer category, event names.
- Returns ranked shrines → click → detail.
- Engine isolated behind a small interface so it can be swapped (e.g. to Postgres FTS) without touching the UI.

---

## 10. Design system

- **Palette:** washi-paper light ground, torii vermilion (朱) primary accent, deep sumi-ink near-black text, restrained supporting neutrals.
- **Type:** refined serif for EN paired with a mincho for JA; generous line-height and negative space; Japanese terms (kanji/kana) preserved inline next to English.
- **Tone:** editorial, reverent, museum-like — avoid generic AI aesthetics (per `frontend-design` skill).
- Executed via the `frontend-design` skill; layout/spacing refined against Playwright screenshots during verification.

---

## 11. Dummy data

- Author ~4 more contract-shaped shrine JSON files in `data/` (in addition to the existing Hikawa + Yasaka), covering varied regions/prefectures, deities (incl. mix of regional and canonical-only lore), 2–3 ranks each, and prayer categories spanning different groups.
- Include **one lunar / Nth-weekday festival with empty `occurrences[]`** (and meaningful `time_prose`) to exercise the calendar fallback, plus at least one more multi-day festival with occurrences.
- Include `sources` per shrine.
- Ingest via `python ingest.py data/` then refresh `shrine_search.json`. The owner replaces these with real data later.

---

## 12. Verification (definition of done)

- `tsc` typecheck passes; `next build` completes clean (all routes prerendered).
- Playwright smoke checks:
  - All v1 routes render against the JSON data.
  - All five listing facets filter correctly; prayer categories show grouped.
  - Cards show highest rank and a pin+city hint with no iframe.
  - Detail opens as a modal from the list and as a full page on direct nav; lore uses COALESCE; sources show as footnotes; map lazy-loads and unloads on close.
  - Calendar shows a multi-day festival in every month it spans and falls back to `time_prose` for an un-uploaded year.
  - Search returns ranked shrines for English, Japanese, and typo'd queries.
- Builds and deploys to the free host (Vercel Hobby).

---

## 13. Out of scope (v1)

Deity pages, all-shrines map, themed trails, EN/JA language toggle, user accounts, booking, real-time data. These are v2.
