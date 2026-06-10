# Frontend Migration Design — `front-end/` → Next.js App

**Date:** 2026-06-10  
**Branch:** `feat/migrate-front-end-v2`  
**Scope:** Full UI overhaul — replace all visual layers in `app/` with designs from `front-end/`, add missing `/deities` route, upgrade Tailwind v3→v4, add motion/GSAP animations, port ambient background and audio synthesizer.

---

## 1. Architecture

The Next.js app remains **fully static (SSG)**. No API routes are added. No runtime DB queries. All data continues to flow through `loadStore()` at build time, cached module-level per build process.

The only structural additions are:
- New `/deities` server route backed by a new `getDeityList()` in `lib/db/repo.ts`
- `lib/audioSynthesizer.ts` ported from `front-end/src/utils/audioSynthesizer.ts` (pure Web Audio API, client-only)
- New `components/AudioToggle.tsx` client component, rendered in Nav

Every page in `app/` has its visual layer replaced; the server component / data wiring pattern is unchanged. Animated and interactive components are `"use client"` and receive pre-built data as props from server pages — the same pattern as the existing `ShrineListing` and `Calendar` components today.

---

## 2. Dependencies

### Add to root `package.json`

| Package | Purpose |
|---|---|
| `motion` (^12) | Page/component animations (Framer Motion v12 API) |
| `gsap` (^3) | Scroll and timeline animations |
| `@gsap/react` (^2) | GSAP React hooks |
| `lucide-react` | Icon library used throughout `front-end/` |

### Tailwind v3 → v4 upgrade

| Change | Detail |
|---|---|
| Replace `tailwindcss@3` | Install `tailwindcss@4` + `@tailwindcss/postcss` |
| Update `postcss.config.mjs` | Replace `tailwindcss` plugin with `@tailwindcss/postcss` |
| Update `globals.css` | Replace three `@tailwind` directives with `@import "tailwindcss"` |
| Migrate custom theme | Move washi/sumi/vermilion/gold colors and font families from `tailwind.config.ts` into a `@theme {}` block in `globals.css` |
| Audit utility classes | Check for v3→v4 renames (opacity utilities, shadow changes); fix any broken classes |
| Verify build | `npm run typecheck && npm run build` must pass before Phase 2 begins |

`ShodoCalligraphy` and `hanzi-writer` are **out of scope**.

---

## 3. Migration Phases

### Phase 1 — Foundation
**Goal:** Dependency and Tailwind upgrade. Verify existing styles are intact before touching any page.

- Upgrade Tailwind v3 → v4 as described above
- Add `motion`, `gsap`, `@gsap/react`, `lucide-react` to `package.json`
- Run `npm run typecheck && npm run build` — must pass clean

### Phase 2 — Ambient components
**Goal:** Port shared atmospheric components so they're available for all pages.

- `components/BackgroundAmbient.tsx` — port from `front-end/src/components/BackgroundAmbient.tsx` (atmospheric gradients, sun motif, floating particles)
- `lib/audioSynthesizer.ts` — port from `front-end/src/utils/audioSynthesizer.ts` (Web Audio API, seasonal ambient sounds: wind, chimes, cicadas, bells)
- `components/AudioToggle.tsx` — new client component (mute/unmute button, wraps audio context lifecycle)
- Add `AudioToggle` to `components/Nav.tsx`

### Phase 3 — Landing page
**Goal:** Replace `app/page.tsx` with the seasonal landing design.

- Port `LandingPage.tsx` into `app/page.tsx` (server component wrapper) + `components/LandingPageClient.tsx` (client component with animations)
- Seasonal theming: spring/summer/autumn/winter derived from current date (client-side, no SSG impact)
- Interactive ema plaques, particle animations
- `BackgroundAmbient` added here

### Phase 4 — Shrine listing
**Goal:** Replace shrine listing visual layer.

- Port `ShrineListingPage.tsx` design into `components/ShrineListing.tsx`
- Card and table view modes
- Keep existing URL-synced filter logic (`useSearchParams` + `useRouter`)
- Data interface unchanged: `ShrineCard[]` + `FacetCatalogs`

### Phase 5 — Shrine detail
**Goal:** Replace detail view with 6-section immersive design and right-slide drawer modal.

- Port `ShrineDetailPage.tsx` (6 sections: overview, deities, history, festivals, stamps, location) into `components/ShrineDetailView.tsx`
- Port `ShrineDetailModal.tsx` (right-slide drawer) into `app/@modal/(.)shrines/[slug]/page.tsx` and `components/Modal.tsx`
- Keep existing `variant: "modal" | "page"` pattern — server routes unchanged

### Phase 6 — Festival calendar
**Goal:** Replace calendar visual layer.

- Port `FestivalCalendarPage.tsx` into `components/Calendar.tsx`
- Data interface unchanged: `CalendarEntry[]`

### Phase 7 — Deity listing (new route)
**Goal:** Add `/deities` page backed by real DB data.

**New data layer:**
- Add `DeityCard` interface to `lib/types.ts`:
  ```typescript
  export interface DeityCard {
    id: string;
    name_en: string;
    name_ja: string;
    titles: string[];
    deity_type: string;
    canonical_lore: string | null;
    shrine_count: number;
  }
  ```
- Add `getDeityList(store: Store): DeityCard[]` to `lib/db/repo.ts` — joins `deities` + `shrine_deities`, returns all deities sorted by `shrine_count desc`
- Unit test for `getDeityList` in `lib/db/repo.test.ts`

**New route:**
- `app/deities/page.tsx` — server component, calls `loadStore()` then `getDeityList()`
- `components/DeityListing.tsx` — client component, receives `DeityCard[]`, renders carousel-based deity portfolio with search

**Nav:**
- Add `/deities` link to `components/Nav.tsx`

**Playwright:**
- Add smoke test for `/deities` route in `tests/`

### Phase 8 — Nav polish
**Goal:** Update Nav with `front-end/` design, final verification.

- Replace `components/Nav.tsx` visual design with `front-end/` version
- Confirm `AudioToggle` is present
- Confirm `/deities` link is present
- Run `npm run typecheck && npm run build && npm test && npm run test:e2e`

---

## 4. Data Layer Additions

Only Phase 7 touches the data layer. All other phases are visual replacements with unchanged data interfaces.

| Item | Location | Detail |
|---|---|---|
| `DeityCard` interface | `lib/types.ts` | New view model |
| `getDeityList()` | `lib/db/repo.ts` | Join deities + shrine_deities, sort by shrine_count desc |
| `getDeityList` test | `lib/db/repo.test.ts` | Unit test with fixture store |

No schema changes. No new DB tables.

---

## 5. Error Handling

| Concern | Handling |
|---|---|
| Build-time DB failure | `loadStore()` throws → build fails loudly (existing behaviour, unchanged) |
| Web Audio API unavailable | `AudioToggle` catches and renders nothing on unsupported browsers |
| Reduced motion preference | All GSAP/motion animations check `prefers-reduced-motion` and disable |
| Missing deity images | Gradient placeholder fallbacks (same pattern as existing `ImagePlaceholder.tsx`) |

---

## 6. Testing

| Layer | Scope |
|---|---|
| Vitest unit | Add `getDeityList` test in `lib/db/repo.test.ts`; all existing tests must continue to pass |
| Playwright E2E | Add `/deities` smoke test; existing smoke tests must continue to pass |
| Visual regression | Out of scope |
| Manual | Dev server (`npm run dev`) smoke after each phase before committing |

---

## 7. Files Changed / Created

**Modified:**
- `package.json`
- `postcss.config.mjs`
- `app/globals.css`
- `tailwind.config.ts` (may be deleted or emptied — v4 moves config to CSS)
- `app/page.tsx`
- `app/layout.tsx` (add AudioToggle)
- `app/@modal/(.)shrines/[slug]/page.tsx`
- `components/Nav.tsx`
- `components/ShrineListing.tsx`
- `components/ShrineDetailView.tsx`
- `components/Modal.tsx`
- `components/Calendar.tsx`
- `lib/types.ts`
- `lib/db/repo.ts`
- `lib/db/repo.test.ts`

**Created:**
- `components/BackgroundAmbient.tsx`
- `components/AudioToggle.tsx`
- `components/LandingPageClient.tsx`
- `components/DeityListing.tsx`
- `lib/audioSynthesizer.ts`
- `app/deities/page.tsx`
- `tests/deities.spec.ts` (or added to existing spec)

**Not changed:**
- `lib/db/store.ts`
- `lib/db/derive.ts`
- `lib/calendar.ts`
- `lib/search.ts`
- `lib/maps.ts`
- `app/shrines/page.tsx`
- `app/shrines/[slug]/page.tsx`
- `app/calendar/page.tsx`
- `app/search/page.tsx`
- All existing Vitest tests except `repo.test.ts` (additive only)
