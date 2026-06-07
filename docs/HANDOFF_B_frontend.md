# Handoff B — Frontend

> **Goal:** a Next.js (App Router) site that browses the shrine database — landing, shrine listing with faceted filters, shrine detail (as side-modal from the list), festival calendar, and search.
> **Definition of done:** all v1 routes work against the Supabase database from Handoff A; filters, search, calendar, and the per-shrine Google Map embed all function; the site builds and deploys to a free host.

Do this **after** Handoff A — the database must be populated first.

---

## Stack (locked)
- **Next.js (App Router) + React + TypeScript.** SSG/ISR for shrine pages (keeps most views off the DB, which sidesteps the Supabase free-tier pause). Revalidate on a sensible interval (e.g. hourly).
- **Supabase JS client**, read-only (anon key). Enable RLS with public `SELECT` policies on all tables, or keep them publicly readable — the site has no auth and no writes.
- **Styling:** follow the `frontend-design` skill for quality and a distinctive (non-generic) look. Tailwind is fine.
- **Maps:** Google Maps **embed iframe only — no API key, no Google Cloud project.** Details below.
- **No MapLibre, no map provider SDK** (the all-shrines map was dropped for v1).
- **i18n:** English UI with Japanese terms (`name_ja`, kanji) shown inline. No language toggle in v1.
- **Host:** Vercel Hobby or Cloudflare Pages (free).

---

## Routes
| Route | Purpose | Render |
|-------|---------|--------|
| `/` | Landing — visual-wonder hero | SSG |
| `/shrines` | Listing + faceted filters | SSG/ISR; filters client-side or via query params |
| `/shrines/[slug]` | Shrine detail | SSG/ISR. **Shown as a side modal when navigated from `/shrines`** (Next.js intercepting/parallel routes); renders as a full page on direct hit / shared link |
| `/calendar` | Festival calendar | ISR or client-fetched |
| *(reserved, do NOT build)* `/deities`, `/deities/[slug]`, `/map` | v2 | — |

### Nav bar
Two items only: **Shrines** · **Calendar** (logo → landing). Build it so future items (Deities, Map) can be added without restructuring.

---

## Pages

### Landing (`/`)
Visual-wonder hero: a full-bleed shrine image with the site name and a single clear entry into `/shrines`. Atmospheric, image-forward — this is the 5-second hook for travelers and enthusiasts. Keep copy minimal.

### Shrine listing (`/shrines`)
- **Faceted filters** (operate on rows via the junction tables, never on prose):
  - **Prayer category** ("strong for") — grouped under the 7 `prayer_categories.group_label` headings.
  - **Rank** — by `ranks`.
  - **Region** and **Prefecture** (prefecture list can depend on selected region).
  - **Enshrined deity**.
- **Cards** show: `name_en` + `name_ja`, primary deity (the `shrine_deities` row with `is_primary`), "strong for" chips, the **highest rank** (= `ranks` row with `MIN(rank_order)` among the shrine's ranks), city, and a lightweight **geographic hint (pin icon + city/prefecture) — NO map iframe on cards.**
- Clicking a card opens the detail as a side modal.

### Shrine detail (`/shrines/[slug]`)
Show everything for the shrine:
- Names (EN/JA), enshrined deities with their lore via the **`shrine_deity_lore` view** (`COALESCE(regional_lore, canonical_lore)`; show the `is_regional` distinction subtly if useful), each deity's `role`.
- "Strong for" categories, all ranks (highlight the highest), the `shrine_details` prose (`history`, `why_visit`, `prayer_focus`, `best_season`).
- **Festivals**: list this shrine's `events` with `time_prose`, `origin`/`meaning`/`ritual`/`prayer`, `access_type`, `visitor_notes`.
- **Google Map** (one embed, detail page only) — see below.
- **Sources** rendered as visible footnotes (url + title + type) to signal provenance/credibility.
- **Images**: render shrine image(s) when present; otherwise a clean placeholder component (the owner adds real images later).

### Festival calendar (`/calendar`)
- **Month grid** by default, with an **agenda-list** toggle.
- Query `event_occurrences` by **date-range overlap**: `start_date <= :range_end AND end_date >= :range_start`, so multi-day / boundary-spanning festivals appear in **every** month they touch.
- Filter by **region** and **prayer category**.
- For a chosen year with **no uploaded occurrences** for an event, fall back to showing `events.time_prose` as an unpinned "expected timing — dates TBC" entry, so the festival stays discoverable before the January upload.

### Search
- One input over the **`shrine_search` materialized view**: ranked English via `search_tsv` (FTS) + fuzzy/Japanese via `search_blob` (`pg_trgm`). Combine both (e.g. FTS rank, fall back to trigram similarity).
- Searches shrine name, city, deity (romaji + kanji), prayer category, event names.
- Returns ranked shrines → click → detail.

---

## Google Maps embed (detail page only)
Keyless public embed — **no API key, no Cloud project.**
- URL: `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`, built at runtime from the shrine's `coordinates` (lat/lng). Use `name + city` as a query only as a last-resort fallback when coordinates are missing.
- **Lazy-load:** keep the `src` in `data-src` and set it only when the map scrolls into view (`IntersectionObserver`, ~200px margin) or via `next/dynamic` / on-demand mount. Add `loading="lazy"` on the iframe.
- **Unload on close:** when the detail modal/map closes, set the iframe `src` to `about:blank` to free it.
- **Do not** put interactive map iframes on listing cards (performance) — cards get the static pin + city only.
- This endpoint is undocumented; if it ever breaks, the fallback is the keyed Maps Embed API (a ~10-minute setup). Keep the embed-URL builder in one small module so swapping is trivial.

---

## Dummy data for development
So the frontend can be built/verified independently of the legacy migration, **generate ~3 dummy shrines** in the contract shape and load them (via the Handoff A `ingest.py`, or direct SQL) covering: multiple deities incl. one with `regional_lore` and one without (to exercise the lore `COALESCE`), several prayer categories across different groups, 2–3 ranks, at least one multi-day festival with occurrences and one lunar/Nth-weekday festival with empty occurrences (to exercise the calendar fallback), and sources. The owner will replace these with real data.

---

## Acceptance criteria
- [ ] All v1 routes render against the real (or dummy) database.
- [ ] Listing filters work on all five facets; prayer categories show grouped.
- [ ] Cards show highest rank (`MIN(rank_order)`) and a pin+city hint with no iframe.
- [ ] Detail opens as a modal from the list and as a full page on direct navigation; deity lore uses the `shrine_deity_lore` view; sources show as footnotes; map embed lazy-loads and unloads on close.
- [ ] Calendar shows multi-day festivals in every month they span and falls back to `time_prose` for un-uploaded years.
- [ ] Search returns ranked shrines for English, Japanese, and typo'd queries.
- [ ] Builds and deploys to the free host.

---

## Out of scope for v1 (do not build)
Deity pages, all-shrines map, themed trails, EN/JA language toggle, user accounts, booking, real-time data. These are v2.
