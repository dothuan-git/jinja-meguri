"use client";

import { useState, useEffect, useRef } from "react";
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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ShrineCard, FacetCatalogs } from "@/lib/types";
import ShrineImage from "@/components/ShrineImage";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import { getCategoryColor } from "@/lib/facetColors";
import RankTag from "@/components/RankTag";
import UserControls from "@/components/UserControls";

// Canonical compact chip style shared by category + rank tags across the
// table, cards, and the shrine detail/modal views. Color comes from facetColors.
const CHIP = "text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border";

type Filters = {
  searchQuery: string;
  prayerFocus: string[];
  ranks: string[];
  region: string[];
  prefecture: string[];
  deity: string[];
};

type SortField = "name" | "location" | "rank";
type SortDirection = "asc" | "desc";

const PARAM_KEY: Record<Exclude<keyof Filters, "searchQuery">, string> = {
  prayerFocus: "cat",
  ranks: "rank",
  region: "region",
  prefecture: "pref",
  deity: "deity",
};

export default function ShrineListing({ cards, facets, isAdmin, isUser }: { cards: ShrineCard[]; facets: FacetCatalogs; isAdmin?: boolean; isUser?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  const getList = (key: string) => params.getAll(key);
  const filters: Filters = {
    searchQuery: params.get("q") ?? "",
    prayerFocus: getList("cat"), // category name_en values
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
    if (q) next.set("q", q);
    else next.delete("q");
    router.replace(`/shrines?${next.toString()}`, { scroll: false });
  }

  const REGIONS_LIST = facets.regions.map((r) => r.name_en);
  const PREFECTURES_LIST = Object.values(facets.prefecturesByRegion)
    .flat()
    .map((p) => p.name_en);

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
  const [sorting, setSorting] = useState<{ field: SortField; direction: SortDirection }>({
    field: "name",
    direction: "asc",
  });

  const handleToggleFilter = (category: Exclude<keyof Filters, "searchQuery">, value: string) => {
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
      // Search Term match
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = card.name_en.toLowerCase().includes(query) || (card.name_ja ?? "").includes(query);
        const locMatch =
          (card.city ?? "").toLowerCase().includes(query) || card.prefecture.toLowerCase().includes(query);
        const primaryDeityMatch =
          (card.primary_deity?.name_en ?? "").toLowerCase().includes(query) ||
          (card.primary_deity?.name_ja ?? "").includes(query);
        const deityKanjiMatch = card.deity_ja.some((k) => k.includes(query));
        const rankMatch = card.rank_codes.some((r) => r.toLowerCase().includes(query));
        if (!nameMatch && !locMatch && !primaryDeityMatch && !deityKanjiMatch && !rankMatch) return false;
      }

      // Prayer Focus multi-match
      if (filters.prayerFocus.length > 0) {
        const hasFocus = card.category_codes.some((f) => filters.prayerFocus.includes(f));
        if (!hasFocus) return false;
      }

      // Rank multi-match
      if (filters.ranks.length > 0) {
        const hasRank = card.rank_codes.some((r) => filters.ranks.includes(r));
        if (!hasRank) return false;
      }

      // Region multi-match
      if (filters.region.length > 0 && !filters.region.includes(card.region)) {
        return false;
      }

      // Prefecture multi-match
      if (filters.prefecture.length > 0 && !filters.prefecture.includes(card.prefecture)) {
        return false;
      }

      // Deity multi-match (primary)
      if (filters.deity.length > 0) {
        const deities = card.primary_deity ? [card.primary_deity.name_en] : [];
        const hasDeity = deities.some((d) => filters.deity.includes(d));
        if (!hasDeity) return false;
      }

      return true;
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
  const hasActiveFilters =
    Object.values(filters).some((v) => Array.isArray(v) && v.length > 0) || filters.searchQuery !== "";

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh-140px)] w-full max-w-7xl mx-auto mt-4 pb-20 z-10 select-none flex flex-col">

      {/* Page Title with low opacity backdrop calligraphic seal */}
      <div data-reveal="fade-up-blur" className="text-center max-w-xl mx-auto mt-6 mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none">
        {/* Calligraphic/Hanko Seal watermark behind the page title */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.075] pointer-events-none select-none z-0">
          <div className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[-5deg] flex items-center justify-center leading-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            社
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <Compass size={11} className="text-torii" />
          <span>Sanctuary Archives</span>
          <span className="w-1 h-1 rounded-full bg-torii/30" />
          <span>神社一覧</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif text-stone font-black tracking-[0.25em] pl-[0.25em] uppercase mb-3 relative z-10">
          Sacred Sanctuaries
        </h2>
        <p className="text-stone/85 text-xs font-display italic tracking-wider max-w-md mx-auto leading-relaxed relative z-10 border-t border-moss/10 pt-4">
          “Enter the realm of ancient deities, preserved chronicle lineages, and sacred geographic coordinates.”
        </p>
      </div>

      {/* ==================== TYPOGRAPHY-FOCUSED INLINE FILTER PANEL ==================== */}
      <section data-reveal="fade-up" className="w-full pb-2 mb-2 flex flex-col gap-4 select-none text-xs">

        {/* Search Row & Active Filters Clear */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
              <Search className="absolute left-3 text-stone/40" size={14} />
              <input
                type="text"
                placeholder="Search by keywords (e.g., Kyoto, Amaterasu, Victory)..."
                value={filters.searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs font-sans pl-9 pr-12 py-3 bg-transparent border-none outline-none focus:ring-0 text-stone font-semibold placeholder:text-stone/40"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 text-stone/40 hover:text-torii p-1.5 rounded-full transition-colors"
                  title="Clear Search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Selectors for Desktop next to search */}
            <div className="hidden md:flex items-center gap-2.5">
              {[
                { id: "region" as const, label: "Region", list: REGIONS_LIST },
                { id: "prefecture" as const, label: "Prefecture", list: PREFECTURES_LIST },
              ].map(dropdown => {
                const activeOptionsCount = filters[dropdown.id].length;
                const isOpen = activeFilterDropdown === dropdown.id;
                return (
                  <div key={dropdown.id} className="relative select-none">
                    <button
                      onClick={() => setActiveFilterDropdown(isOpen ? null : dropdown.id)}
                      className={`px-4 py-3 border rounded-xl text-xs tracking-wide flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        activeOptionsCount > 0
                          ? "border-torii bg-torii/5 text-torii font-extrabold"
                          : "border-moss/15 bg-washi/95 hover:border-moss/45 text-stone/70 shadow-3xs"
                      }`}
                    >
                      <span className="font-sans">
                        {activeOptionsCount > 0
                          ? `${dropdown.label}: ${activeOptionsCount}`
                          : dropdown.label
                        }
                      </span>
                      {isOpen ? <ChevronUp size={11} className="text-moss-light" /> : <ChevronDown size={11} className="text-moss-light" />}
                    </button>

                    {/* Droplist flyout */}
                    <AnimatePresence>
                      {isOpen && (
                        <>
                          {/* Backdrop dismiss overlay */}
                          <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />

                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-56 bg-sand border border-moss/15 rounded-xl shadow-xl p-3.5 z-50 max-h-[280px] overflow-y-auto"
                          >
                            <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black pb-2 border-b border-moss/10 mb-2">
                              Select {dropdown.label}
                            </span>
                            <div className="space-y-0.5">
                              {dropdown.list.map((option) => {
                                const checked = filters[dropdown.id].includes(option);
                                return (
                                  <label key={option} className="flex items-center gap-2.5 text-xs text-stone cursor-pointer py-1.5 px-1 rounded-lg hover:bg-bamboo-light select-none">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleFilter(dropdown.id, option)}
                                      className="rounded border-moss/30 text-torii focus:ring-0 w-3.5 h-3.5 accent-torii"
                                    />
                                    <span className={`transition-colors truncate font-sans font-medium ${checked ? 'text-torii font-bold' : 'text-stone/72'}`}>
                                      {option}
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
            </div>
          </div>

          <div className="flex items-center gap-4 select-none self-end md:self-center">
            {/* Mobile Filters button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden text-xs text-stone border border-moss/10 hover:bg-sand/30 px-3 py-1.5 rounded-md flex items-center gap-1 font-bold cursor-pointer"
            >
              Filters
              {hasActiveFilters && (
                <span className="w-1 h-1 rounded-full bg-torii" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="text-[10px] uppercase font-mono tracking-widest text-[#9d4432] hover:text-torii font-black transition-colors cursor-pointer"
              >
                Clear Filters [×]
              </button>
            )}
          </div>
        </div>

      </section>

      {/* ==================== CORE LISTING CONTAINER ==================== */}
      <main data-reveal="rise" className="flex-1 flex flex-col min-w-0">

        {/* Upper Action Bar (Sorting control, layout picker, counter) */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-moss/15 shrink-0">

          <div className="flex items-center gap-2 select-none">
            <span className="text-stone font-display font-black tracking-widest text-base" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              神域 (Sanctuaries)
            </span>
            <span className="text-moss font-sans tracking-wide text-[10px] bg-bamboo-light/50 border border-moss/10 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {filteredShrines.length} {filteredShrines.length === 1 ? "Listed" : "Listed"}
            </span>
          </div>

          <div className="flex items-center gap-4 select-none">
            {/* Quick Sort dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-moss-light text-[10px] tracking-wider uppercase font-sans hidden sm:inline">Sort by:</span>
              <select
                value={sorting.field}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="text-xs bg-transparent text-stone py-1 border-none focus:outline-none focus:ring-0 font-sans pr-4 cursor-pointer font-bold"
              >
                <option value="name">Name (A-Z)</option>
                <option value="location">Location (Area)</option>
                <option value="rank">Sanctuary Rank</option>
              </select>
            </div>

            {/* View Buttons switcher */}
            <div className="flex items-center border border-moss/15 rounded-xl p-0.5 select-none bg-sand/40">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 transition-all rounded-lg cursor-pointer ${viewMode === "table" ? "bg-stone text-sand shadow-xs" : "text-moss-light hover:text-stone"}`}
                title="Structured Table View"
              >
                <TableProperties size={13} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 transition-all rounded-lg cursor-pointer ${viewMode === "card" ? "bg-stone text-sand shadow-xs" : "text-moss-light hover:text-stone"}`}
                title="High-Fidelity Card View"
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
              Your path reveals no shrines.
            </h3>
            <p className="text-slate-400 text-xs tracking-wide max-w-sm mb-6 leading-relaxed">
              No sanctuaries currently align with this specific configuration of deities, locations, and prayers. Expand your search parameters.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleClearAllFilters}
                className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-xs tracking-[0.16em] uppercase rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* ==================== SCREEN STATE: MAIN DATA RENDERS ==================== */}
            <AnimatePresence mode="popLayout">
              {viewMode === "table" ? (                   /* ----------------- 5A. TABLE GRID PRESENTATION ----------------- */
                <div className="overflow-x-auto w-full wabi-sabi-card bg-washi/85 rounded-2xl select-text">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-moss/10 bg-[#5c685f]/5 text-[10px] uppercase font-sans tracking-widest text-[#5c685f] font-bold select-none">
                        <th className="py-4 px-6 font-bold w-[20%]">
                          <span className="flex items-center gap-1 cursor-pointer hover:text-torii" onClick={() => handleSort("name")}>
                            Shrine Sanctuary
                            <ArrowUpDown size={10} />
                          </span>
                        </th>
                        <th className="py-4 px-4 font-bold w-[20%]">Main Deity</th>
                        <th className="py-4 px-4 font-bold w-[30%]">Prayer Focus</th>
                        <th className="py-4 px-4 font-bold w-[30%]">Best Time</th>
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
                              <div className="font-display font-black text-[15px] text-stone group-hover:text-torii transition-colors leading-snug">
                                {card.name_en}
                              </div>
                              <div className="text-[11px] text-[#5c685f]/70 font-display tracking-widest block leading-none pt-0.5 group-hover:text-torii transition-colors duration-200" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                {card.name_ja ?? ""}
                              </div>
                              <span className="text-[11px] text-stone/50 font-sans tracking-wide block pt-1.5">
                                {card.city ?? ""}, {card.prefecture}
                              </span>
                              {card.rank_codes.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                  {card.rank_codes.map((rank) => (
                                    <RankTag key={rank} rank={rank} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 2: Main Deity & Titles */}
                          <td className="py-6 px-4 align-top">
                            <div className="flex flex-col space-y-1">
                              <span className="text-[13px] text-stone font-extrabold tracking-wide leading-tight">
                                {card.primary_deity?.name_en ?? ""}
                              </span>
                              <span className="text-[10.5px] text-[#8a7a5f] font-display font-semibold tracking-widest block leading-none pt-0.5" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                {card.primary_deity?.name_ja ?? ""}
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
                                {card.category_codes.map((focus) => (
                                  <span key={focus} className={`${CHIP} ${getCategoryColor(focus)}`}>
                                    {focus}
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
              ) : (
                /* ----------------- 5B. HIGH-FIDELITY ARCHITECTURAL VERTICAL CARDS ----------------- */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredShrines.map((card, idx) => (
                    <motion.div
                      key={card.slug}
                      data-testid="shrine-card"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      onClick={() => router.push(`/shrines/${card.slug}`)}
                      className="group flex flex-col justify-between wabi-sabi-card hover:border-torii/40 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.01] hover:bg-white transition-all duration-300 h-auto bg-washi/85 shrink-0"
                    >
                      {(() => {
                        const isExpanded = expandedCards.has(card.slug);
                        return (
                          <>
                      <div className={`relative overflow-hidden transition-[max-height] duration-300 ease-in-out ${isExpanded ? "max-h-[2000px]" : "max-h-[360px]"}`}>
                        {/* Beautiful curved top-header image with loader fallback built-in */}
                        <div className="h-36 w-full relative overflow-hidden bg-sand shrink-0 border-b border-moss/10">
                          <ShrineImage alt={card.name_en} shrineId={card.slug} prefecture={card.prefecture} nameJa={card.name_ja ?? undefined} compact />

                          {/* Traditional paper/wood placard (Ofuda badge) */}
                          <div
                            className="absolute bottom-3 right-3 bg-washi border border-torii/25 px-2.5 py-1.5 rounded shadow-2xs font-display text-[10px] text-torii tracking-widest font-medium leading-none select-none z-10"
                            style={{ fontFamily: "'Noto Serif JP', serif" }}
                          >
                            {card.name_ja ?? ""}
                          </div>
                        </div>

                        {/* Card Text Content with structured layouts */}
                        <div className="p-5 flex flex-col space-y-4">
                          {/* Card Header Title and Location */}
                          <div>
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <h4 className="text-lg font-display font-black text-stone group-hover:text-torii tracking-wide transition-colors leading-snug">
                                {card.name_en}
                              </h4>
                            </div>
                            <div className="text-[11px] text-[#5c685f]/70 tracking-wide font-semibold mt-1 uppercase font-mono">
                              {card.city ?? ""}, {card.prefecture}
                            </div>
                          </div>

                          {/* Ranks & Titles List */}
                          <div className="flex flex-wrap gap-1">
                            {card.rank_codes.map((rankTitle) => (
                              <span key={rankTitle} className="text-[8.5px] bg-stone text-sand/90 border border-stone/15 px-2 py-0.5 rounded-md font-sans font-bold tracking-wider uppercase shadow-3xs">
                                {rankTitle}
                              </span>
                            ))}
                          </div>

                          {/* Main Deity Section */}
                          <div className="space-y-1 pt-1.5 border-t border-moss/5">
                            <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">Main Deity</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-bold text-stone tracking-wide">{card.primary_deity?.name_en ?? ""}</span>
                              <span className="text-[10.5px] text-torii font-display font-semibold tracking-wider" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                {card.primary_deity?.name_ja ?? ""}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-stone/60 leading-normal space-y-0.5 pt-0.5 font-sans">
                              {card.primary_deity_titles.map((title, tIdx) => (
                                <div key={tIdx} className="leading-snug">{title}</div>
                              ))}
                            </div>
                          </div>

                          {/* Prayer Focus Section */}
                          <div className="space-y-1.5 pt-1.5 border-t border-moss/5">
                            <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">Prayer Focus</span>
                            <p className="text-stone/70 text-[11px] leading-relaxed font-sans">
                              {card.prayer_focus ?? ""}
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {card.category_codes.map((focus) => (
                                <span key={focus} className={`${CHIP} ${getCategoryColor(focus)}`}>
                                  {focus}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Best Time Visitation block */}
                          <div className="pt-2.5 border-t border-moss/5 flex flex-col space-y-0.5">
                            <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">Best Time to Visit</span>
                            <p className="text-[11px] text-stone/60 leading-relaxed font-sans">
                              {card.best_time ?? ""}
                            </p>
                          </div>

                        </div>
                        {!isExpanded && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-washi to-transparent pointer-events-none" />
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCard(card.slug); }}
                        className="flex items-center justify-center gap-1 border-t border-moss/10 py-2 text-[10px] font-mono tracking-widest text-[#5c685f]/50 uppercase hover:text-torii transition-colors duration-200 w-full"
                      >
                        {isExpanded ? "collapse" : "show more"}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                          </>
                        );
                      })()}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ==================== MOBILE DRAWER SLIDE PANELS ==================== */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end md:hidden backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="w-full max-w-md h-full bg-white flex flex-col p-6 shadow-2xl overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <span className="font-display font-bold text-slate-800 tracking-wider flex items-center gap-1">
                  <Filter size={14} />
                  Structured Filters
                </span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full border border-slate-205 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable filters inside drawer */}
              <div className="flex-1 space-y-6">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-2">Search Term</span>
                  <input
                    type="text"
                    placeholder="Search shrines..."
                    value={filters.searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-205 focus:border-slate-800 rounded-lg outline-none"
                  />
                </div>

                {/* Mobile selections list */}
                <div className="space-y-6">
                  {/* Region */}
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Region</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {REGIONS_LIST.map((reg) => {
                        const checked = filters.region.includes(reg);
                        return (
                          <button
                            key={reg}
                            onClick={() => handleToggleFilter("region", reg)}
                            className={`px-3 py-2 text-center rounded-lg text-xs border transition-all cursor-pointer ${checked ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {reg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prefecture */}
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Prefecture</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PREFECTURES_LIST.map((pref) => {
                        const checked = filters.prefecture.includes(pref);
                        return (
                          <button
                            key={pref}
                            onClick={() => handleToggleFilter("prefecture", pref)}
                            className={`px-3 py-2 text-center rounded-lg text-xs border transition-all cursor-pointer ${checked ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {pref}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Drawer Sticky Footer with controls */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 mt-6">
                <button
                  onClick={handleClearAllFilters}
                  className="flex-1 py-3 text-center border border-slate-200 text-xs tracking-widest uppercase text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-3 text-center text-xs tracking-widest uppercase text-white bg-slate-900 rounded-xl hover:bg-slate-800 font-semibold cursor-pointer shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Controls — scaffold shown to signed-in non-admin users */}
      {isUser && !isAdmin && <UserControls />}

      {/* Admin Controls — floating pill mirroring the shrine detail page bar */}
      {isAdmin && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
              Admin Controls
            </span>
            <span className="text-stone/25 font-mono select-none text-xs">|</span>
            <Link
              href="/shrines/new"
              className="group flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-moss hover:bg-moss/10"
            >
              <Plus size={12} className="transition-transform group-hover:rotate-90" />
              <span>Add shrine</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
