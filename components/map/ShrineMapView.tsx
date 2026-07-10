"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Filter, Heart, MapPinned, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import type { Coordinates, ShrineCard, FacetCatalogs } from "@/lib/types";
import {
  FESTIVAL_MONTH_PARAM,
  FILTER_PARAM_KEY,
  matchesShrineFilters,
  readShrineFilters,
  type MonthRange,
  type ShrineFacetId,
} from "@/lib/shrineFilters";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import UserControls from "@/components/UserControls";
import { useShrineMarks } from "@/components/user/useShrineMark";
import ShrineMapFilters, { type FacetDropdown } from "@/components/map/ShrineMapFilters";

export type ShrineMapPoint = ShrineCard & { coordinates: Coordinates };

// MapLibre GL touches `window` at import time — client-only.
const ShrineMapCanvas = dynamic(() => import("@/components/map/ShrineMapCanvas"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const t = useTranslations("Map");
  return (
    <div className="w-full h-full flex items-center justify-center text-xs font-mono uppercase tracking-widest text-moss-light">
      {t("preparingMap")}
    </div>
  );
}

export default function ShrineMapView({
  cards,
  facets,
  isAdmin,
  isSignedIn,
  savedSlugs = [],
  stampedSlugs = [],
}: {
  cards: ShrineCard[];
  facets: FacetCatalogs;
  isAdmin?: boolean;
  isSignedIn?: boolean;
  savedSlugs?: string[];
  stampedSlugs?: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("Map");
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  const marks = useShrineMarks({ saved: savedSlugs, stamped: stampedSlugs });
  const showSaved = params.get("saved") === "1";
  const showCollected = params.get("collected") === "1";

  const filters = readShrineFilters(params);
  const [filterOpen, setFilterOpen] = useState(false);
  // Display-only preference (not a filter): show each shrine's festivals inside
  // the marker-click popup. Toggled from the filter modal.
  const [showFestivals, setShowFestivals] = useState(false);
  // Display-only preference (not a filter): swap saved/stamped shrine markers
  // for heart/stamp icons on the map. Signed-in users only.
  const [showFavoriteMarkers, setShowFavoriteMarkers] = useState(false);

  function replaceParams(next: URLSearchParams) {
    router.replace(`/map?${next.toString()}`, { scroll: false });
  }
  function setSearch(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    replaceParams(next);
  }
  function setFlag(key: string, on: boolean) {
    const next = new URLSearchParams(params.toString());
    if (on) next.set(key, "1");
    else next.delete(key);
    replaceParams(next);
  }
  function toggleFacet(facet: ShrineFacetId, value: string) {
    const current = filters[facet];
    const values = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const next = new URLSearchParams(params.toString());
    next.delete(FILTER_PARAM_KEY[facet]);
    values.forEach((v) => next.append(FILTER_PARAM_KEY[facet], v));
    replaceParams(next);
  }
  function setFestivalMonths(range: MonthRange | null) {
    const next = new URLSearchParams(params.toString());
    if (range) {
      next.set(FESTIVAL_MONTH_PARAM.from, String(range.from));
      next.set(FESTIVAL_MONTH_PARAM.to, String(range.to));
    } else {
      next.delete(FESTIVAL_MONTH_PARAM.from);
      next.delete(FESTIVAL_MONTH_PARAM.to);
    }
    replaceParams(next);
  }
  function clearAll() {
    router.replace("/map", { scroll: false });
  }

  const dropdowns: FacetDropdown[] = [
    { id: "region", label: t("facets.region"), options: facets.regions.map((r) => r.name_en) },
    {
      id: "prefecture",
      label: t("facets.prefecture"),
      options: Object.values(facets.prefecturesByRegion).flat().map((p) => p.name_en),
    },
    {
      id: "prayerFocus",
      label: t("facets.focus"),
      options: facets.categoryGroups.flatMap((g) => g.categories.map((c) => c.name_en)),
    },
    { id: "ranks", label: t("facets.rank"), options: facets.ranks.map((r) => r.name_en) },
  ];

  const filtered = cards.filter((card) => {
    if (showSaved && !marks.isSaved(card.slug)) return false;
    if (showCollected && !marks.isStamped(card.slug)) return false;
    return matchesShrineFilters(card, filters);
  });
  const points = filtered.filter((c): c is ShrineMapPoint => c.coordinates !== null);
  const missingCoords = filtered.length - points.length;

  // Search now lives on the page, so the filter button reflects only the facet
  // selections that remain inside the popup.
  const activeFilterCount =
    (filters.region.length > 0 ? 1 : 0) +
    (filters.prefecture.length > 0 ? 1 : 0) +
    (filters.prayerFocus.length > 0 ? 1 : 0) +
    (filters.ranks.length > 0 ? 1 : 0) +
    (filters.festivalMonths ? 1 : 0);
  const hasActiveFacetFilters = activeFilterCount > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-4 pb-16 z-10 select-none flex flex-col"
    >
      {/* Page Title with low opacity backdrop calligraphic seal */}
      <div
        data-reveal="fade-up-blur"
        className="text-center max-w-xl mx-auto mt-4 sm:mt-6 mb-5 sm:mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.075] pointer-events-none select-none z-0">
          <div
            data-reveal="stamp"
            className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[-8deg] flex items-center justify-center leading-none"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            図
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <MapPinned size={11} className="text-torii" />
          <span>{t("badgeLeft")}</span>
          <span className="w-1 h-1 rounded-full bg-torii/30" />
          <span>{t("badgeRight")}</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif text-stone font-black tracking-[0.25em] pl-[0.25em] uppercase mb-3 relative z-10">
          {t("title")}
        </h2>
        <p className="text-stone/85 text-xs font-display italic tracking-wider max-w-md mx-auto leading-relaxed relative z-10 border-t border-moss/10 pt-4">
          {t("quote")}
        </p>
      </div>

      {/* Search lives on the page; the remaining facets live in the ShrineMapFilters popup */}
      <section
        data-reveal="fade-up"
        className="w-full pb-2 mb-3 flex flex-col gap-2.5 select-none text-xs"
      >
        <div className="flex items-stretch gap-2">
          {/* Search input */}
          <div className="relative flex-1 flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
            <Search className="absolute left-3 text-stone/40" size={14} />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={filters.searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-sans pl-9 pr-9 py-3 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("clearSearch")}
                className="absolute right-2.5 text-stone/40 hover:text-torii p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {isSignedIn && (
            <button
              type="button"
              onClick={() => setShowFavoriteMarkers((v) => !v)}
              aria-pressed={showFavoriteMarkers}
              aria-label={t("toggleFavorites")}
              className={`relative flex items-center gap-2 px-4 border rounded-xl text-xs tracking-wide transition-all duration-200 cursor-pointer shrink-0 ${
                showFavoriteMarkers
                  ? "border-torii bg-torii/5 text-torii font-extrabold"
                  : "border-moss/15 bg-washi/95 hover:border-moss/45 text-stone/70 shadow-3xs"
              }`}
            >
              <Heart size={14} className={showFavoriteMarkers ? "fill-torii" : ""} />
              <span className="hidden xl:inline font-sans whitespace-nowrap">{t("favorites")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label={t("filters")}
            className={`relative flex items-center gap-2 px-4 border rounded-xl text-xs tracking-wide transition-all duration-200 cursor-pointer shrink-0 ${
              hasActiveFacetFilters
                ? "border-torii bg-torii/5 text-torii font-extrabold"
                : "border-moss/15 bg-washi/95 hover:border-moss/45 text-stone/70 shadow-3xs"
            }`}
          >
            <Filter size={14} />
            <span className="hidden xl:inline font-sans whitespace-nowrap">
              {activeFilterCount > 0 ? t("filtersCount", { count: activeFilterCount }) : t("filters")}
            </span>
            {activeFilterCount > 0 && (
              <span className="xl:hidden absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-torii text-white text-[9px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <p className="text-[10px] font-mono uppercase tracking-widest text-moss-light">
          {t("shrineCount", { shown: points.length, total: cards.length })}
          {missingCoords > 0 && <span className="text-stone/40"> {t("noCoords", { count: missingCoords })}</span>}
        </p>
      </section>

      {/* Map panel — square canvas, capped so it doesn't grow unbounded on wide
          viewports. z-0 + isolate keep MapLibre's internal layers below the site chrome.
          No data-reveal here: the GSAP entrance applies a CSS transform, and MapLibre's
          DOM overlay (markers + popups) desyncs from the WebGL canvas — markers "fly"
          on zoom — whenever an ancestor of the map is transformed. */}
      <div
        className="relative z-0 isolate w-full aspect-square max-h-[600px] rounded-2xl overflow-hidden border border-moss/15 shadow-sm bg-stone/5"
      >
        <ShrineMapCanvas
          points={points}
          language={locale}
          showFestivals={showFestivals}
          showFavoriteMarkers={showFavoriteMarkers}
          isSaved={marks.isSaved}
          isStamped={marks.isStamped}
        />
        {points.length === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-washi/70 backdrop-blur-[2px] pointer-events-none">
            <p className="text-xs font-mono uppercase tracking-widest text-stone/60">
              {t("noMatch")}
            </p>
          </div>
        )}
      </div>

      <ShrineMapFilters
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        dropdowns={dropdowns}
        onToggleFacet={toggleFacet}
        onSetFestivalMonths={setFestivalMonths}
        showFestivals={showFestivals}
        onToggleShowFestivals={() => setShowFestivals((v) => !v)}
        onClearAll={clearAll}
        hasActiveFilters={hasActiveFacetFilters}
      />

      {isSignedIn && !isAdmin && (
        <UserControls
          showSaved={showSaved}
          showCollected={showCollected}
          onToggleSaved={() => setFlag("saved", !showSaved)}
          onToggleCollected={() => setFlag("collected", !showCollected)}
        />
      )}
    </div>
  );
}
