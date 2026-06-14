# Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire visual layer of the Next.js app with the `front-end/` SPA designs, wired to the real Neon-backed build-time data, adding a `/deities` route and seasonal ambient audio.

**Architecture:** The app stays fully static (SSG). Server components call `loadStore()` at build time and pass typed view models to `"use client"` components ported from `front-end/`. No API routes, no runtime queries. The `front-end/` components are ported file-by-file; their hardcoded `Shrine`/`Kami`/`Festival` data is swapped for the real view models (`ShrineCard`, `ShrineDetail`, `DeityListItem`, `CalendarFestival`), and their state-machine navigation is swapped for Next.js routing (`<Link>`, `useRouter`, intercepting routes).

**Tech Stack:** Next.js 15 (App Router, SSG), React 19, Tailwind CSS v4, motion (Framer Motion v12 API), GSAP + @gsap/react, lucide-react, Web Audio API, pg (Neon), Vitest, Playwright.

---

## How to use this plan

Most tasks **port an existing `front-end/` component file**. For those tasks:

1. Copy the source file's JSX/styling **verbatim** into the target file.
2. Apply the listed **adaptations** (client directive, data-shape mapping, routing changes).
3. The **data-shape mapping table** is the bug-prone part — apply it field-for-field.

Tasks that create genuinely new/small artifacts (theme CSS, deps, repo functions, types, tests, server wrappers, chrome) contain **full code**.

**Key facts that make incremental phases safe:**
- Unknown Tailwind utility classes do **not** fail `next build` — they emit no CSS. After the Phase 1 theme swap, not-yet-ported pages still build and type-check; they just look unstyled until their phase replaces them.
- `loadStore()` already loads all 14 tables including `deities` and `shrine_deities`. No new DB queries are needed — only new pure view-model functions.
- `npm run build` requires `DATABASE_URL` in `.env.local`. Use `npm run typecheck` for fast green checks that don't hit the DB.

**Verification baseline (run after every phase):**
```bash
npm run typecheck
npm test
```
`npm run build` and `npm run dev` need the DB; run them where a `DATABASE_URL` is available.

---

## Deviations from the approved spec (carried into this plan)

These were discovered while reading the actual source. They are intentional and built into the tasks below:

1. **Global chrome restructure** (not just "Nav polish"): floating header + mobile bottom nav via `usePathname`, no footer, global `BackgroundAmbient`. — Phase 2 & 3.
2. **Audio on the landing page**, not the Nav (matches `front-end/`). — Phase 3.
3. **Calendar gains `getFestivalYear()` + `CalendarFestival`** to carry festival prose. — Phase 6.
4. **`DeityListItem` carries the shrine-affiliation list**, not just a count. — Phase 7.
5. **`ShrineCard` gains `prayer_focus`, `best_time`, `primary_deity_titles`, `image_url`.** — Phase 4 (data) / used in Phase 4–5.
6. **Fonts switch** to Plus Jakarta Sans + Noto Serif JP. — Phase 1.
7. **`ShodoCalligraphy` / `hanzi-writer` dropped** (per spec).

---

## File Structure

**Created:**
- `components/BackgroundAmbient.tsx` — global atmospheric layer (client)
- `components/SiteChrome.tsx` — floating header + mobile bottom nav (client, `usePathname`)
- `components/ShrineImage.tsx` — CSS placeholder image (client)
- `components/LandingPageClient.tsx` — seasonal landing + audio + particles (client)
- `components/DeityListing.tsx` — deity carousel (client)
- `lib/audioSynthesizer.ts` — Web Audio seasonal synth (browser-only module)
- `app/deities/page.tsx` — server component for `/deities`
- `tests/deities.spec.ts` — Playwright smoke (or appended to existing spec)

**Modified:**
- `package.json`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`
- `tailwind.config.ts` → **deleted** (v4 moves theme into CSS)
- `components/ShrineListing.tsx` (visual replacement, keep URL-sync logic)
- `components/ShrineDetailView.tsx` (6-section design, modal+page variants)
- `components/Modal.tsx` (right-slide drawer)
- `components/Calendar.tsx` (annual timeline + day-grid modal)
- `components/Nav.tsx`, `components/Footer.tsx` → **deleted** (replaced by `SiteChrome`)
- `lib/types.ts` (add `DeityListItem`, `DeityShrineLink`, `CalendarFestival`; extend `ShrineCard`)
- `lib/db/repo.ts` (extend `buildCard`; add `getDeityList`, `getFestivalYear`)
- `lib/db/repo.test.ts` (tests for new functions)
- `app/shrines/[slug]/page.tsx`, `app/@modal/(.)shrines/[slug]/page.tsx` (layout wrappers for new detail view)

**Unchanged:** `lib/db/store.ts`, `lib/db/derive.ts`, `lib/calendar.ts`, `lib/search.ts`, `lib/maps.ts`, `app/shrines/page.tsx`, `app/calendar/page.tsx`, `app/search/page.tsx`, `app/@modal/default.tsx`, `components/SearchBox.tsx`, `components/SearchResults.tsx`, `components/Torii.tsx`.

---

# Phase 1 — Foundation (deps, Tailwind v4, theme, fonts)

### Task 1.1: Add dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit `package.json` dependencies**

Replace the `dependencies` and `devDependencies` blocks with:

```json
  "dependencies": {
    "@gsap/react": "2.1.2",
    "fuse.js": "7.0.0",
    "gsap": "3.13.0",
    "lucide-react": "0.546.0",
    "motion": "12.23.24",
    "next": "15.1.6",
    "pg": "8.13.3",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "1.49.1",
    "@tailwindcss/postcss": "4.0.0",
    "@types/node": "22.10.5",
    "@types/pg": "^8.20.0",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "dotenv": "16.4.7",
    "tailwindcss": "4.0.0",
    "typescript": "5.7.3",
    "vitest": "2.1.8"
  }
```

Note: `autoprefixer` and `postcss` are removed — Tailwind v4's PostCSS plugin bundles them.

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes without peer-dependency errors. `node_modules/motion`, `node_modules/gsap`, `node_modules/@tailwindcss/postcss` exist.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add motion/gsap/lucide, upgrade to tailwind v4"
```

---

### Task 1.2: Switch PostCSS to Tailwind v4 plugin

**Files:**
- Modify: `postcss.config.mjs`

- [ ] **Step 1: Replace file contents**

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- [ ] **Step 2: Commit**

```bash
git add postcss.config.mjs
git commit -m "build: use @tailwindcss/postcss plugin"
```

---

### Task 1.3: Port the `front-end/` theme into `app/globals.css`

This replaces the old washi/sumi/vermilion theme with the `front-end/` sand/stone/torii/moss/bamboo palette, custom utilities, and fonts. Source: `front-end/src/index.css`.

**Files:**
- Modify: `app/globals.css` (full replacement)

- [ ] **Step 1: Replace `app/globals.css` entirely with:**

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Serif+JP:wght@200;300;400;500;600;700;900&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-serif: "Cormorant Garamond", "Noto Serif JP", serif;

  /* Traditional Japanese Sanctuary Color Palette */
  --color-torii: #c94b32;
  --color-torii-dark: #af3a23;
  --color-moss: #223f2d;
  --color-moss-light: #48624f;
  --color-bamboo: #5e7f5a;
  --color-bamboo-light: #ecefe9;
  --color-sand: #f5f2eb;
  --color-stone: #1a201c;
  --color-washi: #fbf9f4;
}

.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.washi-paper {
  position: relative;
}
.washi-paper::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.055;
  pointer-events: none;
  z-index: 10;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='fibersH'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02 0.3' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.8 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23fibersH)'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='fibersV'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.3 0.02' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.8 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23fibersV)'/%3E%3C/svg%3E");
  background-size: 200px 200px, 400px 400px, 400px 400px;
  mix-blend-mode: multiply;
}

.wabi-sabi-card {
  background-color: var(--color-washi);
  border: 1px solid rgba(72, 98, 79, 0.15);
  box-shadow: 0 1px 3px rgba(26, 32, 28, 0.02), 0 4px 12px rgba(26, 32, 28, 0.03);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.wabi-sabi-card::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px dashed rgba(72, 98, 79, 0.08);
  pointer-events: none;
  border-radius: inherit;
}

.hanko-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2.2px solid var(--color-torii);
  color: var(--color-torii);
  font-family: 'Noto Serif JP', serif;
  font-weight: 900;
  text-transform: uppercase;
  background-color: transparent;
  line-height: 1;
  box-shadow: inset 0 0 1px rgba(201, 75, 50, 0.2);
  transform: rotate(-1.5deg);
  user-select: none;
}

.sumi-shadow {
  box-shadow: 0 10px 40px -15px rgba(26, 32, 28, 0.1);
}

body {
  background-color: var(--color-sand);
  color: var(--color-stone);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(140, 122, 107, 0.2); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(140, 122, 107, 0.4); }
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: port front-end theme (sand/stone/torii palette, washi utilities)"
```

---

### Task 1.4: Delete `tailwind.config.ts` and clean up `layout.tsx` fonts

**Files:**
- Delete: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Delete the Tailwind config**

Run: `git rm tailwind.config.ts`
(Tailwind v4 reads theme from `@theme` in CSS and auto-detects content; no config file needed.)

- [ ] **Step 2: Rewrite `app/layout.tsx`** (removes `next/font` + Shippori link; fonts now come from the CSS `@import`. Chrome + BackgroundAmbient are added in Phase 2 — for now keep a minimal shell that compiles.)

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jinja Meguri — 神社巡り",
  description:
    "A field guide to the shrines of Japan — their kami, lore, and festivals, surfaced in English with the original Japanese preserved.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build is green**

Run: `npm run typecheck`
Expected: PASS (no type errors). The old `Nav`/`Footer`/pages still import fine; they reference deleted theme classes but that only affects visuals, not compilation.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: drop tailwind config and next/font; fonts via CSS import"
```

---

# Phase 2 — Ambient background, ShrineImage, site chrome

### Task 2.1: Port `BackgroundAmbient`

**Files:**
- Create: `components/BackgroundAmbient.tsx`
- Source: `front-end/src/components/BackgroundAmbient.tsx`

- [ ] **Step 1: Copy the source file verbatim into `components/BackgroundAmbient.tsx`, then apply these adaptations:**
  - Add `"use client";` as the first line.
  - Keep the `mode: "landing" | "listing" | "calendar"` prop and all JSX exactly.
  - No data changes. The component is self-contained (uses `motion/react`, `useEffect`, `useState`).

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/BackgroundAmbient.tsx
git commit -m "feat: port BackgroundAmbient atmospheric layer"
```

---

### Task 2.2: Port `ShrineImage`

**Files:**
- Create: `components/ShrineImage.tsx`
- Source: `front-end/src/components/ShrineImage.tsx`

- [ ] **Step 1: Copy the source verbatim, then adapt:**
  - Add `"use client";` as the first line (it imports `motion/react`).
  - Keep props `{ src?, alt, className?, shrineId?, prefecture? }` unchanged.
  - **Important:** consumers will pass `shrineId={slug}` (the real shrine slug) so the `PLACEHOLDER_MAP` keys (`ise-jingu`, `fushimi-inari`, …) keep matching. No code change needed inside.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ShrineImage.tsx
git commit -m "feat: port ShrineImage CSS placeholder component"
```

---

### Task 2.3: Create `SiteChrome` (floating header + mobile bottom nav)

Replaces the global `Nav`/`Footer`. Mirrors the header + bottom nav from `front-end/src/App.tsx` (lines ~40–273), but uses `usePathname` + `<Link>` instead of the `activePage` state machine. Hidden on `/` (home renders full-bleed).

**Files:**
- Create: `components/SiteChrome.tsx`

- [ ] **Step 1: Write `components/SiteChrome.tsx`:**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Calendar as CalendarIcon, Home, Sparkles } from "lucide-react";

const NAV = [
  { href: "/shrines", label: "Sanctuaries", match: ["/shrines"] },
  { href: "/deities", label: "Pantheon", match: ["/deities"] },
  { href: "/calendar", label: "Festivals", match: ["/calendar"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname === "/") return null; // home is full-bleed, no chrome

  return (
    <>
      {/* Desktop floating header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-[calc(100%-2.5rem)] max-w-7xl mx-5 mt-5 px-8 py-4.5 hidden md:flex items-center justify-between z-30 shrink-0 border border-moss/15 bg-washi/75 shadow-sm rounded-2xl backdrop-blur-md sticky top-5"
      >
        <Link href="/" className="flex items-center gap-3 cursor-pointer select-none group">
          <div className="w-7 h-7 hanko-seal text-[15px] p-0.5 rounded-xs flex items-center justify-center font-black transition-transform duration-300 group-hover:rotate-6">
            神
          </div>
          <div>
            <span className="font-serif text-sm tracking-[0.25em] text-stone group-hover:text-torii transition-colors font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              神社巡り
            </span>
            <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase block font-semibold">
              Jinja Meguri
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-8 select-none">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-widest uppercase py-1 transition-all duration-200 font-bold ${
                isActive(pathname, item.match)
                  ? "text-torii border-b-2 border-torii"
                  : "text-moss-light hover:text-torii"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-[10px] font-mono tracking-widest uppercase text-moss-light/90 hidden lg:block select-none font-bold">
          Quiet Dawn Rituals
        </div>
      </motion.header>

      {/* Mobile top banner */}
      <div className="md:hidden w-full flex items-center justify-center gap-2 py-4 bg-washi/85 backdrop-blur-sm border-b border-moss/10 z-20 shrink-0">
        <div className="w-5.5 h-5.5 hanko-seal text-[11px] p-0 flex items-center justify-center font-bold">神</div>
        <Link href="/" className="font-serif text-sm tracking-[0.25em] text-stone pl-[0.25em] cursor-pointer font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
          神社巡り
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 h-16 bg-washi/95 border-t border-moss/15 flex items-center justify-around px-6 z-40 md:hidden backdrop-blur-lg select-none"
        >
          <Link href="/" className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
            <Home size={18} className={pathname === "/" ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${pathname === "/" ? "text-torii" : "text-moss-light"}`}>Home</span>
          </Link>
          <Link href="/shrines" className="flex flex-col items-center justify-center gap-1.5 w-20 h-12">
            <Compass size={18} className={isActive(pathname, ["/shrines"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/shrines"]) ? "text-torii" : "text-moss-light"}`}>Sanctuaries</span>
          </Link>
          <Link href="/deities" className="flex flex-col items-center justify-center gap-1.5 w-18 h-12">
            <Sparkles size={18} className={isActive(pathname, ["/deities"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/deities"]) ? "text-torii" : "text-moss-light"}`}>Pantheon</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
            <CalendarIcon size={18} className={isActive(pathname, ["/calendar"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/calendar"]) ? "text-torii" : "text-moss-light"}`}>Festivals</span>
          </Link>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/SiteChrome.tsx
git commit -m "feat: add SiteChrome floating header + mobile bottom nav"
```

---

### Task 2.4: Wire global chrome + ambient into `layout.tsx`; delete `Nav`/`Footer`

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/AmbientByRoute.tsx`
- Delete: `components/Nav.tsx`, `components/Footer.tsx`

- [ ] **Step 1: Create `components/AmbientByRoute.tsx`** (picks the ambient `mode` from the route):

```tsx
"use client";

import { usePathname } from "next/navigation";
import BackgroundAmbient from "@/components/BackgroundAmbient";

export default function AmbientByRoute() {
  const pathname = usePathname();
  if (pathname === "/") return null; // landing renders its own atmosphere
  const mode = pathname.startsWith("/calendar") ? "calendar" : "listing";
  return <BackgroundAmbient mode={mode} />;
}
```

- [ ] **Step 2: Rewrite `app/layout.tsx`:**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import AmbientByRoute from "@/components/AmbientByRoute";

export const metadata: Metadata = {
  title: "Jinja Meguri — 神社巡り",
  description:
    "A field guide to the shrines of Japan — their kami, lore, and festivals, surfaced in English with the original Japanese preserved.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-sand text-stone overflow-x-hidden">
        <AmbientByRoute />
        <div className="relative z-10 flex min-h-screen flex-col items-center">
          <SiteChrome />
          <div className="w-full flex-1">{children}</div>
        </div>
        {modal}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Delete the old chrome**

Run: `git rm components/Nav.tsx components/Footer.tsx`

Note: `components/SearchBox.tsx` is imported only by the old `Nav`. It is no longer rendered but may still be imported by `app/search/page.tsx` indirectly — confirm with: `git grep -n "components/Nav\|components/Footer"`. Expected: no remaining references. `SearchBox`/`SearchResults` stay in the repo (search route unchanged).

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: PASS. If it complains about a missing `Nav`/`Footer` import, fix the referencing file (should only have been `layout.tsx`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: global SiteChrome + ambient in layout; remove Nav/Footer"
```

---

# Phase 3 — Landing page + ambient audio

### Task 3.1: Port the audio synthesizer

**Files:**
- Create: `lib/audioSynthesizer.ts`
- Source: `front-end/src/utils/audioSynthesizer.ts`

- [ ] **Step 1: Copy the source verbatim into `lib/audioSynthesizer.ts`.**
  - No `"use client"` needed (plain TS module, no JSX).
  - It already guards on `window`/`AudioContext` and lazy-inits inside `toggle()`, so importing it in a client component is SSR-safe (nothing runs at import time except `new ShintoSeasonSynthesizer()`, whose constructor is empty).
  - Keep the `export const shintoSynth = new ShintoSeasonSynthesizer();` singleton.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS. (The `any` types for timers compile under the project's `strict` config because they are explicitly annotated `any`.)

- [ ] **Step 3: Commit**

```bash
git add lib/audioSynthesizer.ts
git commit -m "feat: port Web Audio seasonal synthesizer"
```

---

### Task 3.2: Port the landing page

**Files:**
- Create: `components/LandingPageClient.tsx`
- Modify: `app/page.tsx`
- Source: `front-end/src/components/LandingPage.tsx`

- [ ] **Step 1: Create `components/LandingPageClient.tsx`** by copying the source `LandingPage.tsx` verbatim, then adapt:
  - Add `"use client";` as the first line.
  - Change the import `import { shintoSynth } from "../utils/audioSynthesizer";` → `import { shintoSynth } from "@/lib/audioSynthesizer";`.
  - Replace the props interface and signature:
    - Remove `interface LandingPageProps { onExplore; onCalendar; }`.
    - Change `export default function LandingPage({ onExplore, onCalendar }: LandingPageProps)` → `export default function LandingPageClient()`.
  - Replace the two Ema `<motion.button>` elements (Explore / Calendar) with `motion(Link)` navigations:
    - Add `import Link from "next/link";` and `import { motion } from "motion/react";` is already present.
    - Define `const MotionLink = motion.create(Link);` near the top of the component module (above the component) — `motion.create` wraps a custom component for animation in motion v12.
    - The Explore button (`onClick={onExplore}`, the `talisman-btn-1`) becomes `<MotionLink href="/shrines" ...>` keeping all `className`/`animate`/`transition`/`whileHover`/`whileTap` props and inner JSX unchanged.
    - The Calendar button (`onClick={onCalendar}`, the `talisman-btn-2`) becomes `<MotionLink href="/calendar" ...>` likewise.
  - Everything else (GSAP timeline, canvas particle engine, season selector, audio toggle, season styles) stays **verbatim**.

- [ ] **Step 2: Replace `app/page.tsx`:**

```tsx
import LandingPageClient from "@/components/LandingPageClient";

export default function Home() {
  return <LandingPageClient />;
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS. If `motion.create(Link)` types complain, the fallback is `const MotionLink = motion(Link as any);` — but prefer `motion.create`.

- [ ] **Step 4: Manual smoke (where DB available)**

Run: `npm run dev`, open `/`.
Expected: seasonal landing renders; clicking a season changes palette + particles; the audio button toggles sound after a click (browser autoplay requires the click — this is correct); the two ema plaques navigate to `/shrines` and `/calendar`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/LandingPageClient.tsx
git commit -m "feat: seasonal landing page with audio + particle engine"
```

---

# Phase 4 — Shrine data extensions + listing

### Task 4.1: Extend `ShrineCard` and `buildCard`

The listing table/cards display prayer-focus prose, best-time, primary-deity titles, and an image — none currently on `ShrineCard`. Add them (additive; search keeps working).

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/db/repo.ts`
- Test: `lib/db/repo.test.ts`

- [ ] **Step 1: Write the failing test** — append to `lib/db/repo.test.ts`. The file already has `import { makeStore } from "@/lib/db/__fixtures__/store";`, `import { ... } from "@/lib/db/repo";`, `import { describe, it, expect } from "vitest";`, and `const store = makeStore();` at the top — reuse them (do NOT re-import). Add `getShrineCards` to the existing repo import if not already present (it is):

```ts
describe("getShrineCards extended fields", () => {
  it("includes prayer_focus, best_time, primary_deity_titles, image_url", () => {
    const card = getShrineCards(store)[0];
    expect(card).toHaveProperty("prayer_focus");
    expect(card).toHaveProperty("best_time");
    expect(Array.isArray(card.primary_deity_titles)).toBe(true);
    expect(card).toHaveProperty("image_url");
  });
});
```

> Note: the fixture may not have a `shrine_details` row for the test shrines, so `prayer_focus`/`best_time` may be `null` — that's fine; the test only asserts the properties exist. If you want a non-null assertion, add a `shrine_details` row to the fixture first.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: FAIL — properties missing on the card.

- [ ] **Step 3: Extend the `ShrineCard` interface** in `lib/types.ts` — add these fields inside `ShrineCard` (after `deity_ja`):

```ts
  prayer_focus: string | null;
  best_time: string | null;
  primary_deity_titles: string[];
  image_url: string | null;
```

- [ ] **Step 4: Populate them in `buildCard`** in `lib/db/repo.ts`. Replace the `buildCard` `return` object's tail so the function reads:

```ts
function buildCard(store: Store, shrineId: string): ShrineCard {
  const s = store.shrines.find((x) => x.id === shrineId)!;
  const region = store.regions.find((r) => r.id === s.region_id);
  const pref = store.prefectures.find((p) => p.id === s.prefecture_id);
  const ranks = shrineRankViews(store, shrineId);
  const categories = shrineCategoryViews(store, shrineId);
  const deities = shrineDeityViews(store, shrineId);
  const primary = deities.find((d) => d.is_primary) ?? null;
  const detailRow = store.shrine_details.find((d) => d.shrine_id === shrineId) ?? null;
  return {
    slug: s.slug,
    name_en: s.name_en,
    name_ja: s.name_ja,
    city: s.city,
    prefecture: pref?.name_en ?? "",
    region: region?.name_en ?? "",
    primary_deity: primary ? { name_en: primary.name_en, name_ja: primary.name_ja } : null,
    categories,
    highest_rank: ranks.find((r) => r.is_highest) ?? null,
    region_id: s.region_id,
    prefecture_id: s.prefecture_id,
    rank_codes: ranks.map((r) => r.name_en),
    category_codes: categories.map((c) => c.name_en),
    deity_ja: deities.map((d) => d.name_ja).filter((k): k is string => !!k),
    prayer_focus: detailRow?.prayer_focus ?? null,
    best_time: detailRow?.best_time ?? null,
    primary_deity_titles: primary?.titles ?? [],
    image_url: s.image_urls?.[0] ?? null,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/db/repo.ts lib/db/repo.test.ts
git commit -m "feat: extend ShrineCard with prayer_focus/best_time/titles/image"
```

---

### Task 4.2: Port the shrine listing

**Files:**
- Modify: `components/ShrineListing.tsx` (full replacement)
- Source: `front-end/src/components/ShrineListingPage.tsx`

The current `ShrineListing` receives `cards: ShrineCard[]` and `facets: FacetCatalogs` and syncs filters to the URL. Keep that contract and the URL-sync behavior; replace the visuals with the source design.

- [ ] **Step 1: Replace `components/ShrineListing.tsx`** by copying the source `ShrineListingPage.tsx` JSX, then apply ALL of these adaptations:

  **Header / imports:**
  - Add `"use client";` first line.
  - Remove imports of `Shrine`, `Filters` from `../types` and the `SHRINES_DATABASE`/`REGIONS_LIST`/… imports from `../data/shrines`.
  - Import `import { useRouter, useSearchParams } from "next/navigation";`, `import Link from "next/link";`, and `import type { ShrineCard, FacetCatalogs } from "@/lib/types";`.
  - Import `ShrineImage` from `@/components/ShrineImage`.
  - Component signature: `export default function ShrineListing({ cards, facets }: { cards: ShrineCard[]; facets: FacetCatalogs })`.

  **Data source:** replace `SHRINES_DATABASE` with `cards`. Replace the filter option lists:
  - `REGIONS_LIST` → `facets.regions.map((r) => r.name_en)`.
  - `PREFECTURES_LIST` → `Object.values(facets.prefecturesByRegion).flat().map((p) => p.name_en)`.
  - (The mobile drawer's region/prefecture lists use the same.)

  **Filter state → URL sync (keep existing behavior):** instead of local `useState<Filters>`, derive filters from `useSearchParams` and update via `router.replace`. Use this filter model and helpers at the top of the component:

  ```ts
  const router = useRouter();
  const params = useSearchParams();
  const getList = (key: string) => params.getAll(key);
  const filters = {
    searchQuery: params.get("q") ?? "",
    prayerFocus: getList("cat"),   // category name_en values
    ranks: getList("rank"),
    region: getList("region"),
    prefecture: getList("pref"),
    deity: getList("deity"),
  };
  function setParam(key: string, values: string[]) {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    values.forEach((v) => next.append(key, v));
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }
  function setSearch(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q); else next.delete("q");
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }
  ```
  - `handleToggleFilter(category, value)` → compute the new array and call `setParam(mapKey(category), newArray)` where `mapKey` maps `prayerFocus→"cat"`, `ranks→"rank"`, `region→"region"`, `prefecture→"pref"`, `deity→"deity"`.
  - `handleClearAllFilters` → `router.replace("/shrines", { scroll: false })`.
  - Remove the `triggerFakeLoad`/`loading` simulation and the localStorage view-mode persistence **OR** keep `viewMode` in local `useState` (it's pure UI). **Keep `viewMode` as local state**, but initialize to `"card"` and (optionally) hydrate from localStorage inside a `useEffect` (NOT in the `useState` initializer — that throws during SSR). Drop the `loading` skeleton state and its branch, or keep `loading` as always-false local state. Simplest: delete `loading` and its skeleton block, render results directly.
  - Remove `applyPresetQuery` (the preset buttons aren't rendered in the source's returned JSX — confirm and drop the unused function).

  **Per-shrine field mapping** (apply in both table rows and cards, and the mobile drawer):

  | Source (`shrine.*`) | Replace with (`card.*`) |
  |---|---|
  | `shrine.id` (key) | `card.slug` |
  | `shrine.name` | `card.name_en` |
  | `shrine.japaneseName` | `card.name_ja ?? ""` |
  | `shrine.location` | `card.city ?? ""` |
  | `shrine.prefecture` | `card.prefecture` |
  | `shrine.region` | `card.region` |
  | `shrine.primaryDeity.name` | `card.primary_deity?.name_en ?? ""` |
  | `shrine.primaryDeity.japaneseName` | `card.primary_deity?.name_ja ?? ""` |
  | `shrine.primaryDeity.titles` | `card.primary_deity_titles` |
  | `shrine.prayerFocus` (string[]) | `card.category_codes` |
  | `shrine.prayerFocusText` | `card.prayer_focus ?? ""` |
  | `shrine.bestTime` | `card.best_time ?? ""` |
  | `shrine.ranks` (string[]) | `card.rank_codes` |
  | `shrine.image` | `card.image_url ?? undefined` |
  | `<ShrineImage ... shrineId={shrine.id} prefecture={shrine.prefecture} />` | `shrineId={card.slug}` `prefecture={card.prefecture}` |

  **Navigation:** the source calls `onSelectShrine(shrine)` on row/card click. Replace each clickable row/card with a Next `<Link href={\`/shrines/${card.slug}\`}>` wrapper (soft-navigation triggers the intercepting modal route). For `motion.tr`/`motion.div`, wrap the element content in `<Link>` or make the row a `<Link>`; simplest is to keep the `motion.div` card and add `onClick={() => router.push(\`/shrines/${card.slug}\`)}`. For the table row, use `onClick={() => router.push(\`/shrines/${card.slug}\`)}`.

  **Client-side filtering & sorting:** keep the source's `filteredShrines` filter/sort logic but operate on `cards` with the mapped field names. The rank-priority `rankOrder` map in the source can stay (it keys on rank name strings, which now come from `card.rank_codes`). Search matching uses `card.name_en`, `card.name_ja`, `card.city`, `card.prefecture`, `card.primary_deity?.name_en/name_ja`, `card.rank_codes`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual smoke (where DB available)**

Run: `npm run dev`, open `/shrines`.
Expected: card/table toggle works; filters update the URL (`?region=…&cat=…`) and the list; clicking a shrine opens the detail (modal via interception).

- [ ] **Step 4: Commit**

```bash
git add components/ShrineListing.tsx
git commit -m "feat: port shrine listing (card/table) with URL-synced filters"
```

---

# Phase 5 — Shrine detail (page + modal drawer)

### Task 5.1: Port the detail view (6-section page + summarized modal)

The current `ShrineDetailView` takes `{ shrine: ShrineDetail; variant: "modal" | "page" }`. Keep that contract. Use the source `ShrineDetailPage.tsx` for `variant === "page"` and `ShrineDetailModal.tsx` for `variant === "modal"`.

**Files:**
- Modify: `components/ShrineDetailView.tsx` (full replacement)
- Sources: `front-end/src/components/ShrineDetailPage.tsx`, `front-end/src/components/ShrineDetailModal.tsx`

**Shared data-shape mapping** (`ShrineDetail` → the source's `Shrine`). Build a local adapter at the top of the file so both variants consume one shape:

```ts
function primaryOf(shrine: ShrineDetail) {
  return shrine.deities.find((d) => d.is_primary) ?? shrine.deities[0] ?? null;
}
function companionsOf(shrine: ShrineDetail) {
  return shrine.deities.filter((d) => !d.is_primary);
}
```

| Source (`shrine.*`) | Replace with |
|---|---|
| `shrine.name` | `shrine.name_en` |
| `shrine.japaneseName` | `shrine.name_ja ?? ""` |
| `shrine.location` | `shrine.city ?? ""` |
| `shrine.prefecture` / `shrine.region` | same names exist |
| `shrine.id` (stamp key, ShrineImage) | `shrine.slug` |
| `shrine.image` | `shrine.image_urls?.[0] ?? undefined` |
| `shrine.ranks` (string[]) | `shrine.ranks.map((r) => r.name_en)` |
| `shrine.prayerFocus` (string[]) | `shrine.categories.map((c) => c.name_en)` |
| `shrine.prayerFocusText` | `shrine.details?.prayer_focus ?? ""` |
| `shrine.description` | `shrine.details?.description ?? ""` |
| `shrine.about` | `shrine.details?.history ?? ""` |
| `shrine.bestTime` | `shrine.details?.best_time ?? ""` |
| `shrine.primaryDeity.name` | `primary?.name_en ?? ""` |
| `shrine.primaryDeity.japaneseName` | `primary?.name_ja ?? ""` |
| `shrine.primaryDeity.titles` | `primary?.titles ?? []` |
| `shrine.primaryDeity.canonicalLore` | `primary?.canonical_lore ?? ""` |
| `shrine.primaryDeity.regionalLore` | `primary?.regional_lore ?? ""` |
| `shrine.secondaryDeities` | `companions` (each: `name→name_en`, `japaneseName→name_ja`, `titles→titles`, `regionalLore→regional_lore`) |
| `shrine.festivals[].name` | `f.name_en` |
| `shrine.festivals[].time` | `f.time_prose ?? ""` |
| `shrine.festivals[].meaning` | `f.meaning ?? ""` |
| `shrine.festivals[].ritual` | `f.ritual ?? ""` |
| `shrine.festivals[].prayer` | `f.prayer ?? ""` |
| `shrine.festivals[].type.category` | `f.festival_type` (compare `=== "pilgrimage_experience"`; treat anything containing `"pilgrim"` as pilgrimage, else public) |
| `shrine.festivals[].type.notes` | `f.visitor_notes ?? ""` |
| `shrine.sources` (string[]) | `shrine.sources.map((s) => s.title ?? s.url)` |

- [ ] **Step 1: Write `components/ShrineDetailView.tsx`** with this structure:

```tsx
"use client";

import type { ShrineDetail } from "@/lib/types";
// ...copy all lucide-react + motion imports used by BOTH source files...
import ShrineImage from "@/components/ShrineImage";

// helpers primaryOf / companionsOf here

export default function ShrineDetailView({
  shrine,
  variant,
}: {
  shrine: ShrineDetail;
  variant: "modal" | "page";
}) {
  if (variant === "modal") return <ModalBody shrine={shrine} />;
  return <PageBody shrine={shrine} />;
}
```

  - **`PageBody`**: copy the body of source `ShrineDetailPage.tsx` (the returned JSX + its `useState`/`useRef`/scroll-spy/goshuin logic), applying the mapping table. Remove the `onBack` prop usage — replace the "Return to Sanctuary List" button with `<Link href="/shrines">`. **SSR-safe localStorage:** the goshuin `useEffect` already reads `localStorage` inside `useEffect` (fine); keep it. Keep `containerRef` scroll behaviour. Drop the outer `h-[calc(100vh-80px)] overflow-y-auto` wrapper if it fights the page layout — keep as-is first; adjust only if scrolling breaks.
  - **`ModalBody`**: copy the body of source `ShrineDetailModal.tsx` applying the mapping table. Remove `onClose`/`onViewFullDetails` props and the outer `AnimatePresence`/backdrop/`motion.div` drawer shell — that shell now lives in `components/Modal.tsx` (Task 5.2). Keep only the **inner content** (header bar, scroll content, sections, bottom action bar). Replace:
    - the close button → handled by `Modal` (Task 5.2); keep a close affordance that calls a passed `onClose`, OR render the header's close inside `Modal`. Simplest: `ModalBody` renders only the scrollable content + sections; the "Back"/"Explore Chronicles" footer becomes a single `<Link href={\`/shrines/${shrine.slug}\`}>` ("Explore Sanctuary Chronicles") that deep-links to the full page.
    - the map embed: keep the `iframe` `mapEmbedUrl` built from `shrine.name_en + " " + (shrine.city ?? "")`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ShrineDetailView.tsx
git commit -m "feat: port shrine detail (6-section page + summarized modal body)"
```

---

### Task 5.2: Port the right-slide drawer into `Modal`

**Files:**
- Modify: `components/Modal.tsx`
- Source: drawer shell from `front-end/src/components/ShrineDetailModal.tsx` (backdrop + `motion.div` panel)

- [ ] **Step 1: Replace `components/Modal.tsx`:**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-stone/70 backdrop-blur-xs cursor-pointer z-40"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 230 }}
          className="relative w-full md:w-[50vw] h-full bg-sand md:border-l border-moss/10 shadow-2xl flex flex-col z-50 overflow-hidden washi-paper sumi-shadow"
        >
          <div className="shrink-0 px-6 py-4 border-b border-moss/10 flex items-center justify-between bg-sand select-none">
            <div className="font-serif text-xs font-bold uppercase tracking-widest text-moss/50">
              Sanctuary Profile Chronicles
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-full hover:bg-torii hover:text-white border border-moss/10 text-stone transition-all duration-300 cursor-pointer hover:-rotate-90"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

  - Note: the `ModalBody` from Task 5.1 should therefore NOT re-render the top header bar (it's here). Adjust `ModalBody` to start at the cover image. If easier, leave `ModalBody`'s own header out per the Task 5.1 note.

- [ ] **Step 2: Confirm the intercept + page wrappers still pass the right props.** They already call `<ShrineDetailView shrine={detail} variant="modal" | "page" />` — unchanged. Open both:
  - `app/@modal/(.)shrines/[slug]/page.tsx` (wraps in `<Modal>`).
  - `app/shrines/[slug]/page.tsx` (full page). Its current wrapper is `<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">`. The new `PageBody` manages its own full-width layout — **replace that wrapper** with a plain `<main>`:

  ```tsx
  // app/shrines/[slug]/page.tsx — replace the return:
  return <ShrineDetailView shrine={detail} variant="page" />;
  ```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual smoke (where DB available)**

Run: `npm run dev`.
- From `/shrines`, click a shrine → right-slide drawer opens; backdrop/X closes it (router.back).
- Visit `/shrines/<slug>` directly → full 6-section page; "Explore Chronicles"/back link goes to `/shrines`.
- Goshuin stamp affix/reset persists across reload (localStorage keyed by slug).

- [ ] **Step 5: Commit**

```bash
git add components/Modal.tsx "app/shrines/[slug]/page.tsx"
git commit -m "feat: right-slide drawer modal; full-bleed detail page wrapper"
```

---

# Phase 6 — Festival calendar

### Task 6.1: Add `CalendarFestival` + `getFestivalYear`

The ported calendar needs festival prose + resolved year dates. Add a richer view model and function (the existing `entriesForMonth`/`CalendarEntry` stays for any other consumer; the new calendar uses the richer one).

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/db/repo.ts`
- Test: `lib/db/repo.test.ts`

- [ ] **Step 1: Write the failing test** — append to `lib/db/repo.test.ts`. Add `getFestivalYear` to the existing `@/lib/db/repo` import line, and reuse the top-level `store`:

```ts
describe("getFestivalYear", () => {
  it("returns festivals with prose and a resolved month", () => {
    const list = getFestivalYear(store, 2026);
    expect(Array.isArray(list)).toBe(true);
    const f = list[0];
    expect(f).toHaveProperty("festival_name_en");
    expect(f).toHaveProperty("meaning");
    expect(f).toHaveProperty("shrine_slug");
    expect(f).toHaveProperty("festival_type");
    // month is null (fallback) or 1..12
    expect(f.month === null || (f.month >= 1 && f.month <= 12)).toBe(true);
  });
});
```

> Requires the fixture to contain at least one `festivals` row. If `makeStore()` has none, add a minimal `festivals` row (and optionally a `festival_occurrences` row for 2026) to `lib/db/__fixtures__/store.ts` first, then write this test.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: FAIL — `getFestivalYear` not exported.

- [ ] **Step 3: Add the type** to `lib/types.ts`:

```ts
export interface CalendarFestival {
  festival_id: string;
  shrine_slug: string;
  shrine_name_en: string;
  shrine_city: string | null;
  shrine_prefecture: string;
  shrine_region: string;
  region_id: number;
  festival_name_en: string;
  festival_name_ja: string | null;
  festival_type: string | null;
  time_prose: string | null;
  start_date: string | null;
  end_date: string | null;
  month: number | null; // 1..12 from start_date; null when undated
  meaning: string | null;
  ritual: string | null;
  prayer: string | null;
  visitor_notes: string | null;
  origin: string | null;
  is_fallback: boolean;
}
```

- [ ] **Step 4: Add the function** to `lib/db/repo.ts`:

```ts
import type { CalendarFestival } from "@/lib/types";

export function getFestivalYear(store: Store, year: number): CalendarFestival[] {
  const occByFestival = new Map(
    store.festival_occurrences.filter((o) => o.year === year).map((o) => [o.festival_id, o]),
  );
  return store.festivals.map((f) => {
    const s = store.shrines.find((x) => x.id === f.shrine_id)!;
    const region = store.regions.find((r) => r.id === s.region_id);
    const pref = store.prefectures.find((p) => p.id === s.prefecture_id);
    const occ = occByFestival.get(f.id);
    const startDate = occ?.start_date ?? f.start_date ?? null;
    const endDate = (occ ? occ.end_date : f.end_date) ?? null;
    const month = startDate ? Number(startDate.slice(5, 7)) : null;
    return {
      festival_id: f.id,
      shrine_slug: s.slug,
      shrine_name_en: s.name_en,
      shrine_city: s.city,
      shrine_prefecture: pref?.name_en ?? "",
      shrine_region: region?.name_en ?? "",
      region_id: s.region_id,
      festival_name_en: f.name_en,
      festival_name_ja: f.name_ja,
      festival_type: f.festival_type,
      time_prose: f.time_prose,
      start_date: startDate,
      end_date: endDate,
      month,
      meaning: f.meaning,
      ritual: f.ritual,
      prayer: f.prayer,
      visitor_notes: f.visitor_notes,
      origin: f.origin,
      is_fallback: startDate === null,
    };
  });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/db/repo.ts lib/db/repo.test.ts
git commit -m "feat: add getFestivalYear/CalendarFestival for the calendar"
```

---

### Task 6.2: Wire the calendar page to the new data

**Files:**
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Replace `app/calendar/page.tsx`:**

```tsx
import { loadStore } from "@/lib/db/store";
import { getFestivalYear } from "@/lib/db/repo";
import Calendar from "@/components/Calendar";

const YEAR = 2026; // occurrences are seeded for 2026

export default async function CalendarPage() {
  const store = await loadStore();
  return <Calendar year={YEAR} festivals={getFestivalYear(store, YEAR)} />;
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: FAIL — `Calendar` props don't match yet (fixed in Task 6.3). This is expected; proceed.

---

### Task 6.3: Port the calendar component

**Files:**
- Modify: `components/Calendar.tsx` (full replacement)
- Source: `front-end/src/components/FestivalCalendarPage.tsx`

- [ ] **Step 1: Replace `components/Calendar.tsx`** by copying the source JSX, then adapt:

  **Header / signature:**
  - Add `"use client";` first line.
  - Remove `Shrine`/`Festival` and `SHRINES_DATABASE` imports.
  - Import `import type { CalendarFestival } from "@/lib/types";` and `import { useRouter } from "next/navigation";`.
  - Keep `POETIC_MONTHS`, `SEASONS`, `getContextualIcon` **verbatim**.
  - Signature: `export default function Calendar({ year, festivals }: { year: number; festivals: CalendarFestival[] })`.
  - Replace `const [calendarYear, setCalendarYear] = useState(2026)` → `useState(year)`.

  **Data:** replace the `getLinkedFestivals()` helper (which flattened `SHRINES_DATABASE`) so it returns `festivals` mapped to the local shape the JSX expects. Provide an adapter so minimal JSX changes are needed:

  ```ts
  type LinkedFestival = {
    id: string;
    name: string;            // "<en> (<ja>)" or just en
    time: string;
    meaning: string;
    ritual: string;
    prayer: string;
    type: { category: "public_witness" | "pilgrimage_experience"; notes: string };
    month: number | null;
    start_date: string | null;
    end_date: string | null;
    shrine: { id: string; name: string; location: string; prefecture: string; region: string; slug: string };
  };

  const linked: LinkedFestival[] = festivals.map((f) => ({
    id: f.festival_id,
    name: f.festival_name_ja ? `${f.festival_name_en} (${f.festival_name_ja})` : f.festival_name_en,
    time: f.time_prose ?? "",
    meaning: f.meaning ?? "",
    ritual: f.ritual ?? "",
    prayer: f.prayer ?? "",
    type: {
      category: (f.festival_type ?? "").toLowerCase().includes("pilgrim")
        ? "pilgrimage_experience"
        : "public_witness",
      notes: f.visitor_notes ?? "",
    },
    month: f.month,
    start_date: f.start_date,
    end_date: f.end_date,
    shrine: {
      id: f.shrine_slug,
      name: f.shrine_name_en,
      location: f.shrine_city ?? "",
      prefecture: f.shrine_prefecture,
      region: f.shrine_region,
      slug: f.shrine_slug,
    },
  }));
  ```
  - Replace every `getLinkedFestivals()` call with `linked`.

  **Month bucketing:** replace `getFestivalsByMonth` (regex on `f.time`) with grouping by `f.month` (fallback: undated festivals go under a chosen fallback month — match the source's behavior by bucketing `month === null` into month `5`, OR add an "Undated" group; simplest: skip null months from the timeline and show them in the search results only). Use:

  ```ts
  const getFestivalsByMonth = (list: LinkedFestival[]): Record<number, LinkedFestival[]> => {
    const grouped: Record<number, LinkedFestival[]> = {};
    list.forEach((f) => {
      const m = f.month ?? 0; // 0 bucket = undated
      (grouped[m] ??= []).push(f);
    });
    return grouped;
  };
  ```
  - `activeMonths` = sorted keys filtered to `>= 1` for the 12-month timeline (drop the `0`/undated bucket from the timeline rail, or render it last with a "Date TBC" label). Keep it simple: `Object.keys(...).map(Number).filter((m) => m >= 1).sort()`.

  **Day-grid modal `isFestivalOnDay`:** replace the entire regex-based `isFestivalOnDay` with a real-date check using `start_date`/`end_date`:

  ```ts
  const isFestivalOnDay = (fest: LinkedFestival, y: number, m: number, day: number): boolean => {
    if (!fest.start_date) return false;
    const target = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const end = fest.end_date ?? fest.start_date;
    return fest.start_date <= target && target <= end;
  };
  ```

  **Navigation:** replace `onSelectShrine(fest.shrine)` calls with `router.push(\`/shrines/${fest.shrine.slug}\`)`. Add `const router = useRouter();`. Keep the inline accordion expansion (`expandedFestivals`) for the festival prose.

  **Date constants:** the source hardcodes `isToday`/`selectedDay` to June 8 2026. Keep them (the dataset is the 2026 seed); these are cosmetic.

  **Portal:** the calendar modal uses `createPortal(..., document.body)`. Guard for SSR — render the portal only after mount:

  ```ts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // ...
  {mounted && createPortal(<AnimatePresence>...</AnimatePresence>, document.body)}
  ```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS (Task 6.2 page now matches).

- [ ] **Step 3: Manual smoke (where DB available)**

Run: `npm run dev`, open `/calendar`.
Expected: month timeline groups real festivals; category filter + search work; the Lunar Month Calendar modal opens, shows festivals on real dates, and clicking an agenda item navigates to the shrine.

- [ ] **Step 4: Commit**

```bash
git add components/Calendar.tsx app/calendar/page.tsx
git commit -m "feat: port festival calendar timeline + day-grid modal on real dates"
```

---

# Phase 7 — Deity listing (new route)

### Task 7.1: Add `DeityListItem`/`DeityShrineLink` + `getDeityList`

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/db/repo.ts`
- Test: `lib/db/repo.test.ts`

- [ ] **Step 1: Write the failing test** — append to `lib/db/repo.test.ts`. Add `getDeityList` to the existing `@/lib/db/repo` import line, and reuse the top-level `store`:

```ts
describe("getDeityList", () => {
  it("returns deities with their enshrining shrines", () => {
    const list = getDeityList(store);
    expect(list.length).toBeGreaterThan(0);
    const d = list[0];
    expect(d).toHaveProperty("name_en");
    expect(Array.isArray(d.titles)).toBe(true);
    expect(Array.isArray(d.shrines)).toBe(true);
    // every deity returned is enshrined somewhere
    expect(d.shrines.length).toBeGreaterThan(0);
    expect(d.shrines[0]).toHaveProperty("slug");
    expect(d.shrines[0]).toHaveProperty("is_primary");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: FAIL — `getDeityList` not exported.

- [ ] **Step 3: Add types** to `lib/types.ts`:

```ts
export interface DeityShrineLink {
  slug: string;
  name_en: string;
  name_ja: string | null;
  city: string | null;
  prefecture: string;
  region: string;
  is_primary: boolean;
  regional_lore: string | null;
}
export interface DeityListItem {
  id: string;
  name_en: string;
  name_ja: string | null;
  titles: string[];
  deity_type: string;
  canonical_lore: string | null;
  shrines: DeityShrineLink[];
}
```

- [ ] **Step 4: Add the function** to `lib/db/repo.ts`:

```ts
import type { DeityListItem, DeityShrineLink } from "@/lib/types";

export function getDeityList(store: Store): DeityListItem[] {
  const shrineById = index(store.shrines);
  const items: DeityListItem[] = store.deities.map((d) => {
    const links: DeityShrineLink[] = store.shrine_deities
      .filter((sd) => sd.deity_id === d.id)
      .map((sd) => {
        const s = shrineById.get(sd.shrine_id)!;
        const region = store.regions.find((r) => r.id === s.region_id);
        const pref = store.prefectures.find((p) => p.id === s.prefecture_id);
        return {
          slug: s.slug,
          name_en: s.name_en,
          name_ja: s.name_ja,
          city: s.city,
          prefecture: pref?.name_en ?? "",
          region: region?.name_en ?? "",
          is_primary: sd.is_primary,
          regional_lore: sd.regional_lore,
        };
      })
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    return {
      id: d.id,
      name_en: d.name_en,
      name_ja: d.name_ja,
      titles: d.titles ?? [],
      deity_type: d.deity_type,
      canonical_lore: d.canonical_lore,
      shrines: links,
    };
  });
  // only deities that are enshrined somewhere, Amaterasu/Inari first then alpha
  return items
    .filter((d) => d.shrines.length > 0)
    .sort((a, b) => {
      const rank = (n: string) => (n.includes("Amaterasu") ? 0 : n.includes("Inari") ? 1 : 2);
      const ra = rank(a.name_en), rb = rank(b.name_en);
      return ra !== rb ? ra - rb : a.name_en.localeCompare(b.name_en);
    });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run lib/db/repo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/db/repo.ts lib/db/repo.test.ts
git commit -m "feat: add getDeityList with shrine affiliations"
```

---

### Task 7.2: Create the `/deities` route + carousel component

**Files:**
- Create: `app/deities/page.tsx`
- Create: `components/DeityListing.tsx`
- Source: `front-end/src/components/DeityListingPage.tsx`

- [ ] **Step 1: Create `app/deities/page.tsx`:**

```tsx
import { loadStore } from "@/lib/db/store";
import { getDeityList } from "@/lib/db/repo";
import DeityListing from "@/components/DeityListing";

export default async function DeitiesPage() {
  const store = await loadStore();
  return <DeityListing deities={getDeityList(store)} />;
}
```

- [ ] **Step 2: Create `components/DeityListing.tsx`** by copying source `DeityListingPage.tsx`, then adapt:

  **Header / signature:**
  - Add `"use client";` first line.
  - Remove `SHRINES_DATABASE`, `Kami`, `Shrine` imports.
  - Import `import type { DeityListItem } from "@/lib/types";` and `import { useRouter } from "next/navigation";`.
  - Signature: `export default function DeityListing({ deities }: { deities: DeityListItem[] })`.

  **Data:** delete the entire `deitiesList = useMemo(... SHRINES_DATABASE ...)` derivation. Replace with a memo that maps the prop into the shape the JSX uses (`name`, `japaneseName`, `titles`, `canonicalLore`, `shrines[]`):

  ```ts
  const deitiesList = useMemo(
    () =>
      deities.map((d) => ({
        name: d.name_en,
        japaneseName: d.name_ja ?? "",
        titles: d.titles,
        canonicalLore: d.canonical_lore ?? "",
        shrines: d.shrines.map((s) => ({
          shrine: {
            id: s.slug,
            name: s.name_en,
            location: s.city ?? "",
            prefecture: s.prefecture,
            region: s.region,
            slug: s.slug,
          },
          isPrimary: s.is_primary,
          regionalLore: s.regional_lore ?? "",
        })),
      })),
    [deities],
  );
  ```
  - This preserves the JSX references `activeDeity.name`, `.japaneseName`, `.titles`, `.canonicalLore`, `.shrines[].shrine.{name,location,prefecture,region}`, `.shrines[].isPrimary`, `.shrines[].regionalLore`.

  **Navigation:** `handleOpenShrineDetails(shrine)` and `onSelectShrine`/`onViewShrineDetails` → replace with `const router = useRouter();` and `router.push(\`/shrines/${shrine.slug}\`)`. Remove the `onSelectShrine`/`onViewShrineDetails` props entirely.

  **Keep verbatim:** the carousel slide variants, keyboard nav, search dropdown, dot navigation, and all styling.

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual smoke (where DB available)**

Run: `npm run dev`, open `/deities`.
Expected: deity carousel renders (Amaterasu/Inari first); arrow keys + dots cycle; search filters; "File"/"Reveal" links navigate to a shrine.

- [ ] **Step 5: Commit**

```bash
git add app/deities/page.tsx components/DeityListing.tsx
git commit -m "feat: add /deities carousel route wired to real data"
```

---

# Phase 8 — Final verification + cleanup

### Task 8.1: Playwright smoke for `/deities` and chrome

**Files:**
- Create: `tests/deities.spec.ts` (or append to the existing e2e spec — check `tests/` for the existing file and match its style/imports)

- [ ] **Step 1: Write the smoke test:**

```ts
import { test, expect } from "@playwright/test";

test("deities page renders the pantheon carousel", async ({ page }) => {
  await page.goto("/deities");
  await expect(page.getByText("Deity Chronicles")).toBeVisible();
});

test("primary nav reaches each section", async ({ page }) => {
  await page.goto("/shrines");
  await expect(page.getByText("Sacred Sanctuaries")).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByText("Festival Liturgy")).toBeVisible();
});
```

> Match the existing spec's base-URL/config conventions. If the existing Playwright config builds+serves first, no change needed.

- [ ] **Step 2: Run e2e (where DB available)**

Run: `npm run test:e2e`
Expected: new smokes pass; existing smokes still pass (update any assertions that referenced the old Nav text like "Shrines"/"Calendar" links, which are now "Sanctuaries"/"Festivals").

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: smoke /deities and primary navigation"
```

---

### Task 8.2: Full verification pass

- [ ] **Step 1: Typecheck + unit**

Run: `npm run typecheck && npm test`
Expected: both PASS.

- [ ] **Step 2: Production build (where DB available)**

Run: `npm run build`
Expected: SSG build completes; `/`, `/shrines`, `/shrines/[slug]`, `/deities`, `/calendar`, `/search` all generate.

- [ ] **Step 3: Grep for leftover references to deleted modules/old theme**

Run: `git grep -n "components/Nav\|components/Footer\|font-display\|text-sumi\|bg-vermilion\|SHRINES_DATABASE\|from \"../types\""`
Expected: no results inside `app/`, `components/`, `lib/` (matches only inside `front-end/`, which is untouched). Fix any stragglers.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: remove stragglers from old theme/chrome"
```

---

### Task 8.3 (optional): Remove `front-end/`

After the user confirms the migrated UI matches, the SPA is fully superseded.

- [ ] **Step 1:** Run `git rm -r front-end/`
- [ ] **Step 2:** Run `npm run typecheck && npm test` → PASS.
- [ ] **Step 3:** Commit: `git commit -m "chore: remove superseded front-end/ SPA"`

> Do NOT do this until the user has visually verified the migration.

---

## Self-Review

**Spec coverage:**
- Tailwind v3→v4 + theme + fonts → Phase 1 ✓
- BackgroundAmbient + audio → Phase 2/3 ✓
- Landing page → Phase 3 ✓
- Shrine listing → Phase 4 ✓
- Shrine detail (page + modal drawer) → Phase 5 ✓
- Festival calendar → Phase 6 ✓
- `/deities` route + data → Phase 7 ✓
- Nav redesign / chrome → Phase 2 ✓
- Tests (unit for new repo fns + e2e smoke) → Phases 4/6/7/8 ✓
- ShodoCalligraphy excluded ✓

**Type consistency:** `ShrineCard` extended once (Task 4.1) and consumed in 4.2/5.1; `DeityListItem`/`DeityShrineLink` defined 7.1, consumed 7.2; `CalendarFestival` defined 6.1, consumed 6.2/6.3. Repo function names used consistently: `getShrineCards`, `getShrineDetail`, `getFacetCatalogs` (unchanged), `getDeityList`, `getFestivalYear` (new).

**Known risks to watch during execution:**
- `motion.create(Link)` typing — fallback noted in Task 3.2.
- SSR-unsafe `localStorage`/`createPortal`/`window` — guards called out in Tasks 4.2, 5.1, 6.3.
- Existing e2e assertions referencing old Nav labels — update in Task 8.1.
- Tailwind v4 may flag any genuinely-removed utilities differently; unknown classes are silently dropped (no build break).
