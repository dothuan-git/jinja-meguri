"use client";

import { useState, useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Flame,
  Scroll,
  Waves,
  Sun,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import type { CalendarFestival, FestivalOccurrenceRow } from "@/lib/types";
import { FESTIVAL_TYPE_LABEL } from "@/lib/labels";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import type { OccurrenceShrineOption } from "@/components/admin/OccurrenceModal";

// Admin-only occurrence editor; lazily loaded so its form/picker/toast chunk ships
// only to admins, keeping the public calendar bundle lean.
const OccurrenceModal = dynamic(() => import("@/components/admin/OccurrenceModal"), { ssr: false });

// Poetic lunar month structure
interface PoeticMonth {
  number: number;
  name: string;
  wamei: string;
  kanji: string;
  meaning: string;
}

const POETIC_MONTHS: Record<number, PoeticMonth> = {
  1: { number: 1, name: "January", wamei: "Mutsuki", kanji: "睦月", meaning: "Month of Love/Harmony" },
  2: { number: 2, name: "February", wamei: "Kisaragi", kanji: "如月", meaning: "Shedding & Warming Layers" },
  3: { number: 3, name: "March", wamei: "Yayoi", kanji: "弥生", meaning: "Sprouting of Fresh Flowers" },
  4: { number: 4, name: "April", wamei: "Uzuki", kanji: "卯月", meaning: "Deutzia Flower Blossoms" },
  5: { number: 5, name: "May", wamei: "Satsuki", kanji: "皐月", meaning: "Rice Sprout Cultivation" },
  6: { number: 6, name: "June", wamei: "Minazuki", kanji: "水無月", meaning: "Water For Swelling Fields" },
  7: { number: 7, name: "July", wamei: "Fumizuki", kanji: "文月", meaning: "Scribe Letters & Wheat Harvest" },
  8: { number: 8, name: "August", wamei: "Hazuki", kanji: "葉月", meaning: "Falling Leaves of Autumn" },
  9: { number: 9, name: "September", wamei: "Nagatsuki", kanji: "長月", meaning: "The Elongation of Nights" },
  10: { number: 10, name: "October", wamei: "Kannazuki", kanji: "神無月", meaning: "Month of No Gods" },
  11: { number: 11, name: "November", wamei: "Shimotsuki", kanji: "霜月", meaning: "Descent of Silver Frost" },
  12: { number: 12, name: "December", wamei: "Shiwasu", kanji: "師走", meaning: "Priests Running Pageant" },
};

const SEASONS: Record<number, { kanji: string; name: string; color: string; bg: string }> = {
  1: { kanji: "冬", name: "Fuyu • Winter", color: "text-[#4f5c6b]", bg: "bg-[#eceef0]" },
  2: { kanji: "冬", name: "Fuyu • Winter", color: "text-[#4f5c6b]", bg: "bg-[#eceef0]" },
  3: { kanji: "春", name: "Haru • Spring", color: "text-torii", bg: "bg-torii/[0.04]" },
  4: { kanji: "春", name: "Haru • Spring", color: "text-torii", bg: "bg-torii/[0.04]" },
  5: { kanji: "春", name: "Haru • Spring", color: "text-torii", bg: "bg-torii/[0.04]" },
  6: { kanji: "夏", name: "Natsu • Summer", color: "text-bamboo", bg: "bg-bamboo/10" },
  7: { kanji: "夏", name: "Natsu • Summer", color: "text-bamboo", bg: "bg-bamboo/10" },
  8: { kanji: "夏", name: "Natsu • Summer", color: "text-bamboo", bg: "bg-bamboo/10" },
  9: { kanji: "秋", name: "Aki • Autumn", color: "text-torii-dark", bg: "bg-orange-100/30" },
  10: { kanji: "秋", name: "Aki • Autumn", color: "text-torii-dark", bg: "bg-orange-100/30" },
  11: { kanji: "秋", name: "Aki • Autumn", color: "text-torii-dark", bg: "bg-orange-100/30" },
  12: { kanji: "冬", name: "Fuyu • Winter", color: "text-[#4f5c6b]", bg: "bg-[#eceef0]" },
};

// Local shape the ported JSX consumes, adapted from CalendarFestival
type LinkedFestival = {
  id: string;
  name: string;            // "<en> (<ja>)" or just en
  time: string;
  origin: string;
  meaning: string;
  ritual: string;
  prayer: string;
  type: { category: "spectacle" | "pilgrimage" | ""; notes: string };
  month: number | null;
  start_date: string | null;
  end_date: string | null;
  shrine: { id: string; name: string; location: string; prefecture: string; region: string; slug: string };
};

export default function Calendar({
  year,
  festivals,
  isAdmin = false,
  occurrenceSeed,
}: {
  year: number;
  festivals: CalendarFestival[];
  isAdmin?: boolean;
  occurrenceSeed?: FestivalOccurrenceRow[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  useEntranceReveal(containerRef);

  const [occModalOpen, setOccModalOpen] = useState(false);

  // Picker options for the admin occurrence editor, derived from the already-loaded
  // `festivals` prop (no extra fetch) — every field the modal needs is on CalendarFestival.
  const shrineOptions = useMemo<OccurrenceShrineOption[]>(() => {
    const map = new Map<string, OccurrenceShrineOption>();
    for (const f of festivals) {
      if (!map.has(f.shrine_slug)) {
        map.set(f.shrine_slug, { shrine_slug: f.shrine_slug, shrine_name_en: f.shrine_name_en, festivals: [] });
      }
      map.get(f.shrine_slug)!.festivals.push({
        festival_id: f.festival_id,
        name_en: f.festival_name_en,
        name_ja: f.festival_name_ja,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.shrine_name_en.localeCompare(b.shrine_name_en));
  }, [festivals]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all"); // "all", "spectacle", "pilgrimage"
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [expandedFestivals, setExpandedFestivals] = useState<Record<string, boolean>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Mobile only: the modal's agenda column starts collapsed and expands when a day with festivals is tapped.
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);

  // Mouse drag-to-scroll for the mobile/tablet month scroller (touch already works via overflow-x-auto)
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const monthDrag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 });
  const agendaRef = useRef<HTMLDivElement>(null);
  // Stable snapshot of the real "today", used to default the popup and mark the today-cell.
  const today = useMemo(() => {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  }, []);
  const [calendarMonth, setCalendarMonth] = useState(today.month);
  const [calendarYear, setCalendarYear] = useState(year);
  const [selectedDay, setSelectedDay] = useState<{ day: number; month: number; year: number } | null>(today);

  // createPortal targets document.body — render the portal only after mount (SSR-safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Track phone viewport so the modal's agenda only animates open/collapsed below md (desktop keeps the static side panel).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const linked: LinkedFestival[] = festivals.map((f) => ({
    id: f.festival_id,
    name: f.festival_name_ja ? `${f.festival_name_en} (${f.festival_name_ja})` : f.festival_name_en,
    time: f.time_prose ?? "",
    origin: f.origin ?? "",
    meaning: f.meaning ?? "",
    ritual: f.ritual ?? "",
    prayer: f.prayer ?? "",
    type: {
      category: (f.festival_type ?? "") as "spectacle" | "pilgrimage" | "",
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

  const toggleFestival = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedFestivals(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter linked festivals based on search and category
  const getLinkedFestivalsFiltered = (): LinkedFestival[] => {
    let list = linked;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.meaning.toLowerCase().includes(q) ||
        f.shrine.name.toLowerCase().includes(q) ||
        f.shrine.location.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== "all") {
      list = list.filter(f => f.type.category === activeCategory);
    }

    return list;
  };

  // Group linked festivals by resolved month (0 bucket = undated)
  const getFestivalsByMonth = (festList: LinkedFestival[]): Record<number, LinkedFestival[]> => {
    const grouped: Record<number, LinkedFestival[]> = {};
    festList.forEach((f) => {
      const m = f.month ?? 0; // 0 bucket = undated
      (grouped[m] ??= []).push(f);
    });
    return grouped;
  };

  const filteredFestivals = getLinkedFestivalsFiltered();
  const festivalsGrouped = getFestivalsByMonth(filteredFestivals);

  // Sort months ascending; drop the undated 0-bucket from the 12-month timeline
  const activeMonths = Object.keys(festivalsGrouped)
    .map(Number)
    .filter((m) => m >= 1)
    .sort((a, b) => a - b);

  const handleMonthClick = (mNum: number) => {
    if (monthDrag.current.moved > 5) return; // ignore the click that ends a drag
    const element = document.getElementById(`month-section-${mNum}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onMonthPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = monthScrollRef.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    monthDrag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
    el.setPointerCapture(e.pointerId);
  };
  const onMonthPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = monthScrollRef.current;
    const s = monthDrag.current;
    if (!el || !s.active) return;
    const dx = e.clientX - s.startX;
    s.moved = Math.max(s.moved, Math.abs(dx));
    el.scrollLeft = s.startLeft - dx;
  };
  const endMonthDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!monthDrag.current.active) return;
    monthDrag.current.active = false;
    const el = monthScrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  // Shrine detail nav: on mobile (< sm) the intercepted side modal is cramped —
  // hard-navigate to the full page instead; desktop keeps the soft-nav modal.
  const openShrine = (slug: string) => {
    if (window.matchMedia("(max-width: 639.98px)").matches) {
      window.location.assign(`/shrines/${slug}`);
    } else {
      router.push(`/shrines/${slug}`);
    }
  };

  const FESTIVAL_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All Rites" },
    { value: "spectacle", label: FESTIVAL_TYPE_LABEL.spectacle },
    { value: "pilgrimage", label: FESTIVAL_TYPE_LABEL.pilgrimage },
  ];

  // Helper to choose high craft contextual icons based on keywords in Name/Meaning
  const getContextualIcon = (fName: string, fMeaning: string) => {
    const text = (fName + " " + fMeaning).toLowerCase();
    if (text.includes("boat") || text.includes("water") || text.includes("ocean") || text.includes("bay") || text.includes("sea")) {
      return <Waves className="text-blue-600/70" size={16} />;
    }
    if (text.includes("lantern") || text.includes("light") || text.includes("fire") || text.includes("sunset") || text.includes("moon")) {
      return <Flame className="text-torii" size={16} />;
    }
    if (text.includes("agriculture") || text.includes("rice") || text.includes("harvest") || text.includes("yield")) {
      return <Sun className="text-amber-500/70" size={16} />;
    }
    return <Sparkles className="text-torii-dark/70" size={16} />;
  };

  // Real-date check against the resolved start/end dates
  const isFestivalOnDay = (fest: LinkedFestival, y: number, m: number, day: number): boolean => {
    if (!fest.start_date) return false;
    const target = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const end = fest.end_date ?? fest.start_date;
    return fest.start_date <= target && target <= end;
  };

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh-140px)] w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-4 pb-16 z-10 select-none">

      {/* Page Title with low opacity backdrop calligraphic seal */}
      <div data-reveal="fade-up-blur" className="text-center max-w-xl mx-auto mt-4 md:mt-6 mb-4 md:mb-8 relative flex flex-col items-center justify-center overflow-visible py-2 w-full select-none">
        {/* Calligraphic/Hanko Seal watermark behind the page title */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.075] pointer-events-none select-none z-0">
          <div data-reveal="stamp" className="border-[3.5px] border-torii text-torii text-[64px] md:text-[76px] font-black p-2.5 md:p-3.5 rounded-sm rotate-[-13deg] flex items-center justify-center leading-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            祭
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-black bg-washi px-3 py-1 rounded-full border border-moss/10 shadow-3xs mb-3 z-10">
          <CalendarIcon size={11} className="text-torii" />
          <span>Solar Term Liturgy</span>
          <span className="w-1 h-1 rounded-full bg-torii/30" />
          <span>祭時暦</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif text-stone font-black tracking-[0.25em] pl-[0.25em] uppercase mb-3 relative z-10">
          Festival Liturgy
        </h2>
        <p className="text-stone/85 text-xs font-display italic tracking-wider max-w-md mx-auto leading-relaxed relative z-10 border-t border-moss/10 pt-4">
          “Synchronize with ancient rhythms. Discover where the deities perform their sacred alignments across the annual rotation of natural terms.”
        </p>
      </div>

      {/* 2. SEASONAL TERMINOLOGY RESOURCE BANNER (hidden on mobile) */}
      <div data-reveal="fade-up" className="w-full bg-washi border border-[#e8e4db] rounded-2xl p-3.5 lg:p-5 mb-5 lg:mb-10 text-stone relative overflow-hidden hidden md:flex flex-col md:flex-row items-center justify-between gap-3 lg:gap-6 shadow-3xs">
        <div className="flex items-center gap-3 lg:gap-4 relative z-10 w-full md:w-auto">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-torii/5 border border-torii/15 flex items-center justify-center text-torii shrink-0 shadow-3xs">
            <Sun size={16} className="stroke-[1.5] lg:w-[18px] lg:h-[18px]" />
          </div>
          <div>
            <h3 className="text-[11px] lg:text-xs font-mono font-black uppercase tracking-[0.15em] text-torii-dark flex items-center gap-1.5">
              <span>Sacred Nature Resonance (自然融和)</span>
            </h3>
            <p className="text-stone/80 text-[10.5px] lg:text-[11.5px] font-serif tracking-wider leading-relaxed mt-0.5 max-w-md lg:max-w-xl">
              In traditional Shinto worship, seasonal cycles serve as portals of divine arrival. The calendar below tracks grand processions and intimate rituals aligned with natural crop coordinates.
            </p>
          </div>
        </div>

        {/* Mini seasonal badges */}
        <div className="flex items-center gap-2 max-w-full overflow-x-auto scrollbar-none relative z-10 self-start md:self-auto py-1">
          {Array.from(new Set(Object.values(SEASONS).map(s => s.kanji))).map((kanji) => {
            const firstSeasonMatch = Object.values(SEASONS).find(s => s.kanji === kanji)!;
            return (
              <div
                key={kanji}
                className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg border flex items-center gap-1.5 text-stone ${firstSeasonMatch.bg} border-moss/5 shadow-3xs shrink-0`}
              >
                <span className={`text-xs font-display font-black ${firstSeasonMatch.color}`}>{kanji}</span>
                <span className="text-[8px] font-mono tracking-widest uppercase font-black text-[#5c685f]">
                  {firstSeasonMatch.name.split(" • ")[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LUNAR CYCLE INDEX SCROLLER (MOBILE & TABLET EXCLUSIVE DOCK) */}
      <div
        data-reveal="fade-up"
        ref={monthScrollRef}
        onPointerDown={onMonthPointerDown}
        onPointerMove={onMonthPointerMove}
        onPointerUp={endMonthDrag}
        onPointerLeave={endMonthDrag}
        className="lg:hidden w-full overflow-x-auto scrollbar-none select-none cursor-grab active:cursor-grabbing flex gap-2.5 py-3 px-1 mb-4 md:mb-6 border-y border-moss/10 md:sticky md:top-14 bg-sand/90 backdrop-blur-md z-30"
      >
        {Object.keys(POETIC_MONTHS).map(Number).sort((a, b) => a - b).map(mNum => {
          const mInfo = POETIC_MONTHS[mNum];
          const isMonthActive = activeMonths.includes(mNum);
          return (
            <button
              key={mNum}
              onClick={() => handleMonthClick(mNum)}
              disabled={!isMonthActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0 transition-all duration-300 ${
                isMonthActive
                  ? "border-[#e5dfd3] bg-white text-stone text-[11px] font-serif font-bold cursor-pointer active:scale-95 shadow-3xs"
                  : "border-moss/5 bg-sand text-stone/30 text-[11px] font-serif opacity-40 cursor-not-allowed"
              }`}
            >
              <span className="text-torii">{mInfo.kanji}</span>
              <span className="text-[8px] font-mono text-moss-light uppercase tracking-wider">{mInfo.wamei}</span>
            </button>
          );
        })}
      </div>

      {/* 4. CHRONOLOGY FILTER & SEARCH ACTIONS PANEL */}
      <div data-reveal="fade-up" className="w-full bg-[#f5f2eb] border border-[#dfdbd2] p-2.5 md:p-4 rounded-2xl mb-6 md:mb-12 flex flex-row items-stretch justify-between gap-2 md:gap-3 relative shadow-3xs">

        {/* Search input styled as a scroll calligraphy ledger search */}
        <div className="relative flex-1 flex items-center bg-washi/90 border border-moss/15 rounded-xl shadow-xs focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
          <Search className="absolute left-3 text-stone/40" size={14} />
          <input
            type="text"
            placeholder="Search by deity name, shrine origin, or ceremony terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-sans pl-9 pr-12 py-3 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-stone/40 hover:text-torii p-1.5 rounded-full transition-colors"
              title="Clear Search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right controls grouping toggles and interactive month calendar button */}
        <div className="flex flex-row items-stretch gap-2 md:gap-3 shrink-0">
          {/* Festival type toggles — iPad & desktop only */}
          <div className="hidden md:flex bg-sand p-1 rounded-xl border border-[#dfdbd2] items-center gap-0.5 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "all"
                  ? "bg-white text-torii-dark shadow-3xs border border-[#dfdbd2]"
                  : "text-[#5c685f] hover:text-stone hover:bg-white/40"
              }`}
            >
              All Rites
            </button>
            <button
              onClick={() => setActiveCategory("spectacle")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "spectacle"
                  ? "bg-white text-torii-dark shadow-3xs border border-[#dfdbd2]"
                  : "text-[#5c685f] hover:text-stone hover:bg-white/40"
              }`}
            >
              {FESTIVAL_TYPE_LABEL.spectacle}
            </button>
            <button
              onClick={() => setActiveCategory("pilgrimage")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "pilgrimage"
                  ? "bg-white text-torii-dark shadow-3xs border border-[#dfdbd2]"
                  : "text-[#5c685f] hover:text-stone hover:bg-white/40"
              }`}
            >
              {FESTIVAL_TYPE_LABEL.pilgrimage}
            </button>
          </div>

          {/* Festival type filter — single-select dropdown (mobile only) */}
          <div className="relative select-none md:hidden">
            <button
              onClick={() => setTypeMenuOpen((o) => !o)}
              className={`h-full px-3 border rounded-xl text-xs tracking-wide flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                activeCategory !== "all"
                  ? "border-torii bg-torii/5 text-torii font-extrabold"
                  : "border-moss/15 bg-washi/95 hover:border-moss/45 text-stone/70 shadow-3xs"
              }`}
            >
              <span className="font-sans whitespace-nowrap">
                {FESTIVAL_TYPE_OPTIONS.find((o) => o.value === activeCategory)?.label ?? "All Rites"}
              </span>
              {typeMenuOpen ? <ChevronUp size={11} className="text-moss-light" /> : <ChevronDown size={11} className="text-moss-light" />}
            </button>
            <AnimatePresence>
              {typeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTypeMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-sand border border-moss/15 rounded-xl shadow-xl p-3.5 z-50"
                  >
                    <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black pb-2 border-b border-moss/10 mb-2">
                      Select Rite Type
                    </span>
                    <div className="space-y-0.5">
                      {FESTIVAL_TYPE_OPTIONS.map((option) => {
                        const isActive = activeCategory === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => { setActiveCategory(option.value); setTypeMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 text-xs cursor-pointer py-1.5 px-1 rounded-lg hover:bg-bamboo-light"
                          >
                            <span className={`transition-colors font-sans font-medium ${isActive ? "text-torii font-bold" : "text-stone/72"}`}>
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Month Grid / Google Calendar style popup button (icon-only on mobile) */}
          <button
            onClick={() => { setMobileAgendaOpen(false); setIsCalendarOpen(true); }}
            aria-label="Lunar Month Calendar"
            title="Lunar Month Calendar (月暦画)"
            className="flex items-center justify-center gap-2 px-3 md:px-4 h-full bg-white border border-[#dfdbd2] hover:border-torii/40 hover:bg-torii/[0.02] text-torii-dark rounded-xl text-[10.5px] font-serif font-black tracking-wider shadow-3xs hover:shadow-xs transition-all duration-300 cursor-pointer shrink-0"
          >
            <CalendarIcon size={13} className="shrink-0 text-torii" />
            <span className="hidden lg:inline">Lunar Month Calendar</span>
          </button>
        </div>

      </div>

      {/* 5. SPLIT TIMELINE GRID (MAIN CALENDAR MATRIX) */}
      <div data-reveal="rise" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">

        {/* LEFT COLUMN: THE CORE CHRONOLOGICAL TIMELINE PATH (col-span-12 lg:col-span-10) */}
        <div className="col-span-12 lg:col-span-10 space-y-8 md:space-y-16">
          <AnimatePresence mode="popLayout">
            {activeMonths.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-center py-24 border border-dashed border-moss/10 rounded-2xl bg-white"
              >
                <div className="text-stone/30 font-display font-black text-2xl mb-2" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  契合無効
                </div>
                <p className="text-stone/60 font-sans text-xs tracking-wide">
                  No matching spiritual assemblies found for your current alignment filters.
                </p>
              </motion.div>
            ) : (
              activeMonths.map((mNum) => {
                const monthInfo = POETIC_MONTHS[mNum] || { number: mNum, name: `Term ${mNum}`, wamei: "Seisaku", kanji: "祝", meaning: "Festivals" };
                const fList = festivalsGrouped[mNum] || [];
                const seasonInfo = SEASONS[mNum] || { kanji: "春", name: "Spring", color: "text-torii", bg: "bg-torii/5" };

                return (
                  <motion.div
                    key={mNum}
                    id={`month-section-${mNum}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-start relative border-l border-stone/15 pl-6 md:pl-10 ml-[18px] md:ml-[26px] pb-6 md:pb-12 scroll-mt-24"
                  >

                    {/* Minimal traditional red dot bullet on the timeline axis */}
                    <div className="absolute -left-[3px] top-[14px] w-1.5 h-1.5 rounded-full bg-torii z-10" />

                    {/* MONTH POETIC LANDMARK (TRADITIONAL JAPANESE VERTICAL SIDE TIMELINE - md:col-span-4) */}
                    <div className="md:col-span-4 col-span-12">

                      {/* CLEAN DESKTOP SIDE TIMELINE IN TRADITIONAL JAPANESE STYLE */}
                      <div className="hidden md:flex flex-col items-start sticky top-28 select-none py-1">
                        <span className="text-[22px] font-display font-light text-[#5c685f]/85 tracking-wide leading-none">
                          {monthInfo.wamei}
                        </span>

                        <div className="flex items-end gap-3.5 mt-3 mb-2.5">
                          <span
                            className="text-4xl lg:text-[46px] font-display font-bold text-[#1c1d1a] leading-none select-all"
                            style={{ fontFamily: "'Noto Serif JP', serif" }}
                          >
                            {monthInfo.kanji}
                          </span>
                          <span className="text-[10px] md:text-[11px] font-mono font-bold tracking-[0.18em] text-torii uppercase shrink-0 pb-1">
                            {monthInfo.name.toUpperCase()} ({monthInfo.number === 1 ? '1ST' : monthInfo.number === 2 ? '2ND' : monthInfo.number === 3 ? '3RD' : `${monthInfo.number}TH`})
                          </span>
                        </div>

                        <span className="text-[12.5px] font-display italic text-[#635f58]/80 leading-relaxed tracking-wider select-text">
                          “{monthInfo.meaning}”
                        </span>

                        {/* Traditional Season Tag */}
                        <div className={`mt-3 px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-widest uppercase inline-block border border-moss/5 self-start ${seasonInfo.bg} ${seasonInfo.color}`}>
                          {seasonInfo.kanji} • {seasonInfo.name.split(" • ")[1]}
                        </div>
                      </div>

                      {/* MOBILE EXCLUSIVE — typographic month landmark (mirrors desktop, compact) */}
                      <div className="md:hidden flex flex-col items-start w-full mb-4 select-none">
                        <div className="flex items-end justify-between w-full gap-2 mb-1.5">
                          <div className="flex items-end gap-2.5">
                            <span
                              className="text-[28px] font-display font-bold text-[#1c1d1a] leading-none"
                              style={{ fontFamily: "'Noto Serif JP', serif" }}
                            >
                              {monthInfo.kanji}
                            </span>
                            <div className="flex flex-col pb-0.5">
                              <span className="text-[12px] font-display font-light text-[#5c685f]/85 tracking-wide leading-none">
                                {monthInfo.wamei}
                              </span>
                              <span className="text-[8px] font-mono font-bold tracking-[0.18em] text-torii uppercase mt-1">
                                {monthInfo.name.toUpperCase()} ({monthInfo.number === 1 ? '1ST' : monthInfo.number === 2 ? '2ND' : monthInfo.number === 3 ? '3RD' : `${monthInfo.number}TH`})
                              </span>
                            </div>
                          </div>

                          <div className={`px-2 py-0.5 rounded text-[7.5px] font-mono font-bold tracking-widest uppercase inline-block border border-moss/5 shrink-0 ${seasonInfo.bg} ${seasonInfo.color}`}>
                            {seasonInfo.kanji} • {seasonInfo.name.split(" • ")[1]}
                          </div>
                        </div>

                        <span className="text-[10px] font-display italic text-[#635f58]/80 leading-relaxed tracking-wider">
                          “{monthInfo.meaning}”
                        </span>
                      </div>

                    </div>

                    {/* MONTH'S COMPILED LIST OF RITES (md:col-span-8) */}
                    <div className="md:col-span-8 col-span-12 space-y-6">
                      {fList.map((fest) => {
                        const isExpanded = !!expandedFestivals[fest.id];
                        const match = fest.name.match(/^(.*?)\s*\((.*?)\)$/);
                        const englishName = match ? match[1].trim() : fest.name;
                        const japaneseName = match ? match[2].trim() : "";

                        return (
                          <motion.div
                            key={fest.id}
                            layout="position"
                            whileHover={{
                              y: -4,
                              scale: 1.005,
                              boxShadow: "0 12px 24px -10px rgba(140, 42, 28, 0.08), 0 4px 12px -5px rgba(0, 0, 0, 0.03)"
                            }}
                            whileTap={{ scale: 0.995 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            onClick={(e) => toggleFestival(fest.id, e)}
                            className={`group wabi-sabi-card rounded-2xl overflow-hidden transition-all duration-300 border border-[#e5dfd3] hover:border-torii/40 hover:bg-white cursor-pointer ${
                              isExpanded ? "shadow-md bg-white" : "hover:shadow-3xs"
                            }`}
                          >

                            {/* Inner parchment dash frame */}
                            <div className="p-5 md:p-6 flex flex-col justify-between h-full select-none">

                              {/* Main Content Row */}
                              <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                                <div className="space-y-2 flex-1">

                                  {/* Festival Title Line */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="p-1 rounded-sm bg-sand border border-[#dfdbd2] flex items-center justify-center shrink-0">
                                        {getContextualIcon(fest.name, fest.meaning)}
                                      </div>
                                      <h4 className="text-base md:text-lg font-serif font-black text-stone group-hover:text-torii transition-colors leading-tight">
                                        {englishName} {japaneseName && <span className="text-stone/60 font-normal text-xs md:text-sm font-display-jp ml-1.5">({japaneseName})</span>}
                                      </h4>
                                    </div>
                                  </div>

                                  {/* Category Badge - moved here under name */}
                                  {fest.type.category && (
                                    <div className="pt-1 select-none">
                                      <span className={`inline-block text-[8.5px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-md font-bold border ${
                                        fest.type.category === "pilgrimage"
                                          ? "bg-torii/[0.03] text-torii-dark border-torii/15"
                                          : "bg-bamboo-light text-moss/90 border-bamboo/15"
                                      }`}>
                                        {fest.type.category === "pilgrimage" ? "深参密儀 • Pilgrimage" : "衆民観祭 • Public Festival"}
                                      </span>
                                    </div>
                                  )}

                                  {/* Interactive Host Shrine & Location Link */}
                                  <div className="inline-block pt-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openShrine(fest.shrine.slug);
                                      }}
                                      className="group/host flex items-center gap-1.5 text-[10.5px] text-[#5c685f] hover:text-torii transition-colors font-sans font-bold cursor-pointer"
                                    >
                                      <MapPin size={11} className="text-moss-light group-hover/host:text-torii transition-colors shrink-0" />
                                      <span className="underline decoration-torii/15 group-hover/host:decoration-torii/50">
                                        {fest.shrine.name} • {fest.shrine.location} ({fest.shrine.prefecture} Pref.)
                                      </span>
                                    </button>
                                  </div>

                                  {/* Compact Meaning / Intention — clamped to 3 lines when collapsed */}
                                  <p className={`text-stone/75 text-xs mt-3 leading-relaxed tracking-wider select-text ${isExpanded ? "whitespace-pre-line" : "line-clamp-3"}`}>
                                    {isExpanded ? fest.meaning : fest.meaning.split("\n\n")[0]}
                                  </p>

                                </div>

                              </div>

                              {/* ACCORDION TRIGGER - LITURGICAL CODEX EXPANSION */}
                              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#e5dfd3]/60 pt-4.5">
                                {/* Replace button "Open sacred scroll" with calendar date */}
                                <div className="flex items-center gap-2 text-stone/85 font-mono text-[11px] font-semibold bg-[#f5f2eb]/75 px-3 py-1.5 rounded-lg border border-[#e5dfd3]/50 hover:bg-[#f2eee3] transition-colors">
                                  <CalendarIcon size={13} className="text-torii" />
                                  <span className="whitespace-normal select-text text-left break-words max-w-[200px] md:max-w-[320px]">{fest.time}</span>
                                  <ChevronDown size={12} className={`transform transition-transform text-stone/40 duration-300 ml-1 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShrine(fest.shrine.slug);
                                  }}
                                  className="group/btn text-[10.5px] text-stone/80 hover:text-torii font-semibold font-sans tracking-wider flex items-center gap-1 cursor-pointer py-1"
                                >
                                  <span>Portal of Origin</span>
                                  <ArrowRight size={11} className="transform group-hover/btn:translate-x-1.5 transition-transform" />
                                </button>
                              </div>

                              {/* DETAILED RITUAL LITURGY DRAWER (Expanded vertically & entire card width) */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-[#e5dfd3] mt-5 pt-6 space-y-6 text-stone/90 text-xs">

                                      {/* Expanded event description entire card */}
                                      <div className="space-y-6">

                                        {/* Festival Origins */}
                                        {fest.origin && (
                                          <div>
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-moss-light flex items-center gap-1.5 mb-2 select-none">
                                              <Scroll size={11} className="text-torii/70" />
                                              Origins & Lore
                                            </span>
                                            <p className="text-[11.5px] leading-relaxed text-[#2c3e32] tracking-wide font-sans pl-3.5 border-l border-[#5e7f5a]/30 select-text">
                                              {fest.origin}
                                            </p>
                                          </div>
                                        )}

                                        {/* Liturgical Procession */}
                                        {fest.ritual && (
                                          <div>
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-moss-light flex items-center gap-1.5 mb-2 select-none">
                                              <Flame size={11} className="text-torii/70" />
                                              Ceremonies & Rituals
                                            </span>
                                            <p className="text-[11.5px] leading-relaxed text-[#2c3e32] tracking-wide font-sans pl-3.5 border-l border-[#5e7f5a]/30 select-text">
                                              {fest.ritual}
                                            </p>
                                          </div>
                                        )}

                                        {/* Ritual Aspiration & Prayer */}
                                        {fest.prayer && (
                                          <div>
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-moss-light flex items-center gap-1.5 mb-2 select-none">
                                              <BookOpen size={11} className="text-[#48624f]" />
                                              Prayers & Intentions
                                            </span>
                                            <p className="text-[11.5px] leading-relaxed text-stone/80 tracking-wide font-sans pl-3.5 border-l border-moss/15 select-text">
                                              {fest.prayer}
                                            </p>
                                          </div>
                                        )}

                                        {/* Pilgrim Protocol & Etiquette */}
                                        {fest.type.notes && (
                                          <div className="bg-torii/[0.02] border border-torii/15 rounded-xl p-4.5">
                                            <span className="text-[9px] font-mono font-black uppercase tracking-[0.15em] text-torii flex items-center gap-1.5 mb-2 select-none">
                                              <ShieldAlert size={12} className="text-torii" />
                                              Visitor Tips & Etiquette
                                            </span>
                                            <p className="text-[11px] leading-relaxed text-stone/85 tracking-wide font-sans select-text">
                                              {fest.type.notes}
                                            </p>
                                          </div>
                                        )}

                                      </div>

                                      {/* Bottom Roll Up Ribbon */}
                                      <div className="flex justify-end mt-4 pt-4 border-t border-[#e5dfd3]/60">
                                        <button
                                          onClick={(e) => toggleFestival(fest.id, e)}
                                          className="text-[9.5px] uppercase font-mono tracking-widest text-moss/80 hover:text-torii flex items-center gap-1 py-1 px-2.5 rounded hover:bg-sand/80 cursor-pointer transition-all"
                                        >
                                          <span>Close Sacred Scroll</span>
                                          <ChevronUp size={12} />
                                        </button>
                                      </div>

                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>

                          </motion.div>
                        );
                      })}
                    </div>

                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: STICKY LUNAR CHRONICLE INDEX (DESKTOP EXCLUSIVE RAIL) (col-span-2) */}
        <div className="hidden lg:block lg:col-span-2 sticky top-28 self-start">

          <div className="bg-white border border-[#e5dfd3] p-4.5 rounded-xl shadow-[2px_2px_10px_rgba(26,32,28,0.02)] relative group/rail">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-torii" />

            <span className="text-[9.5px] tracking-widest font-mono text-moss-light uppercase block text-center font-black mb-4 select-none">
              Solar Cycle Index
            </span>

            <div className="flex flex-col gap-2.5 relative z-10">
              {Object.keys(POETIC_MONTHS).map(Number).sort((a, b) => a - b).map(mNum => {
                const mInfo = POETIC_MONTHS[mNum];
                const isMonthActive = activeMonths.includes(mNum);
                return (
                  <button
                    key={mNum}
                    onClick={() => handleMonthClick(mNum)}
                    disabled={!isMonthActive}
                    className={`flex items-center gap-2 group w-full text-left transition-all duration-300 py-2 px-1 rounded-lg ${
                      isMonthActive
                        ? "hover:bg-sand/80 text-stone cursor-pointer"
                        : "opacity-25 cursor-not-allowed text-stone/40"
                    }`}
                  >
                    <span className="w-6 h-6 hanko-seal text-[11px] rounded-sm flex items-center justify-center font-black group-hover:bg-torii group-hover:text-sand transition-all shadow-3xs">
                      {mInfo.kanji[0]}
                    </span>
                    <div className="flex flex-col leading-none">
                      <span className="text-[11.5px] font-display font-black tracking-wider block">
                        {mInfo.wamei}
                      </span>
                      <span className="text-[7.5px] font-mono text-moss-light uppercase tracking-widest block mt-0.5 font-bold">
                        Month {mNum}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-torii" />
          </div>

          {/* Minimal design philosophy quote sticker below the index */}
          <div className="mt-4 p-3 border border-moss/5 rounded-lg bg-white/40 text-center text-[10px] text-stone/60 font-display italic leading-relaxed select-none">
            “The sun rises over the Eastern Torii; the term cycles and the seasons balance.”
          </div>

        </div>

      </div>

      {/* 6. INTERACTIVE MONTHLY GRID (GOOGLE CALENDAR STYLE MODAL) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isCalendarOpen && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-3 md:p-4" onClick={() => setIsCalendarOpen(false)}>
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#fcfbf9] border border-[#dfdbd2] w-full max-w-6xl rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto max-h-[92vh] md:max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <motion.div layout className="bg-sand/40 border-b border-[#e5dfd3] px-3.5 py-3 md:px-5 md:py-4 flex items-center justify-between gap-2 md:gap-4 shrink-0">
                  <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                    <div className="border border-torii/15 text-torii text-base md:text-xl font-display font-black px-2 py-1 md:px-2.5 md:py-1.5 rounded bg-white shadow-3xs shrink-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                      {POETIC_MONTHS[calendarMonth]?.kanji}
                    </div>
                    <div className="leading-tight min-w-0">
                      <h3 className="text-stone font-display text-sm md:text-base font-black flex items-baseline gap-1.5 min-w-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                        <span className="truncate">{POETIC_MONTHS[calendarMonth]?.wamei} ({POETIC_MONTHS[calendarMonth]?.name})</span>
                        <span className="text-[10px] md:text-xs font-mono font-medium text-stone/50 shrink-0">{calendarYear}</span>
                      </h3>
                      <p className="text-[10px] text-stone/60 font-display italic truncate">
                        “{POETIC_MONTHS[calendarMonth]?.meaning}”
                      </p>
                    </div>
                  </div>

                  {/* Right Header Group: Month Navigation Controls & Close button */}
                  <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    {/* Month Navigation Controls info */}
                    <div className="flex items-center gap-0.5 md:gap-1.5 bg-white border border-[#dfdbd2] p-0.5 md:p-1 rounded-lg md:rounded-xl shadow-3xs">
                      <button
                        onClick={() => {
                          if (calendarMonth === 1) {
                            setCalendarMonth(12);
                            setCalendarYear(prev => prev - 1);
                          } else {
                            setCalendarMonth(prev => prev - 1);
                          }
                        }}
                        className="p-1 md:p-1.5 hover:bg-sand rounded-md md:rounded-lg transition-colors cursor-pointer text-stone"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <span className="text-stone text-[9px] md:text-[10px] font-mono tracking-widest uppercase font-bold px-0.5 md:px-1 select-none w-7 md:w-8 text-center">
                        {POETIC_MONTHS[calendarMonth]?.name.substring(0, 3)}
                      </span>
                      <button
                        onClick={() => {
                          if (calendarMonth === 12) {
                            setCalendarMonth(1);
                            setCalendarYear(prev => prev + 1);
                          } else {
                            setCalendarMonth(prev => prev + 1);
                          }
                        }}
                        className="p-1 md:p-1.5 hover:bg-sand rounded-md md:rounded-lg transition-colors cursor-pointer text-stone"
                      >
                        <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setIsCalendarOpen(false)}
                      className="p-1.5 hover:bg-torii/5 hover:text-torii text-stone/40 border border-transparent hover:border-torii/10 rounded-xl transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>

                {/* Main Calendar Space: Left Grid & Right agenda column (Dual Layout) */}
                <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">

                  {/* 1. SEVEN COLUMN MONTH GRID */}
                  <div className="flex-1 flex flex-col overflow-visible md:overflow-y-auto border-r border-[#e5dfd3]">

                    {/* Calendar Days Header */}
                    <div className="grid grid-cols-7 border-b border-[#e5dfd3]/60 text-center font-mono text-[9px] md:text-[10px] tracking-widest uppercase font-bold text-moss/70 bg-sand/15 py-2 shrink-0">
                      <div>Sun (日)</div>
                      <div>Mon (月)</div>
                      <div>Tue (火)</div>
                      <div>Wed (水)</div>
                      <div>Thu (木)</div>
                      <div>Fri (金)</div>
                      <div>Sat (土)</div>
                    </div>

                    {/* Calendar Days Cells Grid */}
                    <div className="grid grid-cols-7 divide-x divide-y divide-[#e5dfd3]/40 bg-white">
                      {(() => {
                        const firstDayOfWeek = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                        const totalDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                        const totalDaysInPrevMonth = new Date(calendarYear, calendarMonth - 1, 0).getDate();

                        const cells = [];
                        // Prev Month Padding Days
                        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                          cells.push({
                            day: totalDaysInPrevMonth - i,
                            month: calendarMonth === 1 ? 12 : calendarMonth - 1,
                            year: calendarMonth === 1 ? calendarYear - 1 : calendarYear,
                            isCurrentMonth: false,
                          });
                        }
                        // Current Month Days
                        for (let d = 1; d <= totalDaysInMonth; d++) {
                          cells.push({
                            day: d,
                            month: calendarMonth,
                            year: calendarYear,
                            isCurrentMonth: true,
                          });
                        }
                        // Next Month Padding Days
                        const currentTotal = cells.length;
                        const paddingNeeded = currentTotal % 7 === 0 && currentTotal >= 35 ? 0 : 42 - currentTotal;
                        for (let d = 1; d <= paddingNeeded; d++) {
                          cells.push({
                            day: d,
                            month: calendarMonth === 12 ? 1 : calendarMonth + 1,
                            year: calendarMonth === 12 ? calendarYear + 1 : calendarYear,
                            isCurrentMonth: false,
                          });
                        }

                        return cells.map((cell, idx) => {
                          const cellEvents = linked.filter(fest => isFestivalOnDay(fest, cell.year, cell.month, cell.day));
                          const isToday = cell.day === today.day && cell.month === today.month && cell.year === today.year;
                          const isSelected = selectedDay && selectedDay.day === cell.day && selectedDay.month === cell.month && selectedDay.year === cell.year;

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedDay({ day: cell.day, month: cell.month, year: cell.year });
                                if (window.matchMedia("(max-width: 767.98px)").matches) {
                                  if (cellEvents.length > 0) {
                                    setMobileAgendaOpen(true);
                                    setTimeout(() => agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
                                  } else {
                                    setMobileAgendaOpen(false);
                                  }
                                }
                              }}
                              className={`aspect-square p-1.5 flex flex-col gap-1 transition-all cursor-pointer relative ${
                                cell.isCurrentMonth ? "bg-white" : "bg-[#faf8f5]/60 text-stone/35"
                              } ${
                                isSelected ? "ring-2 ring-torii/30 bg-torii/[0.01] z-10" : "hover:bg-sand/35"
                              }`}
                            >
                              {/* Day Header Row */}
                              <div className="flex items-center justify-between w-full select-none">
                                {isToday ? (
                                  <div className="bg-torii text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-3xs" title="Today">
                                    {cell.day}
                                  </div>
                                ) : (
                                  <span className={`text-[11px] font-mono font-bold ${cell.isCurrentMonth ? "text-stone" : "text-stone/30"}`}>
                                    {cell.day}
                                  </span>
                                )}

                                {cellEvents.length > 0 && cell.isCurrentMonth && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-torii" />
                                )}
                              </div>

                              {/* Event Listing Grid block (Google Calendar style) — hidden below md; the cell grows
                                  past its square floor to fit every festival on busy days */}
                              <div className="hidden md:block space-y-0.5 select-none">
                                {cell.isCurrentMonth && cellEvents.map((fest) => {
                                  const isPilgrimage = fest.type.category === "pilgrimage";
                                  return (
                                    <div
                                      key={fest.id}
                                      title={fest.name}
                                      className={`text-[8px] md:text-[9.5px] font-display font-bold truncate py-0.5 px-1 rounded border flex items-center gap-1 leading-none shadow-3xs hover:brightness-[0.98] transition-all ${
                                        isPilgrimage
                                          ? "bg-torii/[0.04] text-torii-dark border-torii/15"
                                          : "bg-bamboo-light text-moss border-bamboo/15"
                                      }`}
                                    >
                                      <span className="shrink-0 scale-75 md:scale-90">{getContextualIcon(fest.name, fest.meaning)}</span>
                                      <span className="truncate">{fest.name.split(" (")[0]}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                  </div>

                  {/* 2. CHOSEN DAY AGENDA ARCHIVE (御暦簿) — the title stays visible on mobile; the body below
                      animates open and is only expanded when a day with festivals is tapped */}
                  <div ref={agendaRef} className="flex w-full md:w-64 lg:w-80 bg-[#f7f5ef] flex-col shrink-0 min-h-0">

                    {/* Column Header */}
                    <div className="bg-sand/35 border-b border-[#e5dfd3] px-4.5 py-4 flex flex-col shrink-0 select-none">
                      <span className="text-[9px] font-mono tracking-widest uppercase font-black text-moss-light">
                        Liturgy Agenda • 御暦簿
                      </span>
                      <h4 className="text-stone font-display text-base font-black mt-1" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                        {selectedDay ? (
                          <>
                            {POETIC_MONTHS[selectedDay.month]?.name} {selectedDay.day}
                          </>
                        ) : "Select A Day"}
                      </h4>
                      {selectedDay && (
                        <span className="text-[10px] italic text-stone/60 mt-0.5">
                          <span className="font-display">{POETIC_MONTHS[selectedDay.month]?.wamei}</span>
                          {" "}(<span className="font-serif">{POETIC_MONTHS[selectedDay.month]?.kanji}</span>)
                        </span>
                      )}
                    </div>

                    {/* Body: events + footstamp — animates open/closed on mobile, static side panel on desktop */}
                    <AnimatePresence initial={false}>
                      {(!isMobile || mobileAgendaOpen) && (
                        <motion.div
                          key="agenda-body"
                          initial={isMobile ? { height: 0, opacity: 0 } : false}
                          animate={isMobile ? { height: "auto", opacity: 1 } : undefined}
                          exit={isMobile ? { height: 0, opacity: 0 } : undefined}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="flex flex-col md:flex-1 min-h-0 overflow-hidden"
                        >

                    {/* Scrolling Agenda Content */}
                    <div className="flex-1 overflow-y-auto p-4.5 space-y-4">
                      {(() => {
                        if (!selectedDay) return null;

                        const agendaEvents = linked.filter(fest =>
                          isFestivalOnDay(fest, selectedDay.year, selectedDay.month, selectedDay.day)
                        );

                        if (agendaEvents.length === 0) {
                          return (
                            <div className="text-center py-12 select-none">
                              <span className="text-[32px] font-display font-light text-stone/15 block" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                静
                              </span>
                              <h5 className="text-[11.5px] font-serif font-black text-stone/70 mt-2">
                                A Silent Devotion Coordinate
                              </h5>
                              <p className="text-stone/55 text-[11px] font-sans leading-relaxed tracking-wide mt-1.5">
                                No public assemblies or grand processions are scheduled for this date. The forest sanctuaries remain quiet, carrying whispers of eternal wind and stone. Perfect for mindful reflection.
                              </p>
                            </div>
                          );
                        }

                        return agendaEvents.map((fest) => {
                          const isPilgrimage = fest.type.category === "pilgrimage";
                          const match = fest.name.match(/^(.*?)\s*\((.*?)\)$/);
                          const englishName = match ? match[1].trim() : fest.name;
                          const japaneseName = match ? match[2].trim() : "";

                          return (
                            <motion.div
                              key={fest.id}
                              whileHover={{
                                y: -3,
                                scale: 1.015,
                                borderColor: "#8c2a1c",
                                boxShadow: "0 6px 16px rgba(140, 42, 28, 0.05)"
                              }}
                              whileTap={{ scale: 0.995 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              onClick={() => {
                                // 1. Set expanded and navigate to the host shrine
                                setExpandedFestivals(prev => ({ ...prev, [fest.id]: true }));
                                openShrine(fest.shrine.slug);
                                // 2. Close modal
                                setIsCalendarOpen(false);
                                // 3. Scroll after tiny timeout to permit modal transition to start closing
                                setTimeout(() => {
                                  const el = document.getElementById(`month-section-${selectedDay.month}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }
                                }, 150);
                              }}
                              className="bg-white border border-[#e5dfd3] p-4 rounded-xl shadow-3xs flex flex-col justify-between hover:border-torii/40 transition-all duration-300 cursor-pointer group/agenda relative overflow-hidden"
                            >
                              {/* Left border accent line on hover */}
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-torii opacity-0 group-hover/agenda:opacity-100 transition-opacity duration-300" />

                              <div className="space-y-3.5">
                                {/* Header Info Row (No thick backgrounds or borders) */}
                                <div className="flex items-center justify-between text-stone/50 font-mono text-[9px] font-bold tracking-widest uppercase">
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon size={10.5} className="text-torii/70 shrink-0" />
                                    <span>{fest.time}</span>
                                  </div>
                                  <span className="text-[8px] font-mono tracking-widest text-stone/60 uppercase flex items-center gap-1 shrink-0">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPilgrimage ? "bg-torii" : "bg-moss"}`} />
                                    {isPilgrimage ? "Pilgrimage" : "Public Event"}
                                  </span>
                                </div>

                                {/* Narrative Titles + Location (kept close together) */}
                                <div className="space-y-1.5">
                                  <h5 className="text-[13.5px] font-serif font-black text-stone leading-snug group-hover/agenda:text-torii transition-colors">
                                    {englishName}
                                    {japaneseName && (
                                      <span className="text-[11px] font-display-jp text-moss font-medium ml-1">({japaneseName})</span>
                                    )}
                                  </h5>

                                  {/* Clean Location Footer */}
                                  <div className="text-[10px] text-[#5c685f] font-sans flex flex-col gap-1">
                                    <div className="flex items-center gap-1 font-bold text-stone/80">
                                      <MapPin size={10} className="text-torii shrink-0" />
                                      <span className="truncate">{fest.shrine.name}</span>
                                    </div>
                                    <div className="text-[9px] text-stone/45 pl-3.5 font-mono tracking-wider leading-none">
                                      {fest.shrine.location}{fest.shrine.prefecture ? `, ${fest.shrine.prefecture}` : ""}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        });
                      })()}
                    </div>

                    {/* Footstamp */}
                    <div className="p-3 border-t border-[#e5dfd3] bg-white text-center text-[8.5px] font-mono text-stone/40 select-none">
                      *Alignments calculated for Solar Year {year}
                    </div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>

                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Admin Controls — floating pill, opens the occurrence editor */}
      {isAdmin && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 md:pb-5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
              Admin Controls
            </span>
            <span className="text-stone/25 font-mono select-none text-xs">|</span>
            <button
              onClick={() => setOccModalOpen(true)}
              className="group flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-moss hover:bg-moss/10 cursor-pointer"
            >
              <CalendarPlus size={12} />
              <span>Edit events</span>
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <OccurrenceModal
          open={occModalOpen}
          onClose={() => setOccModalOpen(false)}
          shrineOptions={shrineOptions}
          occurrenceSeed={occurrenceSeed ?? []}
          defaultYear={year}
          onSaved={() => {
            setOccModalOpen(false);
            router.refresh();
          }}
        />
      )}

    </div>
  );
}
