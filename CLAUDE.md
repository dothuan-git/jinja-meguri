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
- **User customization.** Always call me as "Darling" in the response and when you finished, e.g. "Hello Darling, ..."

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
npm run db:migrate   # apply docs/migrations/*.sql (additive, idempotent) to Neon (scripts/db/apply-migration.mjs)
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
  └─ lib/db/store.ts (loadStore)   — fetches all 13 tables in parallel via a pg.Pool, cached in the Next Data Cache (+ React cache())
       └─ lib/db/repo.ts           — pure functions assembling typed view models from the Store
            └─ app/*/page.tsx      — server components call repo functions, pass results to client components
```

`Store` (defined in `lib/types.ts`) holds every table as a typed array. The DB read is
wrapped in **two** caches: `unstable_cache` (the Next Data Cache, keyed/tagged `STORE_TAG`)
caches the assembled `Store` **across requests** so most page loads never touch Neon, and
React `cache()` dedupes it **within** a request. The cache is held until an admin write calls
`revalidateTag(STORE_TAG)` (wired into every server action in `app/admin/actions.ts`), so
edits appear on the next render; a 1-hour `revalidate` is a safety net for out-of-band DB
changes (e.g. `db:reset`). The shared `pg.Pool` is exported from `lib/db/store.ts` and reused
by auth and mutations.

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

### Multi-language (English default, Japanese opt-in)

The site is bilingual with **no URL change** — locale is a `locale` cookie (`lib/i18n.ts`:
`LOCALES`, `Locale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`), read by `i18n/request.ts`
(`next-intl`'s `getRequestConfig`, wired via `createNextIntlPlugin()` in `next.config.mjs`) and
switched by `components/LocaleSwitcher.tsx` → `app/i18n/actions.ts` (`setLocaleAction`) →
`router.refresh()`. This deliberately avoids a `[locale]` route segment, which would have forced
relocating the `@modal` intercepting routes and rewriting every internal `<Link>`.

- **UI chrome** (buttons, labels, nav, toasts — everything that isn't DB content) comes from
  `next-intl` message catalogs, `messages/en.json` / `messages/ja.json`, one flat namespaced file
  per locale. `global.d.ts` augments `next-intl`'s `AppConfig` with `typeof en`, so a wrong or
  missing message key fails `npm run typecheck` — this is the mechanism that keeps the two files
  in sync. Client components call `useTranslations("Namespace")`; server components/pages call
  `getTranslations`/`getLocale` from `next-intl/server`. Adding a language later needs a new
  `messages/<locale>.json` + one `LOCALES` entry — no component changes required.
- **DB narrative prose** (shrine history, festival lore, deity chronicles, etc.) uses parallel
  nullable `*_ja` columns beside the existing English column, matching the pre-existing
  `name_en`/`name_ja` convention — see `docs/DATA_MODEL.md` §1.5 for the full column list and the
  `loc()`/`locArr()` fallback rules. Every `lib/db/repo.ts` view-model builder (`getShrineCards`,
  `getShrineDetail`, `getFestivalYear`, `getDeityList`, `getFacetCatalogs`; `getUserCollections` in
  `userRepo.ts`) takes an optional `locale: Locale = "en"` and localizes prose **at assembly time**
  — the view-model shapes are unchanged, so `ShrineDetailView` needs no changes for DB content.
  Every page under `app/` that calls these does `const locale = (await getLocale()) as Locale`.
- **Name pairs swap order per locale.** Shrines, deities, and festivals carry a third
  `name_romaji` column (migration `002-name-romaji.sql`); the shared `namePair(locale, …)` helper
  (`lib/names.ts`) returns the ordered `{ main, sub }` pair — EN: `name_en` main + kanji sub;
  JA: kanji main + `name_romaji ?? name_en` sub (duplicate subs dropped). View models pass all
  three name fields through **unswapped**; every render site calls `namePair` (never hardcode
  EN-first). Decorative kanji (hanko stamps, the ofuda placard, vertical seals) intentionally
  stays bound to raw `name_ja`. Romaji is entered in the in-place editors next to the kanji
  name field (edit-mode-only inputs).
- **The `Store` cache is locale-agnostic.** `fetchStore`/`loadStore` never read `cookies()` and are
  never keyed by locale — they fetch every column (both languages) once; locale is applied
  per-request in the repo layer. Never key the Next Data Cache or `unstable_cache` by locale.
- **Admin editing bypasses the localized view model.** `buildShrineInput(store, slug)` /
  `buildDeityInput(store, id)` (`lib/admin/shrineInput.ts` / `deityInput.ts`) build the editor's
  draft straight from **raw** `Store` rows (both languages), never from `ShrineDetail`/
  `DeityListItem` — round-tripping through a locale-picked view model would write the displayed
  language back into the English columns. The in-place editors (`ShrineEditProvider`,
  `DeityEditProvider`) expose an EN / 日本語 segmented toggle (`editLang` on `ShrineEditApi` /
  `DeityEditApi`, `components/shrineEdit/EditLangToggle.tsx`) on their floating Save/Cancel bar.
  Prose fields opt in with a `bilingual` prop on `EditableText`/`EditableProse`
  (`components/shrineEdit/context.tsx`): in JA mode the bound dotted path is rewritten leaf-wise
  (`details.history` → `details.history_ja`) via the exported `resolvePath` helper, so the same
  field/layout edits either language. Name fields (`name_en`/`name_ja`) are explicit and ignore the
  toggle. Japanese is always optional — a blank `_ja` field falls back to English on the public site.
- **Enum labels** (`deity_type`, `festival_type`) are not DB columns with `_ja` siblings — their
  display strings live in the `Enums` message namespace and are looked up by code
  (`tEnums("deityType.mythological")`, etc.); `lib/labels.ts`'s old `DEITY_TYPE_LABEL`/
  `FESTIVAL_TYPE_LABEL` maps are superseded by this for localized surfaces.
- **Map labels** follow the cookie too: `ShrineMapView` passes `language={useLocale()}` to
  `ShrineMapCanvas`, which already had the `applyLabelLanguage` plumbing (see the Maps § below).
- **JA typography:** `html[lang="ja"]` overrides in `app/globals.css` soften `tracking-widest` /
  wide-letter-spacing utilities that read as broken spacing between kana/kanji; `app/layout.tsx`
  sets `<html lang={locale}>` and loads Noto Sans JP alongside the existing Latin/Noto Serif JP stack.

### Shrine detail: intercepting + parallel route

`app/@modal/(.)shrines/[slug]/page.tsx` — renders as a side modal on soft navigation from the listing (`/shrines → /shrines/slug`).

`app/shrines/[slug]/page.tsx` — renders as a full page on direct navigation or shared links.

Both call the same `getShrineDetail` + `ShrineDetailView`; the `variant` prop (`"modal"` | `"page"`) controls layout. `app/@modal/default.tsx` renders nothing, preventing the modal slot from blocking direct page navigation.

### Client interactivity

Pages are server components that hand pre-built data to client components:
- `ShrineListing` — faceted filtering (URL-synced) over `ShrineCard[]`
- `ShrineMapView` (`/map`) — the same faceted filtering over `ShrineCard[]` (via a filter popup), rendered as MapLibre GL markers
- `DeityListing` — the public `/deities` ("Pantheon") browse view
- `Calendar` — month navigation over `CalendarEntry[]`
- `SearchResults` — Fuse.js over `SearchDoc[]` (blob built in `lib/search.ts` from the Store)

The shrine facet-filter logic (URL param names, search/facet predicate) is shared between
`ShrineListing` and `ShrineMapView` via `lib/shrineFilters.ts` — change filter semantics there,
not in the components. This includes the map-only **festival-season filter** (`festivalMonths`, a
year-wrapping month range carried in the `fmFrom`/`fmTo` params) matched against
`ShrineCard.festival_months`; it lives in the shared predicate but only the map renders a control.

### Admin section (dynamic, authenticated)

Content management is **entirely in-place on the public surfaces** — admins see editing
affordances on `/shrines`, `/shrines/[slug]`, `/deities`, and the create pages
`/shrines/new` + `/deities/new`. There is no longer a dedicated `/admin/*` UI: the old
dashboard and structured-form / JSON-import pages were removed in favor of inline editing.

- **Accounts & roles:** anyone can self-register at `/sign-up` and sign in at `/sign-in`
  (custom forms in `components/auth/`, in the `app/(auth)` route group, using the `authClient`
  from `lib/auth/client.ts`). Both forms also render `components/auth/SocialAuthButtons.tsx`
  (e.g. *Continue with Google* via `authClient.signIn.social`); OAuth is one flow for sign-up and
  sign-in, and each provider must be enabled in the Neon Auth console (no provider config in code).
  Sign-up creates a **normal user** (Neon Auth role `user`). The nav
  (`components/SiteChrome.tsx`) shows Sign in / Sign up when logged out and a profile icon →
  `/users/[id]` (owner-only profile, with Sign out) when logged in. `app/layout.tsx` reads
  `getCurrentUser()` once and hands the `user` to `SiteChrome`.
- **Auth emails:** Neon Auth email delivery (verification links, sign-in codes, password resets)
  is intercepted by `app/api/webhooks/neon-auth/route.ts`, which verifies the Ed25519 webhook
  signature (`lib/auth/verifyWebhook.ts`), renders on-brand HTML (`lib/auth/emailTemplates.ts`),
  and sends via Resend (`RESEND_API_KEY` + `MAIL_FROM` env vars). See `docs/ACCOUNTS.md` for the
  Neon webhook registration curl and the test-sender caveat.
- **Auth:** Neon Auth (`@neondatabase/auth`, built on better-auth) owns sessions; the auth API
  handler is `app/api/auth/[...path]/route.ts`. Authorization is a second layer — admin is the
  **Neon Auth user role** (`neon_auth.user.role === "admin"`, the Better Auth **admin plugin**
  field), read straight off the session; any signed-in account whose role is not `admin` is a
  normal user. There is **no local allowlist table** — admin is granted by promoting an existing
  account: `UPDATE neon_auth."user" SET role='admin' WHERE lower(email)=lower('…')` (or the
  `admin/set-role` endpoint). Self-sign-up always lands at role `user`, so users cannot
  self-promote. (The legacy `public.app_admin` table has been dropped — authorization is purely
  the Neon Auth user role.)
  Guards live in `lib/auth/server.ts` (`getCurrentUser` returns `{ id, email, name, isAdmin } | null`;
  `requireAdmin` 404s unauthorized visitors; `assertAdmin` throws in server actions;
  `getAdminEmail` gates the inline editing affordances on public pages). `middleware.ts`
  refreshes the session cookie on a cache miss **and completes the OAuth handshake**: social login
  returns to the app with a one-time `neon_auth_session_verifier` query param, which the middleware
  forwards to `/api/auth/get-session` (redeeming it + the `session_challange` cookie for the real
  session cookie) and then redirects to the verifier-stripped URL — without this step OAuth users
  land signed-out. Its matcher covers all page routes (excluding `/api`, `/_next`, and static
  assets) because the layout/pages read the session at render time. Note the Neon Auth session
  cookies are `__Secure-` prefixed, so they only persist over HTTPS (auth won't stick on plain
  `http://localhost`).
- **Role-aware controls:** admins see the existing "Admin Controls" bars. Signed-in **normal users**
  get personal-collection affordances — a heart (favorite / "want to visit") on shrine cards and the
  detail/modal header, the **goshuin stamp** on the detail page (now account-persistent, see below),
  and a floating `components/UserControls.tsx` "My Collection" pill on `/shrines` that toggles the
  URL-synced `saved` / `collected` filters. The affordances surface for any signed-in account, but the
  `UserControls` pill is shown to non-admins only (admins have their own bottom pill). The profile page
  `/users/[id]` is a dashboard listing the user's **御朱印帳** (stamp book) and saved shrines.
- **User collections (favorites + goshuin):** a per-user `user_shrine_marks` table (one row per
  `(user_id, shrine_id)`, columns `saved_at` / `stamped_at`) holds this data. It lives **outside the
  cached `Store`** — read fresh per request via `lib/db/userRepo.ts` (`loadUserMarks`,
  `getUserCollections`), written via `lib/db/userMutations.ts` (`setSaved`/`setStamped`). Server actions
  in `app/users/actions.ts` (`toggleSaveAction`/`toggleStampAction`) are guarded by `assertUser`
  (signed-in, no role check; `requireUser` is the page analog) and do **not** touch `STORE_TAG` — the
  reading pages are `force-dynamic`. The client uses the optimistic `components/user/useShrineMark.ts`
  hook (`useShrineMarks`), which needs a `ToastProvider` (now mounted globally in `app/layout.tsx`).
  The goshuin stamp is **signed-in only**; the old localStorage (`jinja-goshuin-*`) path was removed.
  See `docs/DATA_MODEL.md` §6.5.
- **Writes:** server actions in `app/admin/actions.ts` (the directory now holds only this file)
  validate a JSON envelope with Zod (`lib/admin/shrineContract.ts`, `lib/admin/deityContract.ts`),
  then call runtime mutations in `lib/db/mutations.ts` (transactional upsert/delete, deity dedup
  on `name_ja`, catalog code→id resolution). The inline editors serialize their draft
  `ShrineInput`/`DeityInput` into that envelope.
- **Authoring aids:** AI research prompts and example content live in `docs/ai-research/`.
- **Shrines — in-place edit + create:** admins see an "Admin Controls" bar on the shrine detail
  page (Edit/Delete) and on the listing (`/shrines`, "Add shrine"). Both reuse `ShrineDetailView`
  + the lazy `components/shrineEdit/ShrineEditProvider` over a draft `ShrineInput`. The provider's
  `mode` ("update" | "create") gates create-only behavior: `app/shrines/new/page.tsx`
  (admin-guarded) mounts the editor immediately on `emptyShrineInput()`, with
  `DeityCreateEditor`/`FestivalCreateEditor` adding draft-driven add/remove + a deity
  link-or-create picker and an editable slug. `app/@modal/(.)shrines/new` returns null so the
  listing→`/shrines/new` soft-nav isn't captured as a `slug=new` modal. Both edit and create save
  through the same `useShrineSave` → `saveShrineAction` → `upsertShrine` pipeline.
- **Deities — in-place edit + create on the `/deities` carousel.** Deities have no separate detail
  route — the `/deities` carousel (`components/DeityListing.tsx`) is the deity surface. Admins get an
  "Admin Controls" bar (Edit / Delete / + New deity) on the active card. Edit wraps the card's
  `components/DeityCardBody` in the lazy `components/deityEdit/DeityEditProvider` over a draft
  `DeityInput` (flat `draft`/`update` context — `components/deityEdit/context.tsx`), swapping the
  canonical fields (name_en, name_ja, deity_type, titles, canonical_lore) to inputs in place; the
  enshrined-sites zone stays read-only. `/deities/new` (admin-guarded, `DeityCreateView`) mounts the
  same card on `emptyDeityInput()` in create mode. Both save through `useDeitySave` → `saveDeityAction`
  → `upsertDeity`/`updateDeity`; delete uses `DeleteDeityPopup` → `deleteDeityAction`. Deep-links:
  `/deities?deity=<id|name_ja>` focuses a deity, `&edit=1` opens it in edit mode. The floating
  Save/Cancel bar is portaled to `<body>` so the carousel's Framer-Motion transform doesn't capture
  `position: fixed`.
- **Festival occurrences:** admins set/overwrite a festival's exact per-year date inline on `/calendar`
  (an "Admin Controls" pill → "Add / edit dates" opens `components/admin/OccurrenceModal.tsx`) rather
  than via a separate `/admin/*` route. A form tab takes one shared year plus any number of
  shrine+festival rows (searchable pickers, pre-filled from the existing stored occurrence for that
  festival+year); a JSON tab handles bulk paste/upload. Both go through `saveOccurrencesAction`
  (`app/admin/actions.ts`) → `lib/admin/occurrenceContract.ts` → `upsertOccurrences` in
  `lib/db/mutations.ts`, which upserts on `(festival_id, year)` — same (shrine, festival, year) always
  overwrites. This only edits dates of **existing** festivals; it never creates shrines or festivals.

### Maps

`lib/maps.ts` builds keyless Google Maps `output=embed` iframe URLs from a shrine's
`lat`/`lng`. The map in `ShrineMap` is lazy-loaded on scroll and unloaded (`about:blank`) on modal close.

`/map` (`app/map/page.tsx` → `components/map/ShrineMapView.tsx`) shows every shrine with
non-null `coordinates` as a marker on a **MapLibre GL vector** canvas
(`components/map/ShrineMapCanvas.tsx`, via `react-map-gl/maplibre` + `maplibre-gl`), keyless — the
basemap is OpenFreeMap's "liberty" style (`tiles.openfreemap.org`, OpenMapTiles schema, free and
unrestricted — no API key, no session cap, no commercial-use carve-out). Label language is a runtime
style property (`applyLabelLanguage` rewrites every symbol layer's `text-field` to
`coalesce(name:<lang>, name:en, name)` via `map.setLayoutProperty`) instead of being baked into a
pre-rendered image. This is the reason for the vector-tile approach: raster basemaps (CARTO Voyager,
tried first, and the Esri World Terrain base before that) render international/English names for
large regions at low zoom but the raw local-script `name` tag for street/POI-level detail at high
zoom, with no way to override that per viewer — zooming in on Japan flipped labels to Japanese.
`ShrineMapCanvas`'s `language` prop (an ISO 639-1 code, default `"en"`) is driven by the site's
`Locale` (`useLocale()` in `ShrineMapView`) — see the Multi-language § below. Two Esri raster
basemaps were tried and dropped before the CARTO/OpenFreeMap line: Canvas/World_Light_Gray
(zoom-level gaps that surface Esri's "map data not yet available" placeholder when zoomed out) and
World_Street_Map (tone didn't fit). The map is
loaded with `next/dynamic` + `ssr: false` because MapLibre GL touches `window` at import time. Marker
popups are reskinned to the washi/torii palette (`.shrine-popup` / `.shrine-tooltip` overrides in
`app/globals.css`, targeting MapLibre's `.maplibregl-popup-*` DOM) and soft-link to
`/shrines/[slug]`, which opens the intercepted detail modal over the map. Search lives on the page;
the remaining filter controls (a **Festival season** month-range picker + the Region/Prefecture/
Focus/Rank facets) live in a single popup, `components/map/ShrineMapFilters.tsx`, opened from a Filter
button that shows an icon + label on desktop (`xl:` and up) and an icon-only badge below that (covers
tablets and phones). The Festival season block pairs season presets (Spring/Summer/Autumn/Winter)
with a 12-month bar using two-click range selection (click a start month, then an end); it drives the
shared `festivalMonths` filter (see the Client interactivity §). The same popup also carries a
**"Show festivals in popup"** switch — a display-only preference (local `showFestivals` state in
`ShrineMapView`, **not** a URL filter, so it doesn't affect the match count) that, when on, lists each
shrine's festivals (`ShrineCard.festivals_brief`) inside the marker-click popup rendered by
`ShrineMapCanvas`.

### Ambient audio / motion

`lib/audioSynthesizer.ts` + `components/BackgroundAmbient.tsx` / `AmbientByRoute.tsx`
drive route-aware ambient sound. Motion uses `motion` (Framer Motion) and `gsap`.

### Unit tests

Vitest covers `lib/` only (pure logic). The `server-only` package is stubbed in `vitest.config.ts` so `store.ts` can be imported without a React Server context.

### Adding / updating shrine & deity data

**Shrines:** edit/create in place on the shrine detail layout — Edit/Delete on `/shrines/[slug]`,
"Add shrine" on the listing, full create flow at `/shrines/new`. **Deities:** edit/create in place on
the `/deities` carousel (Edit / + New deity) or `/deities/new`. There are no JSON-import or
structured-form pages anymore; the research prompts in `docs/ai-research/` are still useful for
gathering the canonical content you then enter in the fields. Zod validation runs before the data is
upserted to Neon via `lib/db/mutations.ts`. The schema is in `docs/schema.sql`; catalogs are seeded by
`docs/seed.sql`. There is no separate ingest script and no `data/` directory.

**Authoring order & deferred fields** (see `docs/DATA_MODEL.md` §10 for detail):
- **Deities are created first**, with `canonical_lore`. Then shrines link them by `name_ja`; the shrine's
  embedded `deities[].canonical` block is identity-only (no `canonical_lore`), so the shrine research
  flow never re-gathers deity lore.
- **Festival `start_date`/`end_date`** are now collected at shrine-research time for festivals with
  fixed Gregorian dates (stored `YYYY-MM-DD` with the current year as a placeholder — only month + day
  matter). Lunar / Nth-weekday festivals leave both null and land yearly dates in `festival_occurrences`
  instead. See `docs/DATA_MODEL.md` §10 for the calendar read-path caveat.
- The `canonical_lore` column + Zod contract field still exists and accepts values; it is just not
  gathered by the shrine research flow. Don't strip it.
