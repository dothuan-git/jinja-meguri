"use client";

import { useState, useEffect, useRef } from "react";
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
  Heart,
  Plus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ShrineCard, FacetCatalogs } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";
import {
  FILTER_PARAM_KEY,
  hasActiveShrineFilters,
  matchesShrineFilters,
  readShrineFilters,
  type ShrineFilters,
} from "@/lib/shrineFilters";
import ShrineImage from "@/components/ShrineImage";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import { getCategoryColor } from "@/lib/facetColors";
import RankTag from "@/components/RankTag";
import UserControls from "@/components/UserControls";
import { useShrineMarks } from "@/components/user/useShrineMark";

// Canonical compact chip style shared by category + rank tags across the
// table, cards, and the shrine detail/modal views. Color comes from facetColors.
const CHIP = "text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border";

// Filter state/logic is shared with the map page — see lib/shrineFilters.ts.
type Filters = ShrineFilters;
const PARAM_KEY = FILTER_PARAM_KEY;

type SortField = "name" | "location" | "rank";
type SortDirection = "asc" | "desc";

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
  const params = useSearchParams();
  const t = useTranslations("ShrineListing");
  const tCommon = useTranslations("Common");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale() as Locale;
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  // Per-user collection state (optimistic). Seeds the heart toggles and the
  // "Show saved / Show collected" filters below.
  const marks = useShrineMarks({ saved: savedSlugs, stamped: stampedSlugs });
  const showSaved = params.get("saved") === "1";
  const showCollected = params.get("collected") === "1";

  function setFlag(key: string, on: boolean) {
    const next = new URLSearchParams(params.toString());
    if (on) next.set(key, "1");
    else next.delete(key);
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }

  const filters: Filters = readShrineFilters(params);

  function setParam(key: string, values: string[]) {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    values.forEach((v) => next.append(key, v));
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }
  function setSearch(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }

  const REGIONS_LIST = facets.regions.map((r) => ({ value: r.name_en, label: namePair(locale, r).main }));
  const PREFECTURES_LIST = Object.values(facets.prefecturesByRegion)
    .flat()
    .map((p) => ({ value: p.name_en, label: namePair(locale, p).main }));

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
  function toggleCard(slug: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

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
    setParam(PARAM_KEY[category], next);
  };

  const handleClearAllFilters = () => {
    router.replace("/shrines", { scroll: false });
    setActiveFilterDropdown(null);
  };

  const handleSort = (field: SortField) => {
    setSorting((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filter & Sort Application
  const filteredShrines = cards
    .filter((card) => {
      // Personal collection filters (signed-in only; sets update optimistically).
      if (showSaved && !marks.isSaved(card.slug)) return false;
      if (showCollected && !marks.isStamped(card.slug)) return false;
      return matchesShrineFilters(card, filters);
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sorting.field === "name") {
        comparison = a.name_en.localeCompare(b.name_en);
      } else if (sorting.field === "location") {
        comparison = (a.city ?? "").localeCompare(b.city ?? "");
      } else if (sorting.field === "rank") {
        // Custom Rank hierarchy ordering: Ise > Beppyo > Prefectural > others
        const rankOrder: Record<string, number> = {
          "Ise Grand Shrine": 5,
          "Beppyo (Special Rank)": 4,
          "Prefectural (Ken-sha)": 3,
          "National Treasure Sanctuary": 2,
          "Samurai Cultural Asset": 2,
        };

        const getPriority = (ranks: string[]) => {
          let max = 0;
          ranks.forEach((r) => {
            if (rankOrder[r] && rankOrder[r] > max) {
              max = rankOrder[r];
            }
          });
          return max;
        };

        const orderA = getPriority(a.rank_codes);
        const orderB = getPriority(b.rank_codes);
        comparison = orderB - orderA; // higher ranks first when sorting by rank
      }

      return sorting.direction === "asc" ? comparison : -comparison;
    });

  // Calculate active filter count
  const hasActiveFilters = hasActiveShrineFilters(filters) || showSaved || showCollected;

  // Heart toggle shared by the table rows and cards (signed-in only).
  const renderHeart = (slug: string, name: string, className: string) =>
    isSignedIn ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          marks.toggleSave(slug, name);
        }}
        disabled={marks.pending}
        aria-pressed={marks.isSaved(slug)}
        title={marks.isSaved(slug) ? tCommon("removeSaved") : tCommon("saveToList")}
        className={className}
      >
        <Heart
          size={15}
          className={marks.isSaved(slug) ? "fill-torii text-torii" : "text-stone/35 hover:text-torii"}
        />
      </button>
    ) : null;

  const renderListRows = () => (
    <div className="flex flex-col gap-3">
      {filteredShrines.map((card, idx) => {
        const isExpanded = expandedCards.has(card.slug);
        return (
          <motion.div
            key={card.slug}
            data-testid="shrine-list-row"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.025 }}
            onClick={() => toggleCard(card.slug)}
            className="wabi-sabi-card bg-washi/85 rounded-xl p-3 cursor-pointer hover:border-torii/40 hover:bg-white transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display font-black text-stone text-[15px] leading-snug">
                    {namePair(locale, card).main}
                  </span>
                  <span className="text-[10.5px] text-torii font-display tracking-widest shrink-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                    {namePair(locale, card).sub ?? ""}
                  </span>
                </div>
                <div className="text-[11px] text-stone/55 font-mono tracking-wide mt-0.5">
                  {card.primary_deity ? `${namePair(locale, card.primary_deity).main} · ` : ""}
                  {card.city ?? ""}, {namePair(locale, card.prefecture).main}
                </div>
                {card.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {card.categories.map((c) => (
                      <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                        {namePair(locale, c).main}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {renderHeart(card.slug, card.name_en, "cursor-pointer disabled:cursor-wait mt-0.5")}
                <span
                  aria-hidden
                  className="mt-0.5 p-0.5 rounded-full text-stone/30"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </div>
            </div>

            {/* Expandable: Prayer Focus + Best Time + detail link */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pt-3 mt-2 border-t border-moss/10 space-y-3">
                    {card.prayer_focus && (
                      <div>
                        <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black mb-1">
                          {t("prayerFocus")}
                        </span>
                        <p className="text-[11.5px] text-stone/70 leading-relaxed font-sans tracking-wide">
                          {card.prayer_focus}
                        </p>
                      </div>
                    )}
                    {card.best_time && (
                      <div>
                        <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black mb-1">
                          {t("bestTime")}
                        </span>
                        <p className="text-[11px] text-stone/65 font-sans leading-relaxed tracking-wide">
                          {card.best_time}
                        </p>
                      </div>
                    )}
                    <a
                      href={`/shrines/${card.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-torii px-4 py-2.5 text-[11px] font-mono font-bold uppercase tracking-widest text-washi hover:bg-torii-dark transition-colors"
                    >
                      {t("viewShrine")}
                      <Compass size={13} />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
      {filteredShrines.map((card, idx) => {
        const isExpanded = expandedCards.has(card.slug);
        const hasDetails =
          card.primary_deity_titles.length > 0 || !!card.prayer_focus || !!card.best_time;
        return (
          <motion.div
            key={card.slug}
            data-testid="shrine-card"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.03 }}
            onClick={() => router.push(`/shrines/${card.slug}`)}
            className="group flex flex-col wabi-sabi-card hover:border-torii/40 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:bg-white transition-all duration-300 bg-washi/85"
          >
            {/* Image header */}
            <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-sand shrink-0 border-b border-moss/10">
              <ShrineImage alt={card.name_en} shrineId={card.slug} prefecture={namePair(locale, card.prefecture).main} nameJa={card.name_ja ?? undefined} compact />

              {renderHeart(
                card.slug,
                card.name_en,
                "absolute top-2 right-2 z-10 rounded-full bg-washi/85 backdrop-blur p-1.5 shadow-2xs transition-transform hover:scale-110 cursor-pointer disabled:cursor-wait",
              )}

              {/* Traditional paper/wood placard (Ofuda badge) */}
              <div
                className="absolute bottom-3 right-3 bg-washi border border-torii/25 px-2.5 py-1.5 rounded shadow-2xs font-display text-[10px] text-torii tracking-widest font-medium leading-none select-none z-10"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                {card.name_ja ?? ""}
              </div>
            </div>

            {/* Card content — essentials always visible */}
            <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3.5 flex-1">
              {/* Header: title + ranks + location */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base sm:text-lg font-display font-black text-stone group-hover:text-torii tracking-wide transition-colors leading-snug">
                    {namePair(locale, card).main}
                  </h4>
                  {card.ranks.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1 shrink-0">
                      {card.ranks.map((rank) => (
                        <span key={rank.name_en} className="text-[8.5px] bg-stone text-sand/90 border border-stone/15 px-2 py-0.5 rounded-md font-sans font-bold tracking-wider uppercase shadow-3xs">
                          {namePair(locale, rank).main}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-[#5c685f]/70 tracking-wide font-semibold mt-1 uppercase font-mono">
                  {card.city ?? ""}, {namePair(locale, card.prefecture).main}
                </div>
              </div>

              {/* Main Deity */}
              <div className="space-y-1 pt-1.5 border-t border-moss/5">
                <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">{t("mainDeity")}</span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-stone tracking-wide">
                    {card.primary_deity ? namePair(locale, card.primary_deity).main : ""}
                  </span>
                  <span className="text-[10.5px] text-torii font-display font-semibold tracking-wider" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                    {(card.primary_deity && namePair(locale, card.primary_deity).sub) ?? ""}
                  </span>
                </div>
              </div>

              {/* Category chips */}
              {card.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.categories.map((c) => (
                    <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                      {namePair(locale, c).main}
                    </span>
                  ))}
                </div>
              )}

              {/* Expandable details: deity titles + prayer focus + best time */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 sm:gap-3.5">
                      {card.primary_deity_titles.length > 0 && (
                        <div className="text-[10.5px] text-stone/60 leading-normal space-y-0.5 font-sans">
                          {card.primary_deity_titles.map((title, tIdx) => (
                            <div key={tIdx} className="leading-snug">{title}</div>
                          ))}
                        </div>
                      )}
                      {card.prayer_focus && (
                        <div className="space-y-1.5 pt-1.5 border-t border-moss/5">
                          <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">{t("prayerFocus")}</span>
                          <p className="text-stone/70 text-[11px] leading-relaxed font-sans">{card.prayer_focus}</p>
                        </div>
                      )}
                      {card.best_time && (
                        <div className="space-y-0.5 pt-1.5 border-t border-moss/5">
                          <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">{t("bestTimeToVisit")}</span>
                          <p className="text-[11px] text-stone/60 leading-relaxed font-sans">{card.best_time}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Show more / collapse */}
            {hasDetails && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCard(card.slug); }}
                className="flex items-center justify-center gap-1 border-t border-moss/10 py-2.5 text-[10px] font-mono tracking-widest text-[#5c685f]/50 uppercase hover:text-torii transition-colors duration-200 w-full"
              >
                {isExpanded ? t("collapse") : t("showMore")}
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </motion.div>
        );
      })}
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
              type="text"
              placeholder={t("searchPlaceholder")}
              value={filters.searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-sans pl-9 pr-12 py-3 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
            />
            {filters.searchQuery && (
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
            {/* ==================== SCREEN STATE: MAIN DATA RENDERS ==================== */}
            <AnimatePresence mode="popLayout">
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
                        <motion.tr
                           key={card.slug}
                           initial={{ opacity: 0, y: 5 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0 }}
                           transition={{ duration: 0.2, delay: idx * 0.025 }}
                           onClick={() => router.push(`/shrines/${card.slug}`)}
                           className="group hover:bg-white transition-colors duration-200 cursor-pointer text-stone font-medium"
                        >
                          {/* Column 1: Shrine Name & Location */}
                          <td className="py-6 px-6 align-top">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-display font-black text-[15px] text-stone group-hover:text-torii transition-colors leading-snug">
                                  {namePair(locale, card).main}
                                </div>
                                {renderHeart(card.slug, card.name_en, "shrink-0 -mt-0.5 cursor-pointer disabled:cursor-wait")}
                              </div>
                              <div className="text-[11px] text-[#5c685f]/70 font-display tracking-widest block leading-none pt-0.5 group-hover:text-torii transition-colors duration-200" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                {namePair(locale, card).sub ?? ""}
                              </div>
                              <span className="text-[11px] text-stone/50 font-sans tracking-wide block pt-1.5">
                                {card.city ?? ""}, {namePair(locale, card.prefecture).main}
                              </span>
                              {card.ranks.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                  {card.ranks.map((rank) => (
                                    <RankTag key={rank.name_en} rank={rank} locale={locale} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 2: Main Deity & Titles */}
                          <td className="py-6 px-4 align-top">
                            <div className="flex flex-col space-y-1">
                              <span className="text-[13px] text-stone font-extrabold tracking-wide leading-tight">
                                {card.primary_deity ? namePair(locale, card.primary_deity).main : ""}
                              </span>
                              <span className="text-[10.5px] text-[#8a7a5f] font-display font-semibold tracking-widest block leading-none pt-0.5" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                {(card.primary_deity && namePair(locale, card.primary_deity).sub) ?? ""}
                              </span>
                              <div className="flex flex-col gap-1 pt-2">
                                {card.primary_deity_titles.map((title, tIdx) => (
                                  <p key={tIdx} className="text-[10.5px] text-stone/60 leading-normal font-sans font-medium">
                                    {title}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Prayer Focus (Normal Body Text) */}
                          <td className="py-6 px-4 align-top">
                            <div className="flex flex-col space-y-3">
                              <p className="text-[11.5px] text-stone/70 leading-relaxed font-sans tracking-wide">
                                {card.prayer_focus ?? ""}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {card.categories.map((c) => (
                                  <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                                    {namePair(locale, c).main}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Column 4: Best Time (Normal Typography, No Subtitle) */}
                          <td className="py-6 px-4 align-top">
                            <p className="text-[11px] text-stone/65 font-sans leading-relaxed tracking-wide pt-0.5">
                              {card.best_time ?? ""}
                            </p>
                          </td>

                        </motion.tr>
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
