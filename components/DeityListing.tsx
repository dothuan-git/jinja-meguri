"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  Search,
  Sparkles,
  MapPin,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import type { DeityListItem } from "@/lib/types";
import { fold } from "@/lib/search";
import { useEntranceReveal } from "@/components/useEntranceReveal";

export default function DeityListing({ deities }: { deities: DeityListItem[] }) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  // 1. Map the pre-sorted DeityListItem[] into the portfolio shape the JSX consumes
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

  // 2. Keyboard listeners for comfortable carousel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in search input
      if (document.activeElement === searchInputRef.current) return;

      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, deitiesList]);

  // Click outside listener for the search selector autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Carousel Navigation Callbacks
  const handleNext = () => {
    setSlideDirection("right");
    setCurrentIndex((prev) => (prev + 1) % deitiesList.length);
  };

  const handlePrev = () => {
    setSlideDirection("left");
    setCurrentIndex((prev) => (prev - 1 + deitiesList.length) % deitiesList.length);
  };

  const handleSelectPortfolio = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    setSlideDirection(targetIndex > currentIndex ? "right" : "left");
    setCurrentIndex(targetIndex);
    setSearchQuery("");
    setIsSearchFocused(false);

    // Smoothly scroll portfolio view into focus on mobile if needed
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // 4. Filter list dynamically for search dropdown suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = fold(searchQuery);
    return deitiesList
      .map((deity, index) => ({ deity, index }))
      .filter(({ deity }) =>
        fold(deity.name).includes(query) ||
        deity.japaneseName.includes(query) ||
        deity.titles.some(t => fold(t).includes(query)) ||
        fold(deity.canonicalLore).includes(query)
      );
  }, [searchQuery, deitiesList]);

  const activeDeity = deitiesList[currentIndex];

  // Component Animation States
  const slideVariants: Variants = {
    initial: (direction: "left" | "right") => ({
      x: direction === "right" ? 120 : -120,
      opacity: 0,
      scale: 0.98
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 220, damping: 24 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.3 }
      }
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "right" ? -120 : 120,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: "spring", stiffness: 220, damping: 24 },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh-140px)] w-full max-w-7xl mx-auto px-4 md:px-8 mt-4 pb-20 z-10 flex flex-col items-center">

      {/* Editorial Watermarked Title (matching Sancturary Archives structure) */}
      <div data-reveal="fade-up-blur" className="text-center max-w-xl mx-auto mt-6 mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none">

        {/* Sacred Kanji Calligraphy Watermark - "神" (Kami / Deity) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none z-0">
          <div className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[-5deg] flex items-center justify-center leading-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            神
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <Sparkles size={11} className="text-torii" />
          <span>Kami Pantheon Portfolio</span>
          <span className="w-1 h-1 rounded-full bg-torii/30" />
          <span>八百万の神々</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif text-stone font-black tracking-[0.25em] pl-[0.25em] uppercase mb-3 relative z-10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
          Deity Chronicles
        </h2>

        <p className="text-stone/85 text-xs font-serif italic tracking-wider max-w-md mx-auto leading-relaxed relative z-10 border-t border-moss/10 pt-4">
          “Trace the cosmological patronees, divine celestial chronicles, and localized regional mythologies of ancient spirits.”
        </p>
      </div>

      {/* SEARCH AND DIRECT SELECTOR REGION */}
      <div data-reveal="fade-up" className="w-full max-w-xl mb-12 relative z-30 px-2">
        <div className="relative flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
          <Search className="absolute left-3 text-stone/40" size={14} />

          <input
            id="deity-search-box"
            ref={searchInputRef}
            type="text"
            placeholder="Search deities by name, chronicled lore, or title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full text-xs font-sans pl-9 pr-12 py-3 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchFocused(false);
              }}
              className="absolute right-12 text-stone/40 hover:text-torii p-1.5 rounded-full transition-colors"
            >
              <X size={13} />
            </button>
          )}

          <div className="absolute right-3 text-[10px] font-mono text-stone/30 select-none hidden sm:block border-l border-stone/10 pl-2.5">
            Shift ⇄
          </div>
        </div>

        {/* Suggestion autocomplete dropdown list */}
        <AnimatePresence>
          {isSearchFocused && searchQuery.trim() !== "" && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute left-2 right-2 mt-1.5 max-h-72 overflow-y-auto bg-washi border border-moss/15 rounded-xl shadow-lg z-50 divide-y divide-stone/5 select-none"
            >
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone/50 font-sans">
                  No deities found matching “{searchQuery}”
                </div>
              ) : (
                searchResults.map(({ deity, index }) => (
                  <button
                    key={"search-res-" + deity.name}
                    onClick={() => handleSelectPortfolio(index)}
                    className={`w-full text-left p-3.5 hover:bg-stone/[0.03] transition-all flex items-center justify-between cursor-pointer group ${
                      index === currentIndex ? "bg-white border-l-2 border-torii" : ""
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-serif font-black text-stone group-hover:text-torii transition-colors">
                          {deity.name}
                        </span>
                        <span className="text-[10px] font-serif text-moss-light">
                          ({deity.japaneseName})
                        </span>
                      </div>
                      <p className="text-[10px] text-stone/50 truncate font-sans max-w-[20rem] md:max-w-[28rem]">
                        {deity.titles[0] || deity.canonicalLore}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-stone/40 group-hover:text-torii flex items-center gap-0.5 whitespace-nowrap">
                      Reveal <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* THE MAIN IMMERSIVE PORTFOLIO CAROUSEL CONTAINER */}
      <div data-reveal="rise" className="w-full flex items-center justify-between gap-2 md:gap-4 relative select-text z-10 px-0 md:px-2">

        {/* Floating Left Controller Button */}
        <button
          onClick={handlePrev}
          aria-label="Previous Deity Portfolio"
          className="hidden md:flex w-12 h-12 rounded-full border border-moss/10 bg-washi hover:bg-white hover:text-torii text-stone/50 shadow-3xs items-center justify-center transition-all cursor-pointer shrink-0 hover:border-torii/30 focus:outline-hidden"
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Dynamic Card Display */}
        <div className="flex-1 overflow-visible min-h-[500px]">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {activeDeity && (
              <motion.div
                key={activeDeity.name}
                custom={slideDirection}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full bg-washi rounded-2xl md:rounded-3xl border border-moss/10 shadow-3xs p-5 md:p-8 relative flex flex-col justify-between overflow-visible"
              >
                {/* Visual Accent Inner Dashed Border (Tradional craftsmanship) */}
                <div className="absolute inset-2 border border-dashed border-moss/5 pointer-events-none rounded-xl md:rounded-2xl" />

                {/* Main Bento Portfolio Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start relative z-10">

                  {/* Left Column: Divine Names, Seal Stamps, Epithets */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="space-y-4">

                      {/* Top Row: Meta Indicator and Stamp Seal */}
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono tracking-[0.15em] text-[#5e7f5a] font-bold bg-[#f3f6f1] border border-bamboo/15 px-2.5 py-1 rounded-sm select-none scale-95 origin-left uppercase">
                          Kami Chronicle Archive
                        </span>

                        {/* Traditional Vermillion Square Hanko Stamp */}
                        <div className="w-12 h-12 border border-torii/80 text-torii font-bold font-serif text-[10px] leading-tight tracking-wider flex items-center justify-center p-1.5 rotate-[-2.5deg] shadow-[inset_0_0_2px_rgba(201,75,50,0.25)] select-none shrink-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                          <div className="text-center font-black select-none">
                            {activeDeity.japaneseName.slice(0, 2)}
                            <br />
                            之神
                          </div>
                        </div>
                      </div>

                      {/* Display Divine Names */}
                      <div className="space-y-1">
                        <h3 className="text-2xl md:text-3.5xl font-serif font-black text-stone tracking-tight leading-tight select-all">
                          {activeDeity.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-serif text-moss font-medium pr-2 border-r border-stone/10 select-all" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                            {activeDeity.japaneseName}
                          </span>
                          <span className="text-[10px] font-mono tracking-widest text-[#5e7f5a] font-bold select-none">
                            神霊
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Divine Epithets & Realms List */}
                    {activeDeity.titles && activeDeity.titles.length > 0 && (
                      <div className="space-y-2 pt-5 border-t border-moss/10 select-text">
                        <span className="text-[9px] font-bold tracking-widest text-moss/55 uppercase block select-none">
                          Cosmic Epithets & Sphere of Patronage
                        </span>
                        <div className="flex flex-col gap-2 text-xs text-stone/75 font-sans font-medium">
                          {activeDeity.titles.map((title, tIdx) => (
                            <div key={tIdx} className="flex items-start gap-2.5 leading-relaxed bg-white/40 p-2 rounded-lg border border-stone/[0.03] shadow-3xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-torii shrink-0 mt-2" />
                              <span>{title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-5 border-t border-moss/10 select-none">
                      <div className="p-3 bg-white/50 border border-stone/5 rounded-xl shadow-4xs text-center sm:text-left">
                        <span className="text-[8px] font-bold tracking-widest text-stone/45 uppercase block">Enshrined Sites</span>
                        <span className="text-lg font-serif font-black text-stone">{activeDeity.shrines.length} Sanctuaries</span>
                      </div>
                      <div className="p-3 bg-white/50 border border-stone/5 rounded-xl shadow-4xs text-center sm:text-left">
                        <span className="text-[8px] font-bold tracking-widest text-stone/45 uppercase block">Mythic Sphere</span>
                        <span className="text-xs font-serif font-bold text-moss-light leading-none mt-1 block">
                          {activeDeity.name.includes("Inari") ? "Agriculture & Commerce" :
                           activeDeity.name.includes("Amaterasu") ? "Solar & Imperial" :
                           activeDeity.name.includes("Susanoo") ? "Storm & Gion" : "Natural Forces"}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Canonical Chronicle Lore, Enshrined Sanctuaries & Localized Lore */}
                  <div className="lg:col-span-7 space-y-6 lg:pl-4 border-t lg:border-t-0 lg:border-l border-moss/10 pt-6 lg:pt-0">

                    {/* A. Canonical Chronicle Lore Story */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold tracking-widest text-moss/55 uppercase block select-none">
                        Canonical Chronicle Chronicle (記紀神話)
                      </span>
                      <p className="first-letter:text-3.5xl first-letter:font-serif first-letter:font-black first-letter:text-torii first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 leading-relaxed font-serif text-sm md:text-base text-justify text-stone/90 select-text whitespace-pre-line">
                        {activeDeity.canonicalLore}
                      </p>
                    </div>

                    {/* B. Shrine Enshrinements and local geomyths and regional lore specific to that location */}
                    <div className="space-y-4 pt-5 border-t border-moss/10">
                      <div>
                        <span className="text-[9px] font-bold tracking-widest text-[#782c1a] uppercase block select-none">
                          Enshrinement Portals & Local Traditions
                        </span>
                        <p className="text-[11px] text-stone/50 font-sans mt-0.5 select-none">
                          This deity forms distinct relations depending on regional environments. Tap on a sanctuary to view files:
                        </p>
                      </div>

                      <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1 select-none">
                        {activeDeity.shrines.length === 0 ? (
                          <div className="p-6 rounded-xl border border-dashed border-stone/15 bg-stone/[0.015] text-center flex flex-col items-center gap-2">
                            <MapPin size={16} className="text-stone/25" />
                            <p className="text-xs font-serif text-stone/45 italic">
                              No shrine linked yet
                            </p>
                          </div>
                        ) : (
                        activeDeity.shrines.map(({ shrine, isPrimary, regionalLore }) => (
                          <div
                            key={shrine.id}
                            className={`p-4 rounded-xl border transition-all text-left group hover:bg-stone/[0.015] ${
                              isPrimary
                                ? "bg-white border-torii/15 hover:border-torii shadow-3xs"
                                : "bg-stone/[0.01] border-stone/10 hover:border-moss shadow-4xs"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {/* Shrine Header */}
                              <div className="flex items-start gap-2.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                  isPrimary ? "bg-torii/10 text-torii border-torii/10" : "bg-stone/10 text-stone/60 border-stone/5"
                                }`}>
                                  <MapPin size={11} className={isPrimary ? "animate-pulse" : ""} />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-serif font-black text-stone leading-tight flex items-center gap-1.5">
                                    {shrine.name}
                                  </h4>
                                  <span className="text-[9px] font-sans text-stone/40 block mt-0.5">
                                    {shrine.location} • {shrine.prefecture} Prefecture ({shrine.region} Region)
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Actions link */}
                              <div className="flex items-center gap-2">
                                {/* Primary classification tag */}
                                <span className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 scale-95 font-bold ${
                                  isPrimary ? "text-torii bg-torii/5" : "text-stone/40 bg-stone/5"
                                }`}>
                                  {isPrimary ? "Primary Enshrined" : "Companion Spirit"}
                                </span>

                                <button
                                  onClick={() => router.push(`/shrines/${shrine.slug}`)}
                                  className="text-[9px] font-mono font-bold tracking-widest uppercase text-stone/40 group-hover:text-torii transition-colors flex items-center gap-0.5 shrink-0 pl-1.5 border-l border-stone/10 cursor-pointer focus:outline-hidden"
                                >
                                  File
                                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                              </div>
                            </div>

                            {/* Geographical Regional Myth/Tradition detail specific to this shrine enshrinement */}
                            {regionalLore && (
                              <div className="mt-3.5 pt-3 border-t border-dashed border-stone/10 font-serif text-[11px] md:text-xs text-stone/75 leading-relaxed bg-[#fbfaf6] p-3 rounded-lg border border-stone/5 relative select-text flex gap-2">
                                <span className="text-torii text-base leading-none font-sans font-black select-none">“</span>
                                <div className="flex-1 text-justify whitespace-pre-line">
                                  {regionalLore}
                                </div>
                              </div>
                            )}

                          </div>
                        ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Lower Card Control bar for Mobile navigation */}
                <div className="mt-8 pt-4 border-t border-stone/10 flex items-center justify-between text-xs font-mono select-none">

                  {/* Text index indicator */}
                  <span className="text-stone/40 font-bold">
                    Kami {currentIndex + 1} of {deitiesList.length}
                  </span>

                  {/* Dot sliders to visualize location index */}
                  <div className="flex items-center gap-1">
                    {deitiesList.map((_, dotIdx) => (
                      <button
                        key={"dot-" + dotIdx}
                        onClick={() => handleSelectPortfolio(dotIdx)}
                        className={`h-1.5 rounded-full transition-all duration-300 focus:outline-hidden cursor-pointer ${
                          dotIdx === currentIndex ? "w-4 bg-torii" : "w-1.5 bg-stone/20 hover:bg-stone/40"
                        }`}
                        title={`Navigate to ${deitiesList[dotIdx].name}`}
                      />
                    ))}
                  </div>

                  {/* Mini controller row for quick switches */}
                  <div className="flex items-center gap-1.5 md:hidden">
                    <button
                      onClick={handlePrev}
                      className="w-8 h-8 rounded-full border border-stone/10 bg-white shadow-3xs flex items-center justify-center text-stone/50 hover:text-torii hover:border-torii transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={handleNext}
                      className="w-8 h-8 rounded-full border border-stone/10 bg-white shadow-3xs flex items-center justify-center text-stone/50 hover:text-torii hover:border-torii transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Right Controller Button */}
        <button
          onClick={handleNext}
          aria-label="Next Deity Portfolio"
          className="hidden md:flex w-12 h-12 rounded-full border border-moss/10 bg-washi hover:bg-white hover:text-torii text-stone/50 shadow-3xs items-center justify-center transition-all cursor-pointer shrink-0 hover:border-torii/30 focus:outline-hidden"
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <ChevronRight size={18} />
        </button>

      </div>

      {/* Decorative prompt for keyboard usage */}
      <div className="mt-6 text-stone/30 text-[10px] uppercase tracking-widest font-mono text-center hidden md:block select-none">
        Tip: Press left ← or right → arrow key to cycle deities
      </div>

    </div>
  );
}
