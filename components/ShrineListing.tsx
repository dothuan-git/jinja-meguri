"use client";

import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  LayoutGrid,
  TableProperties,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Compass,
  Filter,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useLocale, useTranslations } from "next-intl";
import type { ShrineCard, FacetCatalogs } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";
import {
  FILTER_PARAM_KEY,
  hasActiveShrineFilters,
  matchesShrineFilters,
  shrineFilterParsers,
  toShrineFilters,
  type ShrineFilters,
} from "@/lib/shrineFilters";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import UserControls from "@/components/UserControls";
import { useShrineMarks } from "@/components/user/useShrineMark";
import ShrineTableRow from "@/components/shrineList/ShrineTableRow";
import ShrineListRow from "@/components/shrineList/ShrineListRow";
import ShrineGridCard from "@/components/shrineList/ShrineGridCard";

// Filter state/logic is shared with the map page — see lib/shrineFilters.ts.
type Filters = ShrineFilters;
const PARAM_KEY = FILTER_PARAM_KEY;

type SortField = "name" | "location" | "rank";
type SortDirection = "asc" | "desc";

// Rank hierarchy for the "rank" sort: Ise > Beppyo > Prefectural > others.
// Module scope so it isn't rebuilt on every pairwise comparison.
const RANK_ORDER: Record<string, number> = {
  "Ise Grand Shrine": 5,
  "Beppyo (Special Rank)": 4,
  "Prefectural (Ken-sha)": 3,
  "National Treasure Sanctuary": 2,
  "Samurai Cultural Asset": 2,
};

const rankPriority = (ranks: string[]) =>
  ranks.reduce((max, r) => (RANK_ORDER[r] > max ? RANK_ORDER[r] : max), 0);

export default function ShrineListing({
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
  const t = useTranslations("ShrineListing");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale() as Locale;
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  // Per-user collection state (optimistic). Seeds the heart toggles and the
  // "Show saved / Show collected" filters below.
  const marks = useShrineMarks({ saved: savedSlugs, stamped: stampedSlugs });

  // All filtering happens in the browser and the page never reads searchParams
  // on the server, so these updates are shallow: nuqs rewrites the address bar
  // without an RSC round trip. `qs.q` updates synchronously — only the URL write
  // is debounced — which is what keeps typing responsive.
  const [qs, setQs] = useQueryStates(shrineFilterParsers);
  const { saved: showSaved, collected: showCollected } = qs;
  const filters: Filters = useMemo(() => toShrineFilters(qs), [qs]);

  const setSearch = useCallback((q: string) => setQs({ q }), [setQs]);
  const setFlag = useCallback(
    (key: "saved" | "collected", on: boolean) => setQs({ [key]: on }),
    [setQs],
  );

  const REGIONS_LIST = useMemo(
    () => facets.regions.map((r) => ({ value: r.name_en, label: namePair(locale, r).main })),
    [facets.regions, locale],
  );
  const PREFECTURES_LIST = useMemo(
    () =>
      Object.values(facets.prefecturesByRegion)
        .flat()
        .map((p) => ({ value: p.name_en, label: namePair(locale, p).main })),
    [facets.prefecturesByRegion, locale],
  );

  // Modals portal to document.body so they escape the page's stacking context
  // and paint above the site chrome. Render only after mount (SSR-safe).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // View toggling; hydrate from localStorage after mount (SSR-safe)
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  useEffect(() => {
    const saved = localStorage.getItem("jinja-view-mode");
    if (saved === "table" || saved === "card") setViewMode(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("jinja-view-mode", viewMode);
  }, [viewMode]);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCard = useCallback((slug: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }, []);

  // scroll:false — the intercepted @modal slot is the last node in <body>, so Next's
  // default "scroll the new segment into view" jumps the listing behind it to the bottom.
  const openShrine = useCallback(
    (slug: string) => router.push(`/shrines/${slug}`, { scroll: false }),
    [router]
  );

  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [sorting, setSorting] = useState<{ field: SortField; direction: SortDirection }>({
    field: "name",
    direction: "asc",
  });

  const handleToggleFilter = (category: Exclude<keyof Filters, "searchQuery" | "festivalMonths">, value: string) => {
    const current = filters[category];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setQs({ [PARAM_KEY[category]]: next });
  };

  const handleClearAllFilters = () => {
    setQs(null); // clears every key nuqs manages here
    setActiveFilterDropdown(null);
  };

  const handleSort = (field: SortField) => {
    setSorting((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // The input reads `qs.q` for instant feedback while the list filters on the
  // deferred value, so a keystroke never blocks on re-rendering the results.
  const deferredQuery = useDeferredValue(qs.q);
  const deferredFilters = useMemo(
    () => ({ ...filters, searchQuery: deferredQuery }),
    [filters, deferredQuery],
  );

  // Filter & Sort Application
  const filteredShrines = useMemo(
    () =>
      cards
        .filter((card) => {
          // Personal collection filters (signed-in only; sets update optimistically).
          if (showSaved && !marks.saved.has(card.slug)) return false;
          if (showCollected && !marks.stamped.has(card.slug)) return false;
          return matchesShrineFilters(card, deferredFilters);
        })
        .sort((a, b) => {
          let comparison = 0;
          if (sorting.field === "name") {
            comparison = a.name_en.localeCompare(b.name_en);
          } else if (sorting.field === "location") {
            comparison = (a.city ?? "").localeCompare(b.city ?? "");
          } else if (sorting.field === "rank") {
            // Higher ranks first when sorting by rank.
            comparison = rankPriority(b.rank_codes) - rankPriority(a.rank_codes);
          }
          return sorting.direction === "asc" ? comparison : -comparison;
        }),
    [cards, deferredFilters, sorting, showSaved, showCollected, marks.saved, marks.stamped],
  );

  // Calculate active filter count
  const hasActiveFilters = hasActiveShrineFilters(filters) || showSaved || showCollected;

  // Shared props for the memoized row components. `saved` is resolved per row,
  // so toggling one heart re-renders only that row rather than the whole list.
  const rowProps = (card: ShrineCard, idx: number) => ({
    card,
    locale,
    idx,
    isSignedIn: Boolean(isSignedIn),
    saved: marks.saved.has(card.slug),
    pending: marks.pending,
    onOpen: openShrine,
    onToggleSave: marks.toggleSave,
  });

  const renderListRows = () => (
    <div className="flex flex-col gap-3">
      {filteredShrines.map((card, idx) => (
        <ShrineListRow
          key={card.slug}
          {...rowProps(card, idx)}
          isExpanded={expandedCards.has(card.slug)}
          onToggleExpand={toggleCard}
        />
      ))}
    </div>
  );

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
      {filteredShrines.map((card, idx) => (
        <ShrineGridCard
          key={card.slug}
          {...rowProps(card, idx)}
          isExpanded={expandedCards.has(card.slug)}
          onToggleExpand={toggleCard}
        />
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh-140px)] w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-4 pb-16 z-10 select-none flex flex-col">

      {/* Page Title with low opacity backdrop calligraphic seal */}
      <div data-reveal="fade-up-blur" className="text-center max-w-xl mx-auto mt-4 sm:mt-6 mb-5 sm:mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none">
        {/* Calligraphic/Hanko Seal watermark behind the page title */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.075] pointer-events-none select-none z-0">
          <div data-reveal="stamp" className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[-8deg] flex items-center justify-center leading-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            社
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <Compass size={11} className="text-torii" />
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

      {/* ==================== TYPOGRAPHY-FOCUSED INLINE FILTER PANEL ==================== */}
      <section data-reveal="fade-up" className="w-full pb-2 mb-2 flex flex-col gap-4 select-none text-xs">

        {/* Search + filters — single row on desktop, search + icon on mobile */}
        <div className="flex items-stretch gap-2">
          {/* Search input */}
          <div className="relative flex-1 flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
            <Search className="absolute left-3 text-stone/40" size={14} />
            <input
              type="search"
              aria-label={t("searchPlaceholder")}
              placeholder={t("searchPlaceholder")}
              value={qs.q}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-sans pl-9 pr-12 py-3 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
            />
            {qs.q && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 text-stone/40 hover:text-torii p-1.5 rounded-full transition-colors"
                title={t("clearSearch")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Desktop: Region/Prefecture dropdowns */}
          {[
            { id: "region" as const, label: t("region"), list: REGIONS_LIST },
            { id: "prefecture" as const, label: t("prefecture"), list: PREFECTURES_LIST },
          ].map(dropdown => {
            const activeOptionsCount = filters[dropdown.id].length;
            const isOpen = activeFilterDropdown === dropdown.id;
            return (
              <div key={dropdown.id} className="relative select-none hidden md:block">
                <button
                  onClick={() => setActiveFilterDropdown(isOpen ? null : dropdown.id)}
                  className={`h-full px-4 border rounded-xl text-xs tracking-wide flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                    activeOptionsCount > 0
                      ? "border-torii bg-torii/5 text-torii font-extrabold"
                      : "border-moss/15 bg-washi/95 hover:border-moss/45 text-stone/70 shadow-3xs"
                  }`}
                >
                  <span className="font-sans whitespace-nowrap">
                    {activeOptionsCount > 0
                      ? t("withCount", { label: dropdown.label, count: activeOptionsCount })
                      : dropdown.label
                    }
                  </span>
                  {isOpen ? <ChevronUp size={11} className="text-moss-light" /> : <ChevronDown size={11} className="text-moss-light" />}
                </button>

                {/* Droplist flyout */}
                <AnimatePresence>
                  {isOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 mt-2 w-56 bg-sand border border-moss/15 rounded-xl shadow-xl p-3.5 z-50 max-h-[280px] overflow-y-auto"
                      >
                        <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black pb-2 border-b border-moss/10 mb-2">
                          {t("selectLabel", { label: dropdown.label })}
                        </span>
                        <div className="space-y-0.5">
                          {dropdown.list.map((option) => {
                            const checked = filters[dropdown.id].includes(option.value);
                            return (
                              <label key={option.value} className="flex items-center gap-2.5 text-xs text-stone cursor-pointer py-1.5 px-1 rounded-lg hover:bg-bamboo-light select-none">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleFilter(dropdown.id, option.value)}
                                  className="rounded border-moss/30 text-torii focus:ring-0 w-3.5 h-3.5 accent-torii"
                                />
                                <span className={`transition-colors truncate font-sans font-medium ${checked ? 'text-torii font-bold' : 'text-stone/72'}`}>
                                  {option.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Desktop: clear filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="hidden md:flex items-center text-[10px] uppercase font-mono tracking-widest text-[#9d4432] hover:text-torii font-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t("clearShort")}
            </button>
          )}

          {/* Mobile: filter icon button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden relative shrink-0 flex items-center justify-center w-11 rounded-xl border border-moss/15 bg-washi/95 text-stone/70 hover:border-moss/45 transition-all cursor-pointer"
          >
            <Filter size={16} className={hasActiveFilters ? "text-torii" : ""} />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-torii" />
            )}
          </button>
        </div>

        {/* Mobile: clear filters link */}
        {hasActiveFilters && (
          <div className="md:hidden flex justify-end">
            <button
              onClick={handleClearAllFilters}
              className="text-[10px] uppercase font-mono tracking-widest text-[#9d4432] hover:text-torii font-black transition-colors cursor-pointer"
            >
              {t("clearFilters")}
            </button>
          </div>
        )}

      </section>

      {/* ==================== CORE LISTING CONTAINER ==================== */}
      <main data-reveal="rise" className="flex-1 flex flex-col min-w-0">

        {/* Upper Action Bar (Sorting control, layout picker, counter) */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-moss/15 shrink-0">

          <div className="flex items-center gap-2 select-none">
            <span className="hidden sm:inline text-stone font-serif font-black tracking-widest text-base">
              {t("sanctuaries")}
            </span>
            <span className="text-moss font-sans tracking-wide text-[10px] bg-bamboo-light/50 border border-moss/10 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {t("listed", { count: filteredShrines.length })}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 select-none">
            {/* Quick Sort dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-moss-light text-[10px] tracking-wider uppercase font-sans hidden sm:inline">{t("sortBy")}</span>
              <select
                value={sorting.field}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="text-xs bg-transparent text-stone py-1 border-none focus:outline-none focus:ring-0 font-sans pr-4 cursor-pointer font-bold"
              >
                <option value="name">{t("sortName")}</option>
                <option value="location">{t("sortLocation")}</option>
                <option value="rank">{t("sortRank")}</option>
              </select>
            </div>

            {/* View Buttons switcher */}
            <div className="flex items-center border border-moss/15 rounded-xl p-0.5 select-none bg-sand/40">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 transition-all rounded-lg cursor-pointer ${viewMode === "table" ? "bg-stone text-sand shadow-xs" : "text-moss-light hover:text-stone"}`}
                title={t("tableView")}
              >
                <TableProperties size={13} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 transition-all rounded-lg cursor-pointer ${viewMode === "card" ? "bg-stone text-sand shadow-xs" : "text-moss-light hover:text-stone"}`}
                title={t("cardView")}
              >
                <LayoutGrid size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ==================== SCREEN STATE: EMPTY RESULTS ==================== */}
        {filteredShrines.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white/60 rounded-2xl border border-slate-100 shadow-xs my-6 py-16">
            <Compass size={40} className="text-slate-300 stroke-[1.2] mb-4 animate-pulse" />
            <h3 className="text-lg font-display text-slate-900 font-medium tracking-wide mb-1" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              {t("emptyTitle")}
            </h3>
            <p className="text-slate-400 text-xs tracking-wide max-w-sm mb-6 leading-relaxed">
              {t("emptyBody")}
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleClearAllFilters}
                className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-xs tracking-[0.16em] uppercase rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                {t("resetAll")}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* ==================== SCREEN STATE: MAIN DATA RENDERS ====================
                No `mode="popLayout"`: its layout projection measures every row on
                each add/remove, which is the dominant cost when refiltering.
                `initial={false}` keeps rows from replaying their entrance on every
                filter change. */}
            <AnimatePresence initial={false}>
            {viewMode === "table" ? (
              <>
                {/* Table View (hidden on mobile/tablet below md, shown on md+) */}
                <div className="hidden md:block overflow-x-auto w-full wabi-sabi-card bg-washi/85 rounded-2xl select-text">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-moss/10 bg-[#5c685f]/5 text-[10px] uppercase font-sans tracking-widest text-[#5c685f] font-bold select-none">
                        <th className="py-4 px-6 font-bold w-[20%]">
                          <span className="flex items-center gap-1 cursor-pointer hover:text-torii" onClick={() => handleSort("name")}>
                            {t("thShrine")}
                            <ArrowUpDown size={10} />
                          </span>
                        </th>
                        <th className="py-4 px-4 font-bold w-[20%]">{t("thDeity")}</th>
                        <th className="py-4 px-4 font-bold w-[30%]">{t("thPrayer")}</th>
                        <th className="py-4 px-4 font-bold w-[30%]">{t("thBestTime")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-moss/10">
                      {filteredShrines.map((card, idx) => (
                        <ShrineTableRow key={card.slug} {...rowProps(card, idx)} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile/Tablet Fallback: compact list rows (shown on mobile, hidden on md+) */}
                <div className="block md:hidden">
                  {renderListRows()}
                </div>
              </>
            ) : (
              /* Card Grid View (shown everywhere) */
              renderCardGrid()
            )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ==================== MOBILE FILTER POPUP (centered, themed) ==================== */}
      {mounted && createPortal(
        <AnimatePresence>
        {mobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md md:hidden"
            onClick={() => setMobileFilterOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="w-full max-w-sm rounded-xl border border-torii/20 bg-sand/97 backdrop-blur-md shadow-lg washi-paper sumi-shadow p-5 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase font-black text-torii">
                  <Filter size={12} />
                  {t("filtersTitle")}
                </span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full border border-moss/10 text-stone/50 hover:bg-torii hover:text-white hover:-rotate-90 transition-all duration-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Region */}
              <div className="space-y-2">
                <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black border-b border-moss/10 pb-1.5">
                  {t("region")}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {REGIONS_LIST.map((reg) => {
                    const checked = filters.region.includes(reg.value);
                    return (
                      <button
                        key={reg.value}
                        onClick={() => handleToggleFilter("region", reg.value)}
                        className={`px-3 py-2 text-center rounded-lg text-xs border transition-all cursor-pointer font-mono tracking-wide ${
                          checked
                            ? "border-torii bg-torii/10 text-torii font-bold"
                            : "border-moss/15 bg-washi/95 text-stone/70 hover:border-moss/45"
                        }`}
                      >
                        {reg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prefecture */}
              <div className="space-y-2">
                <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black border-b border-moss/10 pb-1.5">
                  {t("prefecture")}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PREFECTURES_LIST.map((pref) => {
                    const checked = filters.prefecture.includes(pref.value);
                    return (
                      <button
                        key={pref.value}
                        onClick={() => handleToggleFilter("prefecture", pref.value)}
                        className={`px-3 py-2 text-center rounded-lg text-xs border transition-all cursor-pointer font-mono tracking-wide ${
                          checked
                            ? "border-torii bg-torii/10 text-torii font-bold"
                            : "border-moss/15 bg-washi/95 text-stone/70 hover:border-moss/45"
                        }`}
                      >
                        {pref.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-3 border-t border-moss/10">
                <button
                  onClick={() => { handleClearAllFilters(); setMobileFilterOpen(false); }}
                  className="flex-1 py-2.5 text-center text-[10px] tracking-widest uppercase font-mono font-bold border border-moss/20 text-moss bg-washi/80 rounded-lg hover:bg-washi transition-colors cursor-pointer"
                >
                  {t("reset")}
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-2.5 text-center text-[10px] tracking-widest uppercase font-mono font-bold bg-torii text-washi rounded-lg hover:bg-torii-dark transition-colors cursor-pointer shadow-sm"
                >
                  {t("done")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}

      {/* User Controls — personal collection filters for signed-in non-admin users */}
      {isSignedIn && !isAdmin && (
        <UserControls
          showSaved={showSaved}
          showCollected={showCollected}
          onToggleSaved={() => setFlag("saved", !showSaved)}
          onToggleCollected={() => setFlag("collected", !showCollected)}
        />
      )}

      {/* Admin Controls — floating pill */}
      {isAdmin && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 md:pb-5 pointer-events-none">
          {/* Mobile: single pill that expands/contracts via layout animation */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="md:hidden pointer-events-auto inline-flex rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md shadow-lg overflow-hidden"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {adminExpanded ? (
                <motion.div
                  key="admin-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-3 px-4 py-2.5 whitespace-nowrap"
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
                    {tAdmin("adminControls")}
                  </span>
                  <span className="text-stone/25 font-mono select-none text-xs">|</span>
                  <a
                    href="/shrines/new"
                    className="group flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-moss hover:bg-moss/10"
                  >
                    <Plus size={12} className="transition-transform group-hover:rotate-90" />
                    <span>{tAdmin("addShrine")}</span>
                  </a>
                  <button
                    onClick={() => setAdminExpanded(false)}
                    aria-label={tAdmin("collapse")}
                    className="ml-0.5 p-1 rounded-full text-stone/35 hover:text-stone/70 transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="admin-icons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => setAdminExpanded(true)}
                  aria-label={tAdmin("adminControls")}
                  className="flex items-center justify-center w-12 h-12 cursor-pointer text-torii"
                >
                  <Plus size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Desktop: always full bar */}
          <div className="hidden md:flex pointer-events-auto items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
              {tAdmin("adminControls")}
            </span>
            <span className="text-stone/25 font-mono select-none text-xs">|</span>
            <a
              href="/shrines/new"
              className="group flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-moss hover:bg-moss/10"
            >
              <Plus size={12} className="transition-transform group-hover:rotate-90" />
              <span>{tAdmin("addShrine")}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
