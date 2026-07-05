"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Compass,
  Crown,
  ExternalLink,
  FileText,
  Heart,
  Lock,
  Map,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ShrineDetail, EditCatalogs, Coordinates } from "@/lib/types";
import { useShrineMarks } from "@/components/user/useShrineMark";
import { buildEmbedUrl } from "@/lib/maps";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import ShrineImage from "@/components/ShrineImage";
import { useEntranceReveal } from "@/components/useEntranceReveal";
import {
  useShrineEdit,
  EditableText,
  EditableProse,
} from "@/components/shrineEdit/context";
import { EditableChips, EditableSources } from "@/components/shrineEdit/EditableCollections";
import HighlightsEditor from "@/components/shrineEdit/HighlightsEditor";
import LocationEditPopup from "@/components/shrineEdit/LocationEditPopup";
import DeleteShrinePopup from "@/components/shrineEdit/DeleteShrinePopup";

// Admin-only in-place editor; lazily loaded so its draft/toast/save chunk ships
// only when an admin actually enters edit mode, keeping the public bundle lean.
const ShrineEditProvider = dynamic(() => import("@/components/shrineEdit/ShrineEditProvider"), {
  ssr: false,
});

export interface ShrineDetailEditor {
  initialData: ShrineInput;
  catalogs: EditCatalogs;
  /** "create" mounts the editor immediately on an empty draft; default "update". */
  mode?: "create" | "update";
}

/** The signed-in viewer's collection state for this shrine (favorite + goshuin). */
export interface ShrineMarkInfo {
  saved: boolean;
  stamped: boolean;
  stampedAt: string | null;
}

function formatStampDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
import { getCategoryColor, getDeityTypeTextColor } from "@/lib/facetColors";
import { FESTIVAL_TYPE_LABEL, DEITY_TYPE_LABEL } from "@/lib/labels";
import { CHIP, typo } from "@/components/shrineEdit/detailStyles";
import DeityCreateEditor from "@/components/shrineEdit/DeityCreateEditor";
import FestivalCreateEditor from "@/components/shrineEdit/FestivalCreateEditor";
import FestivalBlock from "@/components/shrineEdit/FestivalBlock";

function primaryOf(shrine: ShrineDetail) {
  return shrine.deities.find((d) => d.is_primary) ?? shrine.deities[0] ?? null;
}
function companionsOf(shrine: ShrineDetail) {
  return shrine.deities.filter((d) => !d.is_primary);
}

function deityHref(nameJa: string) {
  return `/deities?deity=${encodeURIComponent(nameJa)}`;
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
    ranks: shrine.ranks.map((r) => r.name_en),
    prayerFocus: shrine.categories.map((c) => c.name_en),
    prayerFocusText: shrine.details?.prayer_focus ?? "",
    description: shrine.details?.description ?? "",
    quote: shrine.details?.quote ?? "",
    about: shrine.details?.history ?? "",
    bestTime: shrine.details?.best_time ?? "",
    geographicNotes: shrine.details?.geographic_notes ?? "",
    highlights: shrine.highlights,
    primaryDeity: {
      // Displayed name leads with the shrine's alternate (enshrined) name when set,
      // falling back to the canonical deity name.
      name: primary?.alter_name_en || primary?.name_en || "",
      japaneseName: primary?.alter_name_ja || primary?.name_ja || "",
      deityType: primary?.deity_type ?? "",
      titles: (primary?.alter_titles ?? primary?.titles) ?? [],
      canonicalLore: primary?.canonical_lore ?? "",
      regionalLore: primary?.regional_lore ?? "",
      // Raw alter values (for edit inputs) + canonical identity (shown as a subtitle
      // when an alter name is present, and used to locate the deity in the draft).
      alterNameEn: primary?.alter_name_en ?? "",
      alterNameJa: primary?.alter_name_ja ?? "",
      canonicalName: primary?.name_en ?? "",
      canonicalNameJa: primary?.name_ja ?? "",
      // Raw canonical titles (pre-fallback) — shown as reference next to the alter_titles editor.
      canonicalTitles: primary?.titles ?? [],
      hasAlter: Boolean(primary?.alter_name_en || primary?.alter_name_ja),
    },
    secondaryDeities: companionsOf(shrine).map((d) => ({
      name: d.alter_name_en || d.name_en,
      japaneseName: d.alter_name_ja || d.name_ja || "",
      deityType: d.deity_type,
      titles: d.alter_titles ?? d.titles,
      regionalLore: d.regional_lore ?? "",
      alterNameEn: d.alter_name_en ?? "",
      alterNameJa: d.alter_name_ja ?? "",
      canonicalName: d.name_en,
      canonicalNameJa: d.name_ja ?? "",
      hasAlter: Boolean(d.alter_name_en || d.alter_name_ja),
    })),
    festivals: shrine.festivals.map((f) => ({
      id: f.id,
      name: f.name_en,
      name_ja: f.name_ja ?? "",
      time: f.time_prose ?? "",
      origin: f.origin ?? "",
      meaning: f.meaning ?? "",
      ritual: f.ritual ?? "",
      prayer: f.prayer ?? "",
      type: {
        category: f.festival_type ?? "",
        notes: f.visitor_notes ?? "",
      },
    })),
    sources: shrine.sources.map((s) => ({ label: s.title ?? s.url, url: s.url })),
    coordinates: shrine.coordinates,
    address: shrine.address,
  };
}

type View = ReturnType<typeof toView>;

// Collapses a long lore passage with a "Read more"/"Show less" toggle on all screen sizes,
// clamped to 8 lines by default. whitespace-pre-line at the call site preserves newlines.
function CollapsibleLore({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <p className={`${className ?? ""} ${expanded ? "" : "line-clamp-[8]"}`}>
        {text.trim()}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-[10px] font-mono font-bold tracking-widest uppercase text-torii hover:text-torii/70 transition-colors"
      >
        {expanded ? "Show less ↑" : "Read more ↓"}
      </button>
    </>
  );
}

export default function ShrineDetailView({
  shrine,
  variant,
  editor,
  mark,
  isSignedIn = false,
}: {
  shrine: ShrineDetail;
  variant: "modal" | "page";
  editor?: ShrineDetailEditor;
  mark?: ShrineMarkInfo;
  isSignedIn?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const creating = editor?.mode === "create";

  if (variant === "modal")
    return <ModalBody view={toView(shrine)} mark={mark} isSignedIn={isSignedIn} />;

  // Create flow: mount the editor immediately on an empty draft (no read view).
  if (creating && editor) {
    return (
      <ShrineEditProvider
        initialData={editor.initialData}
        catalogs={editor.catalogs}
        mode="create"
        onCancel={() => { window.location.href = "/shrines"; }}
        onSaved={(savedSlug) => { window.location.href = `/shrines/${savedSlug}`; }}
      >
        <PageBody view={toView(shrine)} mark={mark} isSignedIn={isSignedIn} />
      </ShrineEditProvider>
    );
  }

  if (editing && editor) {
    return (
      <ShrineEditProvider
        initialData={editor.initialData}
        catalogs={editor.catalogs}
        mode="update"
        onCancel={() => setEditing(false)}
        onSaved={(savedSlug) => {
          setEditing(false);
          // Slug isn't editable in place; refresh re-runs the force-dynamic server
          // component to pull freshly-saved data into the read view.
          if (savedSlug !== shrine.slug) router.push(`/shrines/${savedSlug}`);
          else router.refresh();
        }}
      >
        <PageBody view={toView(shrine)} mark={mark} isSignedIn={isSignedIn} />
      </ShrineEditProvider>
    );
  }

  return (
    <PageBody
      view={toView(shrine)}
      canEdit={Boolean(editor)}
      onEdit={() => setEditing(true)}
      mark={mark}
      isSignedIn={isSignedIn}
    />
  );
}

/* ===================================================================== */
/* PAGE VARIANT — 6-section editorial page (source: ShrineDetailPage)    */
/* ===================================================================== */

function PageBody({
  view: shrine,
  canEdit,
  onEdit,
  mark,
  isSignedIn = false,
}: {
  view: View;
  canEdit?: boolean;
  onEdit?: () => void;
  mark?: ShrineMarkInfo;
  isSignedIn?: boolean;
}) {
  const [activeSection, setActiveSection] = useState("overview");

  // In-place edit API (null on the public/read path → every primitive is inert).
  const edit = useShrineEdit();
  const editing = Boolean(edit?.editing);
  const creating = edit?.mode === "create";
  // Locate the deity in the draft by its canonical kanji (the dedup key) — never the
  // displayed name, which may be the shrine's alternate (enshrined) name.
  const primaryDeityIndex = edit ? edit.findDeityIndex(shrine.primaryDeity.canonicalNameJa) : -1;

  // Draft-based companion management for update/edit mode.
  const draftDeities: ShrineInput["deities"] = (editing && !creating && edit)
    ? ((edit.getValue("deities") as ShrineInput["deities"]) ?? [])
    : [];
  const draftCompanionsWithIdx = draftDeities
    .map((d, i) => ({ d, globalIdx: i }))
    .filter(({ d }) => !d.is_primary);
  const deityOptions = edit?.catalogs.deities ?? [];
  const addDraftCompanion = () =>
    edit!.setValue("deities", [
      ...draftDeities,
      { name_ja: "", is_primary: false, sort_order: draftDeities.length, regional_lore: null, alter_name_en: null, alter_name_ja: null, alter_titles: null },
    ]);
  const removeDraftDeityAt = (globalIdx: number) =>
    edit!.setValue("deities", draftDeities.filter((_, i) => i !== globalIdx));
  const selectCompanionDeity = (globalIdx: number, deityId: string) => {
    const picked = deityOptions.find((o) => o.id === deityId);
    edit!.setValue("deities", draftDeities.map((d, i) =>
      i === globalIdx ? { ...d, name_ja: picked?.name_ja ?? "" } : d
    ));
  };

  const [locationPopupOpen, setLocationPopupOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // In edit mode, derive map coordinates from the live draft so Apply reflects immediately.
  const mapCoordinates = editing
    ? (edit?.getValue("coordinates") as Coordinates | null)
    : shrine.coordinates;

  // Per-user collection state (favorite + goshuin), server-backed + optimistic.
  const marks = useShrineMarks({
    saved: mark?.saved ? [shrine.slug] : [],
    stamped: mark?.stamped ? [shrine.slug] : [],
  });
  const isSaved = marks.isSaved(shrine.slug);
  const isStamped = marks.isStamped(shrine.slug);
  // Local display date for the stamp: seeded from the server, set client-side on a
  // fresh stamp (the toggle action returns only booleans, not the timestamp).
  const [stampDate, setStampDate] = useState<string | null>(mark?.stampedAt ?? null);

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

  // Reset scroll/section when navigating between shrines.
  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSection("overview");
  }, [shrine.slug]);

  // Handle scroll to track active section tab — keyed off window scroll
  const handleScroll = () => {
    let currentSection = "overview";
    const buffer = 150;

    for (const key of Object.keys(sectionRefs)) {
      const secEl = sectionRefs[key as keyof typeof sectionRefs]?.current;
      if (secEl && secEl.getBoundingClientRect().top <= buffer) {
        currentSection = key;
      }
    }
    setActiveSection(currentSection);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToSection = (secId: string) => {
    const target = sectionRefs[secId as keyof typeof sectionRefs]?.current;
    if (target) {
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 15,
        behavior: "smooth",
      });
      setActiveSection(secId);
    }
  };

  // Stamp Actions (server-backed via the optimistic marks hook)
  const handleReceiveStamp = () => {
    marks.toggleStamp(shrine.slug, shrine.name);
    setStampDate(new Date().toISOString());
  };

  const handleClearStamp = () => {
    marks.toggleStamp(shrine.slug, shrine.name);
    setStampDate(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 flex flex-col bg-transparent relative pb-16"
    >
      <div className="w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 shrink-0 z-10">

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
          <ShrineImage alt={shrine.name} shrineId={shrine.slug} prefecture={shrine.prefecture} nameJa={shrine.japaneseName} />
          <div className="absolute inset-0 bg-gradient-to-t from-stone/60 via-stone/5 to-transparent pointer-events-none" />

          {/* Elegant overlay vertical seal */}
          <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 text-white z-10 pointer-events-none">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] opacity-80 block mb-1">{shrine.prefecture} PREFECTURE</span>
            <EditableText
              path="name_en"
              ariaLabel="Shrine name (English)"
              placeholder="Shrine name (English)"
              editClassName="w-full max-w-2xl text-2xl md:text-4xl font-serif font-black tracking-tight leading-none text-white bg-stone/60 backdrop-blur-sm pointer-events-auto"
            >
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-none text-white drop-shadow-xs select-text">
                {shrine.name}
              </h1>
            </EditableText>
          </div>

          <div
            className="absolute top-4 right-4 md:top-8 md:right-8 writing-mode-vertical text-white/20 text-xs md:text-sm lg:text-base font-serif tracking-[0.2em] font-medium uppercase pointer-events-none select-none"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {shrine.japaneseName}
          </div>
        </div>

        {/* Fast Facts Row (Subtle layout with typography blocks, no frames) */}
        <div data-reveal="fade-up" className="py-4 md:py-6 border-b border-moss/10 select-text">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-start justify-between gap-3">
              <EditableChips kind="ranks" label="Ranks">
                <div className="flex flex-wrap gap-x-3 gap-y-1 select-none text-[9px] font-mono tracking-widest uppercase text-moss-light font-bold">
                  {shrine.ranks.map((rank, i) => (
                    <span key={rank} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="opacity-30">|</span>}
                      {rank === "Ise Grand Shrine" && <Crown size={10} className="text-torii" />}
                      <span>{rank}</span>
                    </span>
                  ))}
                </div>
              </EditableChips>
              {isSignedIn && !creating && (
                <button
                  onClick={() => marks.toggleSave(shrine.slug, shrine.name)}
                  disabled={marks.pending}
                  aria-pressed={isSaved}
                  title={isSaved ? "Remove from saved" : "Save to your list"}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-wait shrink-0 ${
                    isSaved ? "border-torii/40 text-torii" : "border-moss/20 text-stone/55 hover:border-torii/40 hover:text-torii"
                  }`}
                >
                  <Heart size={11} className={isSaved ? "fill-torii" : ""} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-serif font-black text-stone select-text">
              <EditableText
                path="name_ja"
                ariaLabel="Shrine name (Japanese)"
                placeholder="社名（漢字）"
                editClassName="w-64 max-w-full text-xl md:text-2xl font-serif font-black text-stone"
              >
                <>{shrine.japaneseName}</>
              </EditableText>{" "}
              <span className="text-xs font-sans tracking-widest font-normal text-stone/40 ml-1.5">
                {editing ? (
                  <>
                    (
                    <input
                      value={edit!.getField("city")}
                      onChange={(e) => edit!.setField("city", e.target.value)}
                      placeholder="City"
                      aria-label="City"
                      className="inline-block w-28 bg-torii/[0.04] outline-none border-b border-dashed border-torii/40 focus:border-torii rounded-sm px-1 text-xs font-sans"
                    />
                    {", "}
                    <select
                      value={edit!.getField("prefecture")}
                      onChange={(e) => {
                        const v = e.target.value;
                        // Keep region consistent: each prefecture belongs to one region.
                        const pref = edit!.catalogs.prefectures.find((p) => p.name_en === v);
                        edit!.setValue("prefecture", v);
                        edit!.setValue("region", pref?.region ?? "");
                      }}
                      aria-label="Prefecture"
                      className="inline-block bg-torii/[0.04] outline-none border-b border-dashed border-torii/40 focus:border-torii rounded-sm px-1 text-xs font-sans"
                    >
                      {creating && (
                        <option value="" disabled>
                          — prefecture —
                        </option>
                      )}
                      {edit!.catalogs.prefectures.map((p) => (
                        <option key={p.name_en} value={p.name_en}>
                          {p.name_en}
                        </option>
                      ))}
                    </select>
                    )
                  </>
                ) : (
                  `(${[shrine.location, shrine.prefecture].filter(Boolean).join(", ") || "Japan"})`
                )}
              </span>
            </h2>

            {editing && !creating && (
              <div className="flex items-center gap-1.5 select-none pointer-events-none">
                <Lock size={11} className="text-stone/35 shrink-0" />
                <span className="text-[10px] font-mono text-stone/40 tracking-wide">
                  URL slug: <span className="text-stone/60 font-semibold">{edit!.getValue("slug") as string}</span>
                </span>
              </div>
            )}

            {creating && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-stone/40 tracking-wide select-none">URL slug:</span>
                <input
                  value={edit!.getField("slug")}
                  onChange={(e) =>
                    // Slugs are lowercase letters, digits and hyphens only (contract regex).
                    edit!.setValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                  }
                  placeholder="my-shrine-name"
                  aria-label="URL slug"
                  className="w-56 max-w-full bg-torii/[0.04] outline-none border-b border-dashed border-torii/40 focus:border-torii rounded-sm px-1 text-[11px] font-mono text-stone/70"
                />
              </div>
            )}

            {(editing || shrine.quote) && (
              <EditableProse
                path="details.quote"
                rows={4}
                ariaLabel="Quote"
                placeholder="Short evocative quote…"
                editClassName="w-full text-base font-quote italic text-stone/85"
              >
                <p className={typo.quote}>
                  &#x201C;{shrine.quote}&#x201D;
                </p>
              </EditableProse>
            )}
          </div>
        </div>

      </div>

      {/* Main Responsive Storytelling Block (Minimal, floating sidebar navigation, white spacing) */}
      <div className="w-full md:w-[calc(100%-2.5rem)] max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-6 flex flex-col lg:flex-row gap-10 lg:gap-14 select-text">

        {/* Floating Sidebar Directory (Simple hover items, no borders, no boxes) */}
        <nav data-reveal="slide-left" className="w-full lg:w-48 shrink-0 lg:sticky lg:top-14 h-fit hidden lg:block select-none z-10">
          <span className="inline-block text-[10px] font-mono tracking-[0.15em] px-2 py-0.5 border-2 border-torii text-torii bg-torii/[0.04] rotate-[-2.5deg] mb-5 font-black uppercase rounded-xs shadow-[inset_0_0_1.5px_rgba(201,75,50,0.25)] select-none">
            FILE DIRECTORY
          </span>

          <ul className="space-y-1.5 font-sans">
            {[
              { id: "overview", label: "Sanctuary Portrait", kanji: "福" },
              { id: "deities", label: "Enshrined Pantheon", kanji: "神" },
              { id: "chronicles", label: "Historical Records", kanji: "史" },
              { id: "festivals", label: "Sacred Festivals", kanji: "祭" },
              { id: "pilgrimage", label: "Sacred Stamp", kanji: "印" },
              { id: "location", label: "Transit & Geography", kanji: "地" },
            ].filter((sec) => !creating || sec.id !== "pilgrimage").map(sec => {
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
        <div className="flex-1 min-w-0 space-y-14 md:space-y-18">

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

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>福 — Chapter I</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Sanctuary Portrait
                </h3>
              </div>

              <EditableChips kind="prayerCategories" label="Prayer categories">
                <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                  {shrine.prayerFocus.map((focus) => (
                    <span key={focus} className={`${CHIP} ${getCategoryColor(focus)}`}>
                      {focus}
                    </span>
                  ))}
                </div>
              </EditableChips>

              {/* Editorial styled highlight content text */}
              <EditableProse
                path="details.prayer_focus"
                rows={4}
                ariaLabel="Prayer focus"
                placeholder="What this shrine is prayed to for…"
                editClassName="w-full text-base font-quote italic text-stone/85"
              >
                <div className={`${typo.quote} py-4 select-text`}>
                  &#x201C;{shrine.prayerFocusText}&#x201D;
                </div>
              </EditableProse>

              <p className={`${typo.prose} select-text`}>
                <EditableProse
                  path="details.description"
                  rows={7}
                  ariaLabel="Description"
                  placeholder="Why visit — the shrine's draw and atmosphere…"
                  editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
                >
                  <>{shrine.description}</>
                </EditableProse>{" "}
              </p>

              <HighlightsEditor highlights={shrine.highlights} />
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

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>神 — Chapter II</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Enshrined Pantheon
                </h3>
              </div>

              <div className="space-y-6">

                {creating ? (
                  <DeityCreateEditor />
                ) : (
                <>
                {/* Primary Deity (Matches ShrineDetailModal beautiful card layout) */}
                <div className="bg-washi/70 hover:bg-washi transition-colors duration-300 rounded-2xl p-6 md:p-8 border border-moss/8 shadow-3xs space-y-5">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold bg-white border border-moss/10 px-2.5 py-0.5 rounded-full inline-block mb-2 select-none">
                      Primary Enshrined Spirit
                    </span>
                    <EditableText
                      path={`deities.${primaryDeityIndex}.alter_name_en`}
                      ariaLabel="Primary deity enshrined (alternate) romaji name"
                      placeholder={shrine.primaryDeity.canonicalName || "Enshrined name (romaji)"}
                      editClassName={`${typo.subheading} w-full`}
                    >
                      <h4 className={typo.subheading}>
                        <Link href={deityHref(shrine.primaryDeity.canonicalNameJa)} className="transition-colors hover:text-torii">
                          {shrine.primaryDeity.name}
                        </Link>
                      </h4>
                    </EditableText>
                    <div className="flex items-center gap-2 mt-1">
                      <EditableText
                        path={`deities.${primaryDeityIndex}.alter_name_ja`}
                        ariaLabel="Primary deity enshrined (alternate) kanji name"
                        placeholder={shrine.primaryDeity.canonicalNameJa || "別名 (kanji)"}
                        editClassName="text-xs font-serif text-moss font-medium"
                      >
                        <span className="text-xs font-serif text-moss font-medium pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                          {shrine.primaryDeity.japaneseName}
                        </span>
                      </EditableText>
                      <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(shrine.primaryDeity.deityType)}`}>
                        {DEITY_TYPE_LABEL[shrine.primaryDeity.deityType] ?? shrine.primaryDeity.deityType}
                      </span>
                    </div>
                    {(editing || shrine.primaryDeity.hasAlter) && (
                      <p className="mt-1.5 text-[10px] font-mono tracking-wide text-stone/40 select-none">
                        Enshrined form of {shrine.primaryDeity.canonicalName}
                        {shrine.primaryDeity.canonicalNameJa ? ` (${shrine.primaryDeity.canonicalNameJa})` : ""}
                      </p>
                    )}
                  </div>

                  {/* Primary Deity Epithets */}
                  {editing ? (
                    primaryDeityIndex >= 0 && (
                      <div className="pt-2 border-t border-moss/5 space-y-2">
                        {shrine.primaryDeity.canonicalTitles.length > 0 && (
                          <div className="space-y-1">
                            <span className={`${typo.fieldLabel} block select-none`}>Canonical Divine Powers & Epithets</span>
                            <div className="flex flex-col gap-1 text-xs text-stone/60 font-sans font-medium">
                              {shrine.primaryDeity.canonicalTitles.map((title, tIdx) => (
                                <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                                  <span className="w-1 h-1 rounded-full bg-torii/40 shrink-0 mt-1.5" />
                                  <span>{title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <label className="space-y-1 block">
                          <span className={`${typo.fieldLabel} block select-none`}>Alternate titles for this shrine (one per line, optional)</span>
                          <textarea
                            value={((edit!.getValue(`deities.${primaryDeityIndex}.alter_titles`) as string[] | null) ?? []).join("\n")}
                            onChange={(e) =>
                              edit!.setValue(
                                `deities.${primaryDeityIndex}.alter_titles`,
                                e.target.value.trim() === "" ? null : e.target.value.split("\n"),
                              )
                            }
                            rows={2}
                            placeholder="Leave blank to use the deity's canonical titles"
                            aria-label="Primary deity alternate titles"
                            className="block w-full bg-torii/[0.04] outline-none border border-dashed border-torii/30 focus:border-torii rounded-md p-2 resize-y text-xs font-sans"
                          />
                        </label>
                      </div>
                    )
                  ) : (
                    shrine.primaryDeity.titles && shrine.primaryDeity.titles.length > 0 && (
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
                    )
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
                  {(editing ? primaryDeityIndex >= 0 : Boolean(shrine.primaryDeity.regionalLore)) && (
                    <div className="pt-3 border-t border-dashed border-moss/10 space-y-1">
                      <span className={`${typo.fieldLabel} block select-none`}>Regional Lore & Sacred Origins</span>
                      <EditableProse
                        path={`deities.${primaryDeityIndex}.regional_lore`}
                        rows={5}
                        ariaLabel="Primary deity regional lore"
                        placeholder="Regional lore & sacred origins for this deity here…"
                        editClassName="w-full text-xs md:text-sm font-quote italic text-stone/75"
                      >
                        <p className={`${typo.lore} text-justify whitespace-pre-line`}>
                          {shrine.primaryDeity.regionalLore}
                        </p>
                      </EditableProse>
                    </div>
                  )}
                </div>

                {/* Secondary/Companion Deities Section */}
                {(shrine.secondaryDeities.length > 0 || (editing && !creating)) && (
                  <div className="pt-1 md:pt-2 space-y-4">
                    <span className="text-[9px] font-mono tracking-widest text-stone/40 uppercase font-bold bg-stone/[0.02] border border-stone/10 px-2.5 py-0.5 rounded-full inline-block select-none">
                      Companion Spirits (配祀神)
                    </span>

                    <div className="bg-stone/[0.015] border border-stone/5 rounded-xl p-5 md:p-6 space-y-5">
                      {/* Cards grid — driven by draft in edit mode, view model in read mode */}
                      {(editing && !creating ? draftCompanionsWithIdx.length > 0 : shrine.secondaryDeities.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {editing && !creating ? (
                            draftCompanionsWithIdx.map(({ d, globalIdx }) => {
                              const catalogDeity = d.name_ja ? deityOptions.find((o) => o.name_ja === d.name_ja) : undefined;
                              const selectValue = catalogDeity?.id ?? "";
                              return (
                                <div key={globalIdx} className="space-y-2.5 p-3.5 rounded-lg bg-white/30 border border-stone/5 shadow-3xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`${typo.fieldLabel} select-none`}>COMPANION SPIRIT</span>
                                    <button
                                      type="button"
                                      onClick={() => removeDraftDeityAt(globalIdx)}
                                      className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-500 hover:text-red-700"
                                    >
                                      <X size={12} /> Remove
                                    </button>
                                  </div>
                                  <select
                                    value={selectValue}
                                    onChange={(e) => selectCompanionDeity(globalIdx, e.target.value)}
                                    aria-label={`Companion deity ${globalIdx + 1}`}
                                    className="bg-torii/[0.04] outline-none rounded-sm border border-dashed border-torii/40 focus:border-torii px-1.5 py-1 text-xs w-full"
                                  >
                                    <option value="">— select a deity —</option>
                                    {deityOptions.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.name_en}{o.name_ja ? ` (${o.name_ja})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                  {d.name_ja && (
                                    <div className="space-y-1.5">
                                      {catalogDeity && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-serif text-moss-light pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                            {catalogDeity.name_ja}
                                          </span>
                                          <span className={`text-[9px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(catalogDeity.deity_type)}`}>
                                            {DEITY_TYPE_LABEL[catalogDeity.deity_type] ?? catalogDeity.deity_type}
                                          </span>
                                        </div>
                                      )}
                                      <input
                                        value={edit!.getField(`deities.${globalIdx}.alter_name_en`)}
                                        onChange={(e) => edit!.setField(`deities.${globalIdx}.alter_name_en`, e.target.value)}
                                        placeholder={catalogDeity?.name_en ?? "Enshrined name (romaji)"}
                                        aria-label="Companion deity enshrined name (romaji)"
                                        className="bg-torii/[0.04] outline-none rounded-sm border-b border-dashed border-torii/40 focus:border-torii px-1 text-sm w-full placeholder:text-stone/30"
                                      />
                                      <input
                                        value={edit!.getField(`deities.${globalIdx}.alter_name_ja`)}
                                        onChange={(e) => edit!.setField(`deities.${globalIdx}.alter_name_ja`, e.target.value)}
                                        placeholder={catalogDeity?.name_ja ?? "別名 (kanji)"}
                                        aria-label="Companion deity enshrined name (kanji)"
                                        className="bg-torii/[0.04] outline-none rounded-sm border-b border-dashed border-torii/40 focus:border-torii px-1 text-xs font-serif w-full placeholder:text-stone/30"
                                      />
                                      {catalogDeity?.titles && catalogDeity.titles.length > 0 && (
                                        <div className="pt-1.5 border-t border-stone/5">
                                          <div className="flex flex-col gap-1 text-[10px] text-stone/50 font-sans leading-normal">
                                            {catalogDeity.titles.slice(0, 2).map((title, tIdx) => (
                                              <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                                                <span className="w-1 h-1 rounded-full bg-moss/20 shrink-0 mt-1.5" />
                                                <span>{title}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <textarea
                                        value={((edit!.getValue(`deities.${globalIdx}.alter_titles`) as string[] | null) ?? []).join("\n")}
                                        onChange={(e) =>
                                          edit!.setValue(
                                            `deities.${globalIdx}.alter_titles`,
                                            e.target.value.trim() === "" ? null : e.target.value.split("\n"),
                                          )
                                        }
                                        rows={2}
                                        placeholder="Alternate titles for this shrine (optional)"
                                        aria-label="Companion deity alternate titles"
                                        className="block w-full bg-torii/[0.04] outline-none border-t border-dashed border-stone/10 pt-1.5 text-[10px] font-sans resize-y placeholder:text-stone/30"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            shrine.secondaryDeities.map((deity, idx) => (
                              <div key={deity.canonicalNameJa + idx} className="space-y-1.5 p-3.5 rounded-lg bg-white/30 border border-stone/5 shadow-3xs flex flex-col justify-between">
                                <div className="space-y-1">
                                  <span className={`${typo.fieldLabel} block select-none`}>
                                    COMPANION SPIRIT
                                  </span>
                                  <h4 className="text-sm font-serif font-black text-stone leading-tight">
                                    <Link href={deityHref(deity.canonicalNameJa)} className="transition-colors hover:text-torii">
                                      {deity.name}
                                    </Link>
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-serif text-moss-light pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                      {deity.japaneseName}
                                    </span>
                                    <span className={`text-[9px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(deity.deityType)}`}>
                                      {DEITY_TYPE_LABEL[deity.deityType] ?? deity.deityType}
                                    </span>
                                  </div>
                                  {deity.hasAlter && (
                                    <p className="text-[9px] font-mono tracking-wide text-stone/40 select-none">
                                      Enshrined form of {deity.canonicalName}
                                      {deity.canonicalNameJa ? ` (${deity.canonicalNameJa})` : ""}
                                    </p>
                                  )}
                                </div>
                                {deity.titles && deity.titles.length > 0 && (
                                  <div className="pt-1.5 border-t border-stone/5">
                                    <div className="flex flex-col gap-1 text-[10px] text-stone/50 font-sans leading-normal">
                                      {deity.titles.slice(0, 2).map((title, tIdx) => (
                                        <div key={tIdx} className="flex items-start gap-1.5 leading-snug">
                                          <span className="w-1 h-1 rounded-full bg-moss/20 shrink-0 mt-1.5" />
                                          <span>{title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Add companion button — only in edit mode */}
                      {editing && !creating && (
                        <button
                          type="button"
                          onClick={addDraftCompanion}
                          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-torii/40 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-torii transition-colors hover:bg-torii/5"
                        >
                          <Plus size={13} /> Add companion deity
                        </button>
                      )}

                      {/* Lore section */}
                      {editing && !creating ? (
                        draftCompanionsWithIdx.length > 0 && (
                          <div className="pt-4 border-t border-dashed border-stone/10 space-y-3">
                            <span className={`${typo.fieldLabel} block select-none`}>LORE & SANCTUARY RELATION</span>
                            {draftCompanionsWithIdx.map(({ d, globalIdx }) => {
                              const label = deityOptions.find((o) => o.name_ja === d.name_ja)?.name_en ?? d.name_ja;
                              return (
                                <div key={globalIdx} className="space-y-1">
                                  <span className="text-[10px] font-serif text-stone/60 block">
                                    {label}{d.name_ja ? ` (${d.name_ja})` : ""}
                                  </span>
                                  <textarea
                                    value={edit!.getField(`deities.${globalIdx}.regional_lore`)}
                                    onChange={(e) => edit!.setField(`deities.${globalIdx}.regional_lore`, e.target.value)}
                                    rows={4}
                                    placeholder="Regional lore for this companion deity…"
                                    aria-label={`Regional lore for ${label}`}
                                    className="block w-full bg-torii/[0.03] outline-none border border-dashed border-torii/30 focus:border-torii rounded-md p-2 resize-y text-xs md:text-sm font-quote italic text-stone/75"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        shrine.secondaryDeities.some(d => d.regionalLore) && (
                          <div className="pt-4 border-t border-dashed border-stone/10 space-y-3">
                            <span className={`${typo.fieldLabel} block select-none`}>LORE & SANCTUARY RELATION</span>
                            {shrine.secondaryDeities.filter(d => d.regionalLore).map((deity, lIdx) => (
                              <div key={lIdx} className="space-y-1">
                                <span className="text-[10px] font-mono tracking-wide text-stone/60 block">
                                  {deity.name}{deity.japaneseName ? ` (${deity.japaneseName})` : ""}
                                </span>
                                <p className={`${typo.lore} text-justify whitespace-pre-line`}>{deity.regionalLore}</p>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                </>
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

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>史 — Chapter III</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Historical Records
                </h3>
              </div>

              {/* Dynamic Drop Cap stylings like a real book, letting text flow without boxes */}
              <div className="space-y-4 select-text">
                <EditableProse
                  path="details.history"
                  rows={10}
                  ariaLabel="History"
                  placeholder="Historical background of the shrine…"
                  editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
                >
                  <p className={`${typo.prose} whitespace-pre-line first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-torii first-letter:float-left first-letter:mr-2.5 first-letter:line-height-1`}>
                    {shrine.about}
                  </p>
                </EditableProse>
              </div>

              {/* References citations segment */}
              {(editing || (shrine.sources && shrine.sources.length > 0)) && (
                <div className="pt-4 select-none">
                  <span className={`${typo.fieldLabel} block mb-1.5`}>HISTORICAL REFERENCES</span>
                  <EditableSources>
                    <div className={`${typo.meta} space-y-1 pl-0.5 select-text`}>
                      {shrine.sources.map(source => (
                        <div key={source.url} className="flex items-center gap-1.5">
                          <FileText size={11} className="text-torii/40 shrink-0" />
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-torii transition-colors">{source.label}</a>
                        </div>
                      ))}
                    </div>
                  </EditableSources>
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

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>祭 — Chapter IV</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Sacred Festivals
                </h3>
              </div>

              {/* Festival listings - elegant box-free editorial design */}
              <div className="space-y-6 md:space-y-16">
                {editing ? (
                  <FestivalCreateEditor />
                ) : (
                  shrine.festivals.map((fest, idx) => (
                    <FestivalBlock key={fest.id} fest={fest} idx={idx} />
                  ))
                )}
              </div>
            </div>
          </section>

          {/* SECTION 5: PILGRIM SEALS (ONLY THE INTERACTIVE GOSHUIN STAMP) — n/a for an unsaved new shrine */}
          {!creating && (
          <section
            id="pilgrimage"
            ref={sectionRefs.pilgrimage}
            data-reveal="stamp"
            className="relative scroll-mt-14"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              印
            </div>

            <div className="space-y-4 md:space-y-6">
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

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 pt-2">
                  {/* Visual representation of the stamp */}
                  <div className="relative w-40 h-56 bg-washi shadow-xs flex flex-col justify-between items-center p-3.5 border border-moss/10 rounded-xs select-none">
                    <div className="absolute inset-1.5 border border-dashed border-torii/10 pointer-events-none" />

                    <div className="text-[9px] font-mono text-stone/30 uppercase tracking-widest block font-bold">奉拝 (Worshiped)</div>

                    {isStamped ? (
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
                      {isStamped ? (
                        <>
                          <span className="text-torii font-bold block">Sacred Proof</span>
                          {stampDate && (
                            <span className="block font-sans [font-size:7px] mt-0.5">{formatStampDate(stampDate)}</span>
                          )}
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
                      {!isSignedIn ? (
                        <Link
                          href="/sign-in"
                          className="px-4 py-2 bg-torii hover:bg-torii-dark text-white rounded-lg text-[10px] font-bold tracking-widest uppercase shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer"
                        >
                          Sign in to collect your goshuin
                        </Link>
                      ) : !isStamped ? (
                        <button
                          onClick={handleReceiveStamp}
                          disabled={marks.pending}
                          className="px-4 py-2 bg-torii hover:bg-torii-dark text-white rounded-lg text-[10px] font-bold tracking-widest uppercase shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          Affix Sacred Goshuin Seal
                        </button>
                      ) : (
                        <button
                          onClick={handleClearStamp}
                          disabled={marks.pending}
                          className="px-3 py-1.5 border border-stone/20 hover:border-torii text-stone/65 hover:text-torii rounded-lg text-[9px] font-mono tracking-widest uppercase hover:bg-stone/5 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
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
          )}

          {/* SECTION 6: GEOGRAPHY MAP */}
          <section
            id="location"
            ref={sectionRefs.location}
            data-reveal="rise"
            className="relative scroll-mt-14"
          >
            <div className="absolute top-0 right-0 text-moss/5 text-7xl font-serif font-black select-none pointer-events-none translate-x-4 -translate-y-4">
              地
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <span className={`${typo.eyebrow} block select-none`}>地 — Chapter VI</span>
                <h3 className={`${typo.sectionTitle} select-text`}>
                  Transit & Geography
                </h3>
              </div>

              {(editing || shrine.geographicNotes) && (
                <div className="space-y-2 select-text">
                  <span className={`${typo.fieldLabel} block select-none`}>GEOGRAPHIC LANDMARKS</span>
                  <EditableProse
                    path="details.geographic_notes"
                    rows={4}
                    ariaLabel="Geographic landmarks / natural setting"
                    placeholder="Natural setting, surrounding landscape, terrain, access notes…"
                    editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
                  >
                    <p className={typo.prose}>
                      {shrine.geographicNotes}
                    </p>
                  </EditableProse>
                </div>
              )}

              {(editing || shrine.bestTime) && (
                <div className="space-y-2 select-text">
                  <span className={`${typo.fieldLabel} block select-none`}>Best Time to Visit</span>
                  <EditableProse
                    path="details.best_time"
                    rows={4}
                    ariaLabel="Best time to visit"
                    placeholder="Best season / time of day to visit…"
                    editClassName="w-full text-xs md:text-sm font-sans text-stone/80"
                  >
                    <p className={typo.prose}>
                      {shrine.bestTime}
                    </p>
                  </EditableProse>
                </div>
              )}

              {/* Seamless map window — outer wrapper lets popup escape overflow:hidden */}
              <div className="relative">
                <div className="relative w-full h-72 rounded-xl overflow-hidden shadow-2xs bg-stone/5 border border-stone/10 group select-none">
                  <iframe
                    className="w-full h-full border-0 absolute inset-0 transition-opacity filter saturate-75 hover:saturate-100"
                    src={buildEmbedUrl({ coordinates: mapCoordinates, name: shrine.name, city: shrine.location || null })}
                    title={`Geography chart of ${shrine.name}`}
                    loading="lazy"
                  />
                  {editing && (
                    <button
                      type="button"
                      onClick={() => setLocationPopupOpen(true)}
                      aria-label="Edit address and coordinates"
                      className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg border border-torii/40 bg-sand/90 backdrop-blur-sm px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-torii shadow-sm hover:bg-torii hover:text-white transition-colors pointer-events-auto"
                    >
                      <MapPin size={11} />
                      <span>Location</span>
                    </button>
                  )}
                </div>
                {editing && (
                  <LocationEditPopup
                    open={locationPopupOpen}
                    onClose={() => setLocationPopupOpen(false)}
                  />
                )}
              </div>
            </div>
          </section>

        </div>

      </div>

      {canEdit && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
                Admin Controls
              </span>
              <span className="text-stone/25 font-mono select-none text-xs">|</span>
              <button
                onClick={onEdit}
                className="group flex items-center gap-1.5 rounded-full border border-moss/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-moss transition-colors hover:border-moss hover:bg-moss/10"
              >
                <Pencil size={12} className="transition-transform group-hover:rotate-12" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="group flex items-center gap-1.5 rounded-full border border-stone/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <Trash2 size={12} className="transition-transform group-hover:scale-110" />
                <span>Delete</span>
              </button>
            </div>
          </div>
          <DeleteShrinePopup
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            slug={shrine.slug}
            shrineName={shrine.name}
          />
        </>
      )}

    </div>
  );
}

/* ===================================================================== */
/* MODAL VARIANT — drawer content only (source: ShrineDetailModal);      */
/* the drawer shell + close header live in components/Modal.tsx          */
/* ===================================================================== */

function ModalBody({
  view: shrine,
  mark,
  isSignedIn = false,
}: {
  view: View;
  mark?: ShrineMarkInfo;
  isSignedIn?: boolean;
}) {
  const marks = useShrineMarks({
    saved: mark?.saved ? [shrine.slug] : [],
    stamped: mark?.stamped ? [shrine.slug] : [],
  });
  const isSaved = marks.isSaved(shrine.slug);
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
        <ShrineImage alt={shrine.name} shrineId={shrine.slug} prefecture={shrine.prefecture} nameJa={shrine.japaneseName} />
      </div>

      <div className="px-6 md:px-10 py-7 space-y-9 pb-9">

        {/* Identity block */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1 select-none text-[9px] font-mono tracking-widest uppercase text-moss-light font-bold">
                {shrine.ranks.map((rank, i) => (
                  <span key={rank} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="opacity-30">|</span>}
                    {rank === "Ise Grand Shrine" && <Crown size={10} className="text-torii" />}
                    <span>{rank}</span>
                  </span>
                ))}
              </div>
              {isSignedIn && (
                <button
                  onClick={() => marks.toggleSave(shrine.slug, shrine.name)}
                  disabled={marks.pending}
                  aria-pressed={isSaved}
                  title={isSaved ? "Remove from saved" : "Save to your list"}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-wait shrink-0 ${
                    isSaved ? "border-torii/40 text-torii" : "border-moss/20 text-stone/55 hover:border-torii/40 hover:text-torii"
                  }`}
                >
                  <Heart size={11} className={isSaved ? "fill-torii" : ""} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              )}
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
              &#x201C;{shrine.quote}&#x201D;
            </p>
          )}
        </div>

        {/* Description & Highlights */}
        {(shrine.description || shrine.highlights.length > 0) && (
          <div className="space-y-4">
            {shrine.description && (
              <p className={`${typo.prose} whitespace-pre-line select-text`}>
                {shrine.description}
              </p>
            )}
            <HighlightsEditor highlights={shrine.highlights} />
          </div>
        )}

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
                <h4 className={typo.subheading}>
                  <Link href={deityHref(shrine.primaryDeity.canonicalNameJa)} className="transition-colors hover:text-torii">
                    {shrine.primaryDeity.name}
                  </Link>
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-serif text-moss font-medium pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                    {shrine.primaryDeity.japaneseName}
                  </span>
                  <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(shrine.primaryDeity.deityType)}`}>
                    {DEITY_TYPE_LABEL[shrine.primaryDeity.deityType] ?? shrine.primaryDeity.deityType}
                  </span>
                </div>
                {shrine.primaryDeity.hasAlter && (
                  <p className="mt-1.5 text-[10px] font-mono tracking-wide text-stone/40 select-none">
                    Enshrined form of {shrine.primaryDeity.canonicalName}
                    {shrine.primaryDeity.canonicalNameJa ? ` (${shrine.primaryDeity.canonicalNameJa})` : ""}
                  </p>
                )}
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
                      <div key={deity.canonicalNameJa + idx} className="space-y-1.5 p-3.5 rounded-lg bg-white/30 hover:bg-white/80 border border-stone/5 shadow-3xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-serif font-black text-stone leading-tight">
                            <Link href={deityHref(deity.canonicalNameJa)} className="transition-colors hover:text-torii">
                              {deity.name}
                            </Link>
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-serif text-moss-light pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                              {deity.japaneseName}
                            </span>
                            <span className={`text-[9px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(deity.deityType)}`}>
                              {DEITY_TYPE_LABEL[deity.deityType] ?? deity.deityType}
                            </span>
                          </div>
                          {deity.hasAlter && (
                            <p className="text-[9px] font-mono tracking-wide text-stone/40 select-none">
                              Enshrined form of {deity.canonicalName}
                              {deity.canonicalNameJa ? ` (${deity.canonicalNameJa})` : ""}
                            </p>
                          )}
                        </div>
                        {deity.titles && deity.titles.length > 0 && (
                          <div className="pt-1.5 border-t border-stone/5">
                            <div className="flex flex-col gap-1 text-[10px] text-stone/50 font-sans leading-normal">
                              {deity.titles.slice(0, 2).map((title, tIdx) => (
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
                        <h5 className={typo.subheadingSm}>
                          {fest.name}
                          {fest.name_ja && (
                            <span className="text-xs font-serif font-medium text-moss/70 ml-1.5" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                              ({fest.name_ja})
                            </span>
                          )}
                        </h5>
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
              {shrine.sources.map((source, i) => (
                <span key={source.url}>
                  {i > 0 && " • "}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-torii transition-colors">{source.label}</a>
                </span>
              ))}
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
