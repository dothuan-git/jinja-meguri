"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Compass,
  Crown,
  ExternalLink,
  FileText,
  Map,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { ShrineDetail } from "@/lib/types";
import ShrineImage from "@/components/ShrineImage";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import { getCategoryColor, getDeityTypeTextColor } from "@/lib/facetColors";
import { FESTIVAL_TYPE_LABEL, DEITY_TYPE_LABEL } from "@/lib/labels";

// Canonical compact chip style shared with the shrine listing (table + cards)
// so category and rank tags read identically across every view. Color classes
// come from lib/facetColors.
const CHIP = "text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border";

// One canonical class string per text role. Used by both PageBody and
// ModalBody so the same content reads identically in page and modal.
// Role split: serif = headings/quotes/lore · sans = informational prose
// · mono = labels/meta. Layout utilities (spacing, whitespace, select-*)
// stay inline at the call site, composed via template strings.
const typo = {
  eyebrow: "text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-moss-light",
  sectionTitle: "text-2xl font-serif font-black text-stone",
  subheading: "text-xl md:text-xl font-serif font-black text-stone leading-tight",
  subheadingSm: "text-sm md:text-base font-serif font-black text-stone leading-tight",
  fieldLabel: "text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50",
  prose: "text-xs md:text-sm font-sans text-stone/80 leading-relaxed text-justify",
  quote: "text-base font-quote italic text-stone/85 leading-relaxed border-l-2 border-torii/30 pl-4",
  lore: "text-xs md:text-sm font-quote italic text-stone/75 leading-relaxed border-l border-moss/20 pl-3.5",
  meta: "text-xs font-mono text-stone/50 tracking-wide",
} as const;

function primaryOf(shrine: ShrineDetail) {
  return shrine.deities.find((d) => d.is_primary) ?? shrine.deities[0] ?? null;
}
function companionsOf(shrine: ShrineDetail) {
  return shrine.deities.filter((d) => !d.is_primary);
}

// Adapts the ShrineDetail view model to the shape the ported front-end JSX consumes.
function toView(shrine: ShrineDetail) {
  const primary = primaryOf(shrine);
  return {
    slug: shrine.slug,
    name: shrine.name_en,
    japaneseName: shrine.name_ja ?? "",
    location: shrine.city ?? "",
    prefecture: shrine.prefecture,
    region: shrine.region,
    image: shrine.image_urls?.[0] ?? undefined,
    ranks: shrine.ranks.map((r) => r.name_en),
    prayerFocus: shrine.categories.map((c) => c.name_en),
    prayerFocusText: shrine.details?.prayer_focus ?? "",
    description: shrine.details?.description ?? "",
    quote: shrine.details?.quote ?? "",
    about: shrine.details?.history ?? "",
    bestTime: shrine.details?.best_time ?? "",
    primaryDeity: {
      name: primary?.name_en ?? "",
      japaneseName: primary?.name_ja ?? "",
      deityType: primary?.deity_type ?? "",
      titles: primary?.titles ?? [],
      canonicalLore: primary?.canonical_lore ?? "",
      regionalLore: primary?.regional_lore ?? "",
    },
    secondaryDeities: companionsOf(shrine).map((d) => ({
      name: d.name_en,
      japaneseName: d.name_ja ?? "",
      deityType: d.deity_type,
      titles: d.titles,
      regionalLore: d.regional_lore ?? "",
    })),
    festivals: shrine.festivals.map((f) => ({
      id: f.id,
      name: f.name_en,
      time: f.time_prose ?? "",
      meaning: f.meaning ?? "",
      ritual: f.ritual ?? "",
      prayer: f.prayer ?? "",
      type: {
        category: f.festival_type ?? "",
        notes: f.visitor_notes ?? "",
      },
    })),
    sources: shrine.sources.map((s) => s.title ?? s.url),
  };
}

type View = ReturnType<typeof toView>;

// Collapses a long lore passage to a preview with a "Read more" toggle.
// Truncation cuts after a whole number of words, preserving the original
// whitespace (newlines) so the preview keeps the passage's formatting.
function CollapsibleLore({
  text,
  className,
  collapsedWords = 260,
}: {
  text: string;
  className?: string;
  collapsedWords?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();

  let count = 0;
  let sliceEnd = trimmed.length;
  const wordRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = wordRe.exec(trimmed)) !== null) {
    count += 1;
    if (count === collapsedWords) {
      sliceEnd = match.index + match[0].length;
      break;
    }
  }

  if (sliceEnd >= trimmed.length) {
    return <p className={className}>{trimmed}</p>;
  }

  const preview = trimmed.slice(0, sliceEnd).replace(/[\s.,;:—-]+$/, "");

  return (
    <p className={className}>
      {expanded ? trimmed : <>{preview}… </>}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline whitespace-normal font-sans font-normal italic text-torii hover:text-torii-dark hover:underline underline-offset-2 transition-colors cursor-pointer"
      >
        {expanded ? "Read less" : "Read more"}
      </button>
    </p>
  );
}

export default function ShrineDetailView({
  shrine,
  variant,
}: {
  shrine: ShrineDetail;
  variant: "modal" | "page";
}) {
  if (variant === "modal") return <ModalBody view={toView(shrine)} />;
  return <PageBody view={toView(shrine)} />;
}

/* ===================================================================== */
/* PAGE VARIANT — 6-section editorial page (source: ShrineDetailPage)    */
/* ===================================================================== */

function PageBody({ view: shrine }: { view: View }) {
  const [activeSection, setActiveSection] = useState("overview");

  // Goshuin Stamp local interactive state
  const [stampReceived, setStampReceived] = useState<string | null>(null);

  // Scroll spy references
  const containerRef = useRef<HTMLDivElement>(null);
  // Scope the entrance reveal to the scroll container so every [data-reveal]
  // section animates in — not just the header. Scoping it to the header-only
  // ref left the six content sections stuck at the opacity:0 base style.
  useEntranceReveal(containerRef);
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    deities: useRef<HTMLDivElement>(null),
    chronicles: useRef<HTMLDivElement>(null),
    festivals: useRef<HTMLDivElement>(null),
    pilgrimage: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
  };

  // Load stamp relative to this shrine slug
  useEffect(() => {
    const savedStamp = localStorage.getItem(`jinja-goshuin-${shrine.slug}`);
    setStampReceived(savedStamp);

    // Dynamic reset scroll to top
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setActiveSection("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shrine.slug]);

  // Handle scroll to track progress & active tab
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    let currentSection = "overview";
    const buffer = 150;

    for (const key of Object.keys(sectionRefs)) {
      const secEl = sectionRefs[key as keyof typeof sectionRefs]?.current;
      if (secEl) {
        const rect = secEl.getBoundingClientRect();
        const containerRect = el.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;

        if (relativeTop <= buffer) {
          currentSection = key;
        }
      }
    }
    setActiveSection(currentSection);
  };

  const scrollToSection = (secId: string) => {
    const target = sectionRefs[secId as keyof typeof sectionRefs]?.current;
    if (target && containerRef.current) {
      const container = containerRef.current;
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top + container.scrollTop;

      container.scrollTo({
        top: relativeTop - 15,
        behavior: "smooth"
      });
      setActiveSection(secId);
    }
  };

  // Stamp Actions
  const handleReceiveStamp = () => {
    const nowString = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    localStorage.setItem(`jinja-goshuin-${shrine.slug}`, nowString);
    setStampReceived(nowString);
  };

  const handleClearStamp = () => {
    localStorage.removeItem(`jinja-goshuin-${shrine.slug}`);
    setStampReceived(null);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full flex-1 flex flex-col h-[calc(100vh-80px)] overflow-y-auto bg-transparent relative scroll-smooth pb-16"
    >
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 shrink-0 z-10">

        {/* Floating Minimal Navigation Bar */}
        <div data-reveal="fade-up" className="flex items-center justify-between mb-4 select-none">
          <Link
            id="back-button"
            href="/shrines"
            className="group flex items-center gap-2 py-1 text-stone/70 hover:text-torii text-xs tracking-widest uppercase font-bold font-sans transition-all duration-200"
          >
            <ArrowLeft size={13} className="text-stone/40 group-hover:-translate-x-1 transition-transform group-hover:text-torii" />
            <span>Return to Sanctuary List</span>
          </Link>

          <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono tracking-widest uppercase text-moss-light/85 font-semibold">
            <span>Sovereign Shrine Archives</span>
            <span className="w-1 h-1 rounded-full bg-torii/30" />
            <span>{shrine.region} Territories</span>
          </div>
        </div>

        {/* Cinematic Header Display (Borderless, natural merge) */}
        <div data-reveal="fade-up-blur" className="relative w-full rounded-2xl overflow-hidden shadow-xs aspect-[16/7] md:aspect-[21/7] bg-stone/5">
          <ShrineImage src={shrine.image} alt={shrine.name} shrineId={shrine.slug} prefecture={shrine.prefecture} nameJa={shrine.japaneseName} />
          <div className="absolute inset-0 bg-gradient-to-t from-stone/60 via-stone/5 to-transparent pointer-events-none" />

          {/* Elegant overlay vertical seal */}
          <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 text-white z-10 pointer-events-none">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] opacity-80 block mb-1">{shrine.prefecture} PREFECTURE</span>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-none text-white drop-shadow-xs select-text">
              {shrine.name}
            </h1>
          </div>

          <div
            className="absolute top-4 right-4 md:top-8 md:right-8 writing-mode-vertical text-white/20 text-xs md:text-sm lg:text-base font-serif tracking-[0.2em] font-medium uppercase pointer-events-none select-none"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {shrine.japaneseName}
          </div>
        </div>

        {/* Fast Facts Row (Subtle layout with typography blocks, no frames) */}
        <div data-reveal="fade-up" className="py-4 md:py-6 border-b border-moss/10 flex flex-col md:flex-row justify-between items-start gap-6 select-text">
          <div className="flex-1 space-y-2 max-w-2xl">
            <div className="flex flex-wrap gap-x-3 gap-y-1 select-none text-[9px] font-mono tracking-widest uppercase text-moss-light font-bold">
              {shrine.ranks.map((rank, i) => (
                <span key={rank} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="opacity-30">|</span>}
                  {rank === "Ise Grand Shrine" && <Crown size={10} className="text-torii" />}
                  <span>{rank}</span>
                </span>
              ))}
            </div>

            <h2 className="text-xl md:text-2xl font-serif font-black text-stone select-text">
              {shrine.japaneseName}{" "}
              <span className="text-xs font-sans tracking-widest font-normal text-stone/40 ml-1.5">
                ({[shrine.location, shrine.prefecture].filter(Boolean).join(", ") || "Japan"})
              </span>
            </h2>

            {shrine.quote && (
              <p className={typo.quote}>
                “{shrine.quote}”
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Main Responsive Storytelling Block (Minimal, floating sidebar navigation, white spacing) */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 mt-6 flex flex-col lg:flex-row gap-10 lg:gap-14 select-text">

        {/* Floating Sidebar Directory (Simple hover items, no borders, no boxes) */}
        <nav data-reveal="slide-left" className="w-full lg:w-48 shrink-0 lg:sticky lg:top-14 h-fit hidden lg:block select-none z-10">
          <span className="inline-block text-[10px] font-mono tracking-[0.15em] px-2 py-0.5 border-2 border-torii text-torii bg-torii/[0.04] rotate-[-2.5deg] mb-5 font-black uppercase rounded-xs shadow-[inset_0_0_1.5px_rgba(201,75,50,0.25)] select-none">
            FILE DIRECTORY
          </span>

          <ul className="space-y-1.5 font-sans">
            {[
              { id: "overview", label: "Sanctuary Blessing", kanji: "福" },
              { id: "deities", label: "Enshrined Pantheon", kanji: "神" },
              { id: "chronicles", label: "Historical Records", kanji: "史" },
              { id: "festivals", label: "Sacred Festivals", kanji: "祭" },
              { id: "pilgrimage", label: "Sacred Stamp", kanji: "印" },
              { id: "location", label: "Transit & Geography", kanji: "地" },
            ].map(sec => {
              const isActive = activeSection === sec.id;
              return (
                <li key={sec.id}>
                  <button
                    onClick={() => scrollToSection(sec.id)}
                    className={`text-xs tracking-wider transition-all duration-200 w-full text-left py-1.5 px-0.5 flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "text-stone font-bold translate-x-1"
                        : "text-stone/45 hover:text-stone/80"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-serif w-3 text-center ${isActive ? "text-torii font-bold" : "text-stone/30"}`}>{sec.kanji}</span>
                      <span>{sec.label}</span>
                    </span>
                    {isActive && <div className="w-1 h-1 rounded-full bg-torii" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Dynamic Progress Indicator next to Jinja Meguri Archive */}
          <div className="mt-10 flex gap-2 items-center select-none">
            {/* Elegant vertical active-progress sidebar bar */}
            <div className="w-[1.5px] h-11 bg-stone/10 relative rounded-full overflow-hidden shrink-0 self-stretch">
              <motion.div
                className="absolute top-0 left-0 right-0 bg-torii rounded-full"
                animate={{
                  height: activeSection === "overview" ? "16%" :
                          activeSection === "deities" ? "33%" :
                          activeSection === "chronicles" ? "50%" :
                          activeSection === "festivals" ? "66%" :
                          activeSection === "pilgrimage" ? "83%" : "100%"
                }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />
            </div>

            <div className="writing-mode-vertical py-1 text-left select-none">
              <span className="text-[8px] font-sans tracking-[0.25em] uppercase text-moss-light/85 font-black leading-none select-none">
                JINJA MEGURI ARCHIVE
              </span>
            </div>
          </div>
        </nav>

        {/* Flowing Text Canvas */}
        <div className="flex-1 min-w-0 space-y-12">

          {/* SECTION 1: OVERVIEW */}
          <section
            id="overview"
            ref={sectionRefs.overview}
            data-reveal="fade-up"
            className="relative scroll-mt-14 select-text"
          >
            {/* Soft backdrop watermark kanji decoration */}
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              福
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>福 — Chapter I</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Sanctuary Blessing
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                {shrine.prayerFocus.map((focus) => (
                  <span key={focus} className={`${CHIP} ${getCategoryColor(focus)}`}>
                    {focus}
                  </span>
                ))}
              </div>

              {/* Editorial styled highlight content text */}
              <div className={`${typo.quote} py-4 select-text`}>
                “{shrine.prayerFocusText}”
              </div>

              <p className={`${typo.prose} select-text`}>
                {shrine.description} Each pilgrimage to {shrine.name} reinforces the spiritual tie (en) between humanity and the subtle forces of nature, aligning ancestral customs with personal mindfulness.
              </p>
            </div>
          </section>

          {/* SECTION 2: ENSHRINED PANTHEON */}
          <section
            id="deities"
            ref={sectionRefs.deities}
            data-reveal="rise"
            className="relative scroll-mt-14 select-text"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              神
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>神 — Chapter II</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Enshrined Pantheon
                </h3>
              </div>

              <div className="space-y-6">

                {/* Primary Deity (Matches ShrineDetailModal beautiful card layout) */}
                <div className="bg-washi/70 hover:bg-washi transition-colors duration-300 rounded-2xl p-6 md:p-8 border border-moss/8 shadow-3xs space-y-5">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold bg-white border border-moss/10 px-2.5 py-0.5 rounded-full inline-block mb-2 select-none">
                      Primary Enshrined Spirit
                    </span>
                    <h4 className={typo.subheading}>
                      {shrine.primaryDeity.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-serif text-moss font-medium pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                        {shrine.primaryDeity.japaneseName}
                      </span>
                      <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(shrine.primaryDeity.deityType)}`}>
                        {DEITY_TYPE_LABEL[shrine.primaryDeity.deityType] ?? shrine.primaryDeity.deityType}
                      </span>
                    </div>
                  </div>

                  {/* Primary Deity Epithets */}
                  {shrine.primaryDeity.titles && shrine.primaryDeity.titles.length > 0 && (
                    <div className="pt-2 border-t border-moss/5 space-y-1">
                      <span className={`${typo.fieldLabel} block select-none`}>Divine Powers & Epithets</span>
                      <div className="flex flex-col gap-1 text-xs text-stone/60 font-sans font-medium">
                        {shrine.primaryDeity.titles.map((title, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                            <span className="w-1 h-1 rounded-full bg-torii/40 shrink-0 mt-1.5" />
                            <span>{title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Canonical Chronicle Lore text */}
                  <div className="space-y-2 pt-3 border-t border-moss/5">
                    <span className={`${typo.fieldLabel} block select-none`}>Canonical Chronicle</span>
                    <CollapsibleLore
                      text={shrine.primaryDeity.canonicalLore}
                      className={`${typo.prose} whitespace-pre-line`}
                    />
                  </div>

                  {/* Regional origins lore notes */}
                  {shrine.primaryDeity.regionalLore && (
                    <div className="pt-3 border-t border-dashed border-moss/10 space-y-1">
                      <span className={`${typo.fieldLabel} block select-none`}>Regional Lore & Sacred Origins</span>
                      <p className={`${typo.lore} text-justify whitespace-pre-line`}>
                        {shrine.primaryDeity.regionalLore}
                      </p>
                    </div>
                  )}
                </div>

                {/* Redesigned Secondary/Companion Deities Section based on user specification */}
                {shrine.secondaryDeities && shrine.secondaryDeities.length > 0 && (
                  <div className="pt-6 space-y-4">
                    <span className="text-[9px] font-mono tracking-widest text-stone/40 uppercase font-bold bg-stone/[0.02] border border-stone/10 px-2.5 py-0.5 rounded-full inline-block select-none">
                      Companion Spirits (配祀神)
                    </span>

                    <div className="bg-stone/[0.015] border border-stone/5 rounded-xl p-5 md:p-6 space-y-5">
                      {/* Name and titles aligned with main deity but significantly smaller */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shrine.secondaryDeities.map((deity, idx) => (
                          <div key={deity.name + idx} className="space-y-1.5 p-3.5 rounded-lg bg-white/30 border border-stone/5 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-1">
                              <span className={`${typo.fieldLabel} block select-none`}>
                                COMPANION SPIRIT
                              </span>
                              <h4 className="text-sm font-serif font-black text-stone leading-tight">
                                {deity.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-serif text-moss-light pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                  {deity.japaneseName}
                                </span>
                                <span className={`text-[9px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(deity.deityType)}`}>
                                  {DEITY_TYPE_LABEL[deity.deityType] ?? deity.deityType}
                                </span>
                              </div>
                            </div>

                            {/* Companion Deity Epithets in smaller subtle text */}
                            {deity.titles && deity.titles.length > 0 && (
                              <div className="pt-1.5 border-t border-stone/5">
                                <div className="flex flex-col gap-1 text-[10px] text-stone/50 font-sans leading-normal">
                                  {deity.titles.map((title, tIdx) => (
                                    <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                                      <span className="w-1 h-1 rounded-full bg-moss/20 shrink-0 mt-1.5" />
                                      <span>{title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Unified Single Lore for all Companion Deities */}
                      {shrine.secondaryDeities.some(d => d.regionalLore) && (
                        <div className="pt-4 border-t border-dashed border-stone/10 space-y-1">
                          <span className={`${typo.fieldLabel} block select-none`}>LORE & SANCTUARY RELATION</span>
                          <div className={`${typo.lore} text-justify space-y-2`}>
                            {shrine.secondaryDeities.map(d => d.regionalLore).filter(Boolean).map((lore, lIdx) => (
                              <p key={lIdx} className="whitespace-pre-line">{lore}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>

          {/* SECTION 3: SANCTUARY CHRONICLES */}
          <section
            id="chronicles"
            ref={sectionRefs.chronicles}
            data-reveal="fade-up"
            className="relative scroll-mt-14 select-text"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              史
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>史 — Chapter III</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Historical Records
                </h3>
              </div>

              {/* Dynamic Drop Cap stylings like a real book, letting text flow without boxes */}
              <div className="space-y-4 select-text">
                <p className={`${typo.prose} first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-torii first-letter:float-left first-letter:mr-2.5 first-letter:line-height-1`}>
                  {shrine.about}
                </p>
                <p className={`${typo.prose} pt-1`}>
                  The physical wood architecture itself reflects standard Jinja styling, resisting weather patterns through continuous Shikinen Sengu reconstructions or traditional conservation methods, preserving early structural wisdom for visitors to observe.
                </p>
              </div>

              {/* References citations segment */}
              {shrine.sources && shrine.sources.length > 0 && (
                <div className="pt-4 border-t border-stone/10 select-none">
                  <span className={`${typo.fieldLabel} block mb-1.5`}>HISTORICAL REFERENCES</span>
                  <div className={`${typo.meta} space-y-1 pl-0.5 select-text`}>
                    {shrine.sources.map(source => (
                      <div key={source} className="flex items-center gap-1.5">
                        <FileText size={11} className="text-torii/40 shrink-0" />
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 4: SACRED FESTIVALS */}
          <section
            id="festivals"
            ref={sectionRefs.festivals}
            data-reveal="rise"
            className="relative scroll-mt-14"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              祭
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>祭 — Chapter IV</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Sacred Festivals
                </h3>
              </div>

              {/* Festival listings - elegant box-free editorial design */}
              <div className="space-y-16">
                {shrine.festivals.map((fest, idx) => (
                  <div
                    key={fest.id}
                    className="group relative space-y-6 pt-8 border-t border-stone/10 first:border-t-0 first:pt-0 transition-all"
                  >
                    {/* Editorial Header */}
                    <div className="space-y-3">
                      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-stone/5 pb-2">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <span className="font-mono text-xs text-torii-dark font-bold tracking-widest select-none">
                            0{idx + 1} //
                          </span>
                          <h4 className={`${typo.subheading} tracking-wide select-text`}>
                            {fest.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono tracking-widest font-bold text-stone/50 uppercase select-none shrink-0">
                          <Calendar size={13} className="text-stone/40" />
                          <span>{fest.time}</span>
                        </div>
                      </div>

                      {/* Accent Metadata line */}
                      <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase font-bold text-stone/40 select-none">
                        <span>Ritual Type //</span>
                        <span className="text-torii-dark bg-torii/5 border border-torii/10 px-1.5 py-0.5 rounded-sm">
                          {FESTIVAL_TYPE_LABEL[fest.type.category] ?? fest.type.category}
                        </span>
                      </div>
                    </div>

                    {/* Main Narrative — flows beautifully as professional typography */}
                    <div className="space-y-4 text-justify select-text">
                      {fest.meaning.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx} className={typo.prose}>
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Ritual Sequence & Pilgrim Aspirations - Clean columns with accent left lines rather than cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                      <div className="space-y-2">
                        <h5 className={`${typo.eyebrow} flex items-center gap-2 select-none`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-moss-light/40"></span>
                          Ceremonies & Rituals
                        </h5>
                        <p className={`${typo.prose} pl-3.5 border-l border-stone/15 select-text`}>
                          {fest.ritual}
                        </p>
                      </div>

                      {fest.prayer && (
                        <div className="space-y-2">
                          <h5 className={`${typo.eyebrow} flex items-center gap-2 select-none`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-torii"></span>
                            Prayers & Intentions
                          </h5>
                          <p className={`${typo.lore} text-justify select-text`}>
                            {fest.prayer}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pilgrim Advisory - minimalist subtle card to separate it clearly as an instruction */}
                    <div className="bg-stone/5 px-4 py-3 border border-stone/10 rounded-sm flex items-start gap-2.5">
                      <Compass size={14} className="text-torii-dark/70 mt-0.5 shrink-0" />
                      <div>
                        <span className={`${typo.fieldLabel} block mb-1 select-none`}>
                          Visitor Tips & Etiquette
                        </span>
                        <p className={`${typo.prose} select-text`}>
                          {fest.type.notes}
                        </p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5: PILGRIM SEALS (ONLY THE INTERACTIVE GOSHUIN STAMP) */}
          <section
            id="pilgrimage"
            ref={sectionRefs.pilgrimage}
            data-reveal="stamp"
            className="relative scroll-mt-14 pt-2"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              印
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>印 — Chapter V</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Sacred Stamp
                </h3>
              </div>

              {/* 1. DYNAMIC GOSHUIN STAMP WITHOUT EXTRA TEXT AREAS */}
              <div className="py-4 border-b border-stone/10 space-y-4">
                <p className="text-xs text-stone/70 leading-relaxed font-sans">
                  A traditional vermillion ink imprint (御朱印) acting as official sacred receipt of your personal communion at {shrine.name}.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-8 pt-2">
                  {/* Visual representation of the stamp */}
                  <div className="relative w-40 h-56 bg-washi shadow-xs flex flex-col justify-between items-center p-3.5 border border-moss/10 rounded-xs select-none">
                    <div className="absolute inset-1.5 border border-dashed border-torii/10 pointer-events-none" />

                    <div className="text-[9px] font-mono text-stone/30 uppercase tracking-widest block font-bold">奉拝 (Worshiped)</div>

                    {stampReceived ? (
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center justify-center space-y-1.5 select-none"
                      >
                        {/* Vermilion Square Seal stamp */}
                        <div className="w-20 h-20 border-2 border-torii text-torii font-bold font-serif text-sm leading-relaxed tracking-wider flex items-center justify-center p-1 select-none flex-wrap rotate-[-2deg] shadow-[inset_0_0_2px_rgba(201,75,50,0.3)]">
                          <div className="text-center font-bold font-serif select-none" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                            {shrine.japaneseName.slice(0, 2)}
                            <br />
                            印
                          </div>
                        </div>
                        {/* Brushed Calligraphy style text overlay */}
                        <span className="text-[10px] tracking-wider font-serif font-bold text-stone/70">Worship Certified</span>
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center text-stone/10 select-none py-10">
                        {/* Unstamp Outline placeholder */}
                        <div className="w-20 h-20 border-2 border-dashed border-stone/15 text-stone/10 text-[8px] font-mono uppercase font-black flex items-center justify-center text-center p-1.5">
                          Unstamped
                        </div>
                      </div>
                    )}

                    <div className="text-[8px] font-mono text-center text-stone/50 tracking-wide select-none">
                      {stampReceived ? (
                        <>
                          <span className="text-torii font-bold block">Sacred Proof</span>
                          <span className="block font-sans [font-size:7px] mt-0.5">{stampReceived}</span>
                        </>
                      ) : (
                        <span>Stamp is empty</span>
                      )}
                    </div>
                  </div>

                  {/* Stamp buttons */}
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-stone/60 leading-relaxed text-left max-w-sm">
                      Affix your dated commemorative red-seal to mark your spiritual progress and respect to the kami.
                    </p>

                    <div className="flex flex-wrap gap-2 select-none">
                      {!stampReceived ? (
                        <button
                          onClick={handleReceiveStamp}
                          className="px-4 py-2 bg-torii hover:bg-torii-dark text-white rounded-lg text-[10px] font-bold tracking-widest uppercase shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer"
                        >
                          Affix Sacred Goshuin Seal
                        </button>
                      ) : (
                        <button
                          onClick={handleClearStamp}
                          className="px-3 py-1.5 border border-stone/20 hover:border-torii text-stone/65 hover:text-torii rounded-lg text-[9px] font-mono tracking-widest uppercase hover:bg-stone/5 transition-all shrink-0 cursor-pointer"
                        >
                          Reset Ink Seal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 6: GEOGRAPHY MAP */}
          <section
            id="location"
            ref={sectionRefs.location}
            data-reveal="rise"
            className="relative scroll-mt-14 pb-8"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              地
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>地 — Chapter VI</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Transit & Geography
                </h3>
              </div>

              <div className="space-y-2 select-text">
                <span className={`${typo.fieldLabel} block select-none`}>GEOGRAPHIC LANDMARKS</span>
                <p className={typo.prose}>
                  Nesting in the old-growth forests of {shrine.location}, {shrine.prefecture} Prefecture ({shrine.region} Region). Accessible via municipal transportation lines or national scenic routes. Recommended morning arrival for a peaceful and crisp mountain climate experience.
                </p>
              </div>

              {shrine.bestTime && (
                <div className="space-y-2 select-text">
                  <span className={`${typo.fieldLabel} block select-none`}>Best Time to Visit</span>
                  <p className={typo.prose}>
                    {shrine.bestTime}
                  </p>
                </div>
              )}

              {/* Seamless map window, border eliminated */}
              <div className="relative w-full h-72 rounded-xl overflow-hidden shadow-2xs bg-stone/5 border border-stone/10 group select-none">
                <iframe
                  className="w-full h-full border-0 absolute inset-0 transition-opacity filter saturate-75 hover:saturate-100"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(shrine.name + " " + shrine.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  title={`Geography chart of ${shrine.name}`}
                  loading="lazy"
                />
              </div>

              <div className="flex flex-wrap gap-2 select-none">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shrine.name + " " + shrine.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-stone hover:bg-torii text-white rounded-lg text-[10px] tracking-widest uppercase hover:shadow-xs transition-all inline-flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Map size={11} className="text-bamboo" />
                  <span>Open Route in Google Maps</span>
                  <ExternalLink size={10} className="opacity-70" />
                </a>
              </div>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}

/* ===================================================================== */
/* MODAL VARIANT — drawer content only (source: ShrineDetailModal);      */
/* the drawer shell + close header live in components/Modal.tsx          */
/* ===================================================================== */

function ModalBody({ view: shrine }: { view: View }) {
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(shrine.name + " " + shrine.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  // Group festivals so each festival type renders as a single combined card.
  const festivalGroups: { category: string; festivals: View["festivals"] }[] = [];
  for (const fest of shrine.festivals) {
    const group = festivalGroups.find((g) => g.category === fest.type.category);
    if (group) group.festivals.push(fest);
    else festivalGroups.push({ category: fest.type.category, festivals: [fest] });
  }

  return (
    <div className="select-text">

      {/* Full-bleed cover image */}
      <div className="relative h-48 sm:h-60 md:h-72 w-full shrink-0 bg-stone/5 border-b border-moss/10 overflow-hidden select-none">
        <ShrineImage src={shrine.image} alt={shrine.name} shrineId={shrine.slug} prefecture={shrine.prefecture} nameJa={shrine.japaneseName} />
      </div>

      <div className="px-6 md:px-10 py-7 space-y-9 pb-9">

        {/* Identity block */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-x-3 gap-y-1 select-none text-[9px] font-mono tracking-widest uppercase text-moss-light font-bold">
              {shrine.ranks.map((rank, i) => (
                <span key={rank} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="opacity-30">|</span>}
                  {rank === "Ise Grand Shrine" && <Crown size={10} className="text-torii" />}
                  <span>{rank}</span>
                </span>
              ))}
            </div>

            <div className="space-y-1">
              <h3 className="text-4xl sm:text-5xl lg:text-5xl font-serif font-black text-stone tracking-wide leading-tight">
                {shrine.name}
              </h3>
              <div className="text-lg md:text-xl font-serif text-torii-dark/95 tracking-widest" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {shrine.japaneseName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone">
            <MapPin size={14} className="text-torii shrink-0" />
            <span className="text-sm font-bold">{shrine.location}</span>
            <span className="text-xs text-stone/50">{shrine.prefecture} Prefecture · {shrine.region}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {shrine.prayerFocus.map(focus => (
              <span key={focus} className={`${CHIP} ${getCategoryColor(focus)}`}>
                {focus}
              </span>
            ))}
          </div>

          {shrine.quote && (
            <p className={typo.quote}>
              "{shrine.quote}"
            </p>
          )}
        </div>

        {/* Enshrined Pantheon */}
        <div className="space-y-5">
          <span className={`${typo.eyebrow} flex items-center gap-1.5 select-none`}>
            <Sparkles size={11} className="text-moss-light" /> Enshrined Pantheon
          </span>

          <div className="space-y-5">

            {/* Primary Deity */}
            <div className="bg-washi/70 hover:bg-white/80 rounded-2xl p-5 md:p-7 border border-moss/8 hover:shadow-3xs transition-all duration-300 space-y-5">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold bg-white border border-moss/10 px-2.5 py-0.5 rounded-full inline-block mb-2 select-none">
                  Primary Enshrined Spirit
                </span>
                <h4 className={typo.subheading}>{shrine.primaryDeity.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-serif text-moss font-medium pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                    {shrine.primaryDeity.japaneseName}
                  </span>
                  <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(shrine.primaryDeity.deityType)}`}>
                    {DEITY_TYPE_LABEL[shrine.primaryDeity.deityType] ?? shrine.primaryDeity.deityType}
                  </span>
                </div>
              </div>

              {shrine.primaryDeity.titles && shrine.primaryDeity.titles.length > 0 && (
                <div className="pt-2 border-t border-moss/5 space-y-1">
                  <span className={`${typo.fieldLabel} block select-none`}>Divine Powers & Epithets</span>
                  <div className="flex flex-col gap-1 text-xs text-stone/60 font-sans font-medium">
                    {shrine.primaryDeity.titles.map((title, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                        <span className="w-1 h-1 rounded-full bg-torii/40 shrink-0 mt-1.5" />
                        <span>{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shrine.primaryDeity.regionalLore && (
                <div className="pt-3 border-t border-dashed border-moss/10 space-y-1">
                  <span className={`${typo.fieldLabel} block select-none`}>Regional Lore & Sacred Origins</span>
                  <p className={`${typo.lore} text-justify whitespace-pre-line`}>
                    {shrine.primaryDeity.regionalLore}
                  </p>
                </div>
              )}
            </div>

            {/* Companion Deities */}
            {shrine.secondaryDeities && shrine.secondaryDeities.length > 0 && (
              <div className="space-y-4">
                <span className="text-[9px] font-mono tracking-widest text-stone/40 uppercase font-bold bg-stone/[0.02] border border-stone/10 px-2.5 py-0.5 rounded-full inline-block select-none">
                  Companion Spirits (配祀神)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {shrine.secondaryDeities.map((deity, idx) => (
                      <div key={deity.name + idx} className="space-y-1.5 p-3.5 rounded-lg bg-white/30 hover:bg-white/80 border border-stone/5 shadow-3xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-serif font-black text-stone leading-tight">{deity.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-serif text-moss-light pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                              {deity.japaneseName}
                            </span>
                            <span className={`text-[9px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(deity.deityType)}`}>
                              {DEITY_TYPE_LABEL[deity.deityType] ?? deity.deityType}
                            </span>
                          </div>
                        </div>
                        {deity.titles && deity.titles.length > 0 && (
                          <div className="pt-1.5 border-t border-stone/5">
                            <div className="flex flex-col gap-1 text-[10px] text-stone/50 font-sans leading-normal">
                              {deity.titles.map((title, tIdx) => (
                                <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                                  <span className="w-1 h-1 rounded-full bg-moss/20 shrink-0 mt-1.5" />
                                  <span>{title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Sacred Festivals */}
        <div className="space-y-5">
          <span className={`${typo.eyebrow} flex items-center gap-1.5 select-none`}>
            <Calendar size={11} className="text-moss-light" /> Sacred Festivals
          </span>

          <div className="grid grid-cols-1 gap-4">
            {festivalGroups.map(group => (
              <div key={group.category} className="bg-washi/50 hover:bg-white/80 rounded-2xl p-5 md:p-6 border border-moss/8 hover:shadow-3xs transition-all duration-300 space-y-5">

                <div className="flex items-center gap-2 pb-3 border-b border-moss/5">
                  <span className="text-[9px] text-moss-light bg-bamboo-light border border-bamboo/15 px-1.5 py-0.5 rounded uppercase font-mono font-bold leading-none select-none">
                    {FESTIVAL_TYPE_LABEL[group.category] ?? group.category}
                  </span>
                  <span className="text-[10px] font-mono text-stone/40 tracking-wide select-none">
                    {group.festivals.length} {group.festivals.length === 1 ? "rite" : "rites"}
                  </span>
                </div>

                <div className="space-y-5">
                  {group.festivals.map((fest, fIdx) => (
                    <div key={fest.id} className={`space-y-2.5 ${fIdx > 0 ? "pt-5 border-t border-dashed border-moss/10" : ""}`}>
                      <div className="flex items-center justify-between gap-2.5 flex-wrap">
                        <h5 className={typo.subheadingSm}>{fest.name}</h5>
                        <span className="px-3 py-1 bg-torii/5 text-torii text-[10px] font-mono font-black tracking-widest rounded-lg border border-torii/15 inline-block text-center select-none shrink-0">
                          {fest.time}
                        </span>
                      </div>
                      {fest.meaning && (
                        <div className={`${typo.prose} space-y-2.5`}>
                          {fest.meaning.split("\n\n").map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Transit & Geography */}
        <div className="space-y-5">
          <span className={`${typo.eyebrow} flex items-center gap-1.5 select-none`}>
            <Map size={11} className="text-moss-light" /> Transit & Geography
          </span>

          <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden shadow-2xs bg-stone/5 border border-moss/8 group">
            <iframe
              id="google-maps-embed-frame"
              className="w-full h-full border-0 absolute inset-0 transition-all duration-500 filter saturate-90 hover:saturate-100"
              src={mapEmbedUrl}
              title={`Geographical map of ${shrine.name}`}
              loading="lazy"
              allowFullScreen
            />
          </div>

          <a
            id="maps-deep-link-anchor"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shrine.name + " " + shrine.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 font-mono text-xs text-moss hover:text-torii font-bold uppercase tracking-widest border border-dashed border-moss/20 rounded-xl w-full hover:bg-stone/5 transition-all duration-200"
          >
            <Compass size={14} strokeWidth={2.4} />
            <span>Open Pilgrimage in Google Maps</span>
          </a>
        </div>

        {shrine.sources && shrine.sources.length > 0 && (
          <div className="pt-4 border-t border-moss/5 text-center sm:text-left">
            <span className={`${typo.fieldLabel} block mb-2 select-none`}>Historical References</span>
            <p className={`${typo.meta} leading-relaxed`}>
              {shrine.sources.join(" • ")}
            </p>
          </div>
        )}

      </div>

      {/* Deep-link to full page. Plain <a> so the intercepted modal route is replaced. */}
      <div className="sticky bottom-0 shrink-0 p-4 md:p-5 bg-sand border-t border-moss/10 flex gap-4 z-30 justify-center items-center bg-sand/95 backdrop-blur-md select-none">
        <a
          id="explore-chronicles-cta"
          href={`/shrines/${shrine.slug}`}
          className="flex-1 max-w-md py-3 text-center text-xs tracking-widest uppercase bg-stone hover:bg-torii rounded-xl font-black cursor-pointer shadow-md flex items-center justify-center gap-2 group transition-colors text-white hover:shadow-lg"
          style={{ minHeight: "44px" }}
        >
          <span>Explore Sanctuary Chronicles</span>
          <ArrowRight size={13} className="text-bamboo group-hover:text-white group-hover:translate-x-1 transition-all" />
        </a>
      </div>

    </div>
  );
}
