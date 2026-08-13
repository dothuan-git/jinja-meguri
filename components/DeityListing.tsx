"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  Search,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DeityListItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";
import { fold } from "@/lib/search";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import DeityCardBody, { type DeityCardData } from "@/components/DeityCardBody";
import DeityEditProvider from "@/components/deityEdit/DeityEditProvider";
import DeleteDeityPopup from "@/components/deityEdit/DeleteDeityPopup";
import { emptyDeityInput } from "@/lib/admin/deityInput";
import type { DeityInput } from "@/lib/admin/deityContract";

type Portfolio = DeityCardData & { id: string };

export default function DeityListing({
  deities,
  isAdmin = false,
  editSeeds,
}: {
  deities: DeityListItem[];
  isAdmin?: boolean;
  // Admin-only raw-row DeityInput per deity id, for the in-place editor.
  editSeeds?: Record<string, DeityInput>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Deities");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale() as Locale;

  // 1. Map the pre-sorted DeityListItem[] into the portfolio shape the JSX consumes.
  // Index correspondence with `deities` is preserved (plain .map), so currentIndex
  // also indexes the original list for edit pre-fill / id / delete.
  const deitiesList = useMemo<Portfolio[]>(
    () =>
      deities.map((d) => ({
        id: d.id,
        name: d.name_en,
        japaneseName: d.name_ja ?? "",
        display: namePair(locale, d),
        deityType: d.deity_type,
        titles: d.titles,
        canonicalLore: d.canonical_lore ?? "",
        mythicSphere: d.mythic_sphere,
        shrines: d.shrines.map((s) => ({
          id: s.slug,
          name: namePair(locale, s).main,
          location: s.city ?? "",
          prefecture: namePair(locale, s.prefecture).main,
          region: namePair(locale, s.region).main,
          slug: s.slug,
          isPrimary: s.is_primary,
          regionalLore: s.regional_lore ?? "",
        })),
      })),
    [deities, locale],
  );

  // Deep-link: ?deity=<id> focuses a deity, ?edit=1 (admin) opens it in edit mode.
  const focusId = searchParams.get("deity");
  const focusIndex = focusId
    ? deities.findIndex((d) => d.id === focusId || d.name_ja === focusId)
    : -1;

  const [currentIndex, setCurrentIndex] = useState(() => (focusIndex >= 0 ? focusIndex : 0));
  const [editing, setEditing] = useState(
    () => isAdmin && focusIndex >= 0 && searchParams.get("edit") === "1",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  useEntranceReveal(containerRef);

  // 2. Keyboard listeners for carousel navigation (disabled while editing).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editing) return;
      if (document.activeElement === searchInputRef.current) return;
      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, deitiesList, editing]);

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
    if (editing) return;
    setSlideDirection("right");
    setCurrentIndex((prev) => (prev + 1) % deitiesList.length);
  };

  const handlePrev = () => {
    if (editing) return;
    setSlideDirection("left");
    setCurrentIndex((prev) => (prev - 1 + deitiesList.length) % deitiesList.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) delta > 0 ? handleNext() : handlePrev();
    touchStartX.current = null;
  };

  const handleSelectPortfolio = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    setSlideDirection(targetIndex > currentIndex ? "right" : "left");
    setCurrentIndex(targetIndex);
    setSearchQuery("");
    setIsSearchFocused(false);
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
        deity.titles.some((t) => fold(t).includes(query)) ||
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
    <div ref={containerRef} className="relative min-h-[calc(100vh-140px)] w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-4 pb-16 z-10 flex flex-col items-center">

      {/* Editorial Watermarked Title (matching Sancturary Archives structure) */}
      <div data-reveal="fade-up-blur" className="text-center max-w-xl mx-auto mt-4 md:mt-6 mb-4 md:mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none">

        {/* Sacred Kanji Calligraphy Watermark - "神" (Kami / Deity) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none z-0">
          <div data-reveal="stamp" className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[7deg] flex items-center justify-center leading-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            神
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <Sparkles size={11} className="text-torii" />
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

      {/* SEARCH AND DIRECT SELECTOR REGION */}
      <div data-reveal="fade-up" className="w-full max-w-xl mb-6 md:mb-12 relative z-30 px-2">
        <div className="relative flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
          <Search className="absolute left-3 text-stone/40" size={14} />

          <input
            id="deity-search-box"
            ref={searchInputRef}
            type="text"
            placeholder={t("searchPlaceholder")}
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
                  {t("noneFound", { query: searchQuery })}
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
                        <span className="text-xs font-display font-black text-stone group-hover:text-torii transition-colors">
                          {deity.display.main}
                        </span>
                        {deity.display.sub && (
                          <span className="text-[10px] font-display text-moss-light">
                            ({deity.display.sub})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone/50 truncate font-sans max-w-[20rem] md:max-w-[28rem]">
                        {deity.titles[0] || deity.canonicalLore}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-stone/40 group-hover:text-torii flex items-center gap-0.5 whitespace-nowrap">
                      {t("reveal")} <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation tip — swipe on touch devices, keyboard on desktop */}
      {!editing && (
        <div data-reveal="fade-up" className="mb-5 select-none">
          <div className="text-stone/30 text-[10px] uppercase tracking-widest font-mono text-center block xl:hidden">
            {t("tipSwipe")}
          </div>
          <div className="text-stone/30 text-[10px] uppercase tracking-widest font-mono text-center hidden xl:block">
            {t("tipKeys")}
          </div>
        </div>
      )}

      {/* THE MAIN IMMERSIVE PORTFOLIO CAROUSEL CONTAINER */}
      <div
        data-reveal="rise"
        className="relative w-full select-text z-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* Floating Left Controller Button (desktop xl+ only, outside card) */}
        {!editing && (
          <button
            onClick={handlePrev}
            aria-label={t("prevDeity")}
            className="hidden xl:flex absolute top-1/2 -translate-y-1/2 -translate-x-[calc(100%+1.5rem)] left-0 z-20 w-12 h-12 rounded-full border border-moss/10 bg-washi hover:bg-white hover:text-torii text-stone/50 shadow-3xs items-center justify-center transition-all cursor-pointer hover:border-torii/30 focus:outline-hidden"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Dynamic Card Display */}
        <div className="w-full overflow-visible min-h-[500px]">
          {editing && isAdmin && activeDeity ? (
            // Static (non-animated) edit card: no transformed ancestor, so the edit
            // bar and toasts position against the viewport correctly.
            <div className="w-full bg-washi rounded-2xl md:rounded-3xl border border-moss/10 shadow-3xs p-6 md:p-10 relative">
              <div className="absolute inset-2 border border-dashed border-moss/5 pointer-events-none rounded-xl md:rounded-2xl" />
              <DeityEditProvider
                initialData={editSeeds?.[activeDeity.id] ?? emptyDeityInput()}
                deityId={activeDeity.id}
                mode="update"
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  router.refresh();
                }}
              >
                <DeityCardBody deity={activeDeity} />
              </DeityEditProvider>
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={slideDirection}>
              {activeDeity && (
                <motion.div
                  key={activeDeity.id}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full bg-washi rounded-2xl md:rounded-3xl border border-moss/10 shadow-3xs p-6 md:p-10 relative flex flex-col justify-between overflow-visible"
                >
                  {/* Visual Accent Inner Dashed Border (Tradional craftsmanship) */}
                  <div className="absolute inset-2 border border-dashed border-moss/5 pointer-events-none rounded-xl md:rounded-2xl" />

                  <DeityCardBody
                    deity={activeDeity}
                    onShrineClick={(slug) => {
                      // On mobile (< sm) the intercepted side modal is cramped —
                      // hard-navigate so the full shrine page renders instead.
                      if (window.matchMedia("(max-width: 639.98px)").matches) {
                        window.location.assign(`/shrines/${slug}`);
                      } else {
                        router.push(`/shrines/${slug}`, { scroll: false });
                      }
                    }}
                  />

                  {/* Lower Card Control bar — counter + dot nav */}
                  <div className="mt-8 pt-4 border-t border-stone/10 flex items-center justify-between text-xs font-mono select-none">
                    <span className="text-stone/40 font-bold">
                      {t("counter", { current: currentIndex + 1, total: deitiesList.length })}
                    </span>

                    <div className="flex items-center gap-1">
                      {deitiesList.map((_, dotIdx) => (
                        <button
                          key={"dot-" + dotIdx}
                          onClick={() => handleSelectPortfolio(dotIdx)}
                          className={`h-1.5 rounded-full transition-all duration-300 focus:outline-hidden cursor-pointer ${
                            dotIdx === currentIndex ? "w-4 bg-torii" : "w-1.5 bg-stone/20 hover:bg-stone/40"
                          }`}
                          title={t("navigateTo", { name: deitiesList[dotIdx].name })}
                        />
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Floating Right Controller Button (desktop xl+ only, outside card) */}
        {!editing && (
          <button
            onClick={handleNext}
            aria-label={t("nextDeity")}
            className="hidden xl:flex absolute top-1/2 -translate-y-1/2 translate-x-[calc(100%+1.5rem)] right-0 z-20 w-12 h-12 rounded-full border border-moss/10 bg-washi hover:bg-white hover:text-torii text-stone/50 shadow-3xs items-center justify-center transition-all cursor-pointer hover:border-torii/30 focus:outline-hidden"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <ChevronRight size={18} />
          </button>
        )}

      </div>

      {/* Admin Controls — rendered outside the transformed motion.div so `fixed` works.
          Shown even with an empty list so the first deity can be added; Edit/Delete
          are only offered when there is an active deity to act on. */}
      {isAdmin && !editing && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
                {tAdmin("adminControls")}
              </span>
              <span className="text-stone/25 font-mono select-none text-xs">|</span>
              {activeDeity && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-full border border-stone/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-stone/70 transition-colors hover:border-stone/40 hover:text-stone"
                  >
                    <Pencil size={12} />
                    <span>{tAdmin("edit")}</span>
                  </button>
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors hover:border-red-400 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                    <span>{tAdmin("delete")}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => router.push("/deities/new")}
                className="flex items-center gap-1.5 rounded-full bg-moss px-3 py-1 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-moss/90"
              >
                <Plus size={12} />
                <span>{tAdmin("newDeity")}</span>
              </button>
            </div>
          </div>

          {activeDeity && (
            <DeleteDeityPopup
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              deityId={activeDeity.id}
              deityName={activeDeity.name}
              linkedShrineCount={activeDeity.shrines.length}
            />
          )}
        </>
      )}

    </div>
  );
}
