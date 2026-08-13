"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Stamp,
  Heart,
  Calendar,
  MapPin,
  Sparkles,
  Award,
  Edit2,
  LogOut,
  ChevronRight,
  X,
  Lock,
  CheckCircle2,
  Map as MapIcon,
  BookOpen,
  ScrollText,
  Trophy,
  Globe,
  Compass,
  Crown,
  Landmark,
  Shield,
  ShieldCheck,
  Sun,
  Flame,
  Flag,
  GraduationCap,
  Users,
  Coins,
  Activity,
  Footprints,
  CalendarDays,
  Bookmark,
  Mountain,
  Medal,
  Gem,
  Wheat,
  Flower2,
  Fish,
  Swords,
  Moon,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { useToast } from "@/components/ui/Toast";
import { saveCrestAction } from "@/app/users/actions";
import { buildMilestoneContext, evaluateMilestones, getPilgrimRank, localizeCatalogEntry, type Milestone } from "@/lib/milestones";
import type { StampEntry, SavedEntry } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";

// Maps a milestone's `icon` string key (kept React-free in lib/milestones.ts) to a
// lucide component. Unknown keys fall back to a generic award icon.
const MILESTONE_ICONS: Record<string, LucideIcon> = {
  stamp: Stamp,
  bookOpen: BookOpen,
  scroll: ScrollText,
  trophy: Trophy,
  mapPin: MapPin,
  map: MapIcon,
  globe: Globe,
  compass: Compass,
  crown: Crown,
  landmark: Landmark,
  award: Award,
  shield: Shield,
  shieldCheck: ShieldCheck,
  sun: Sun,
  flame: Flame,
  flag: Flag,
  graduationCap: GraduationCap,
  sparkles: Sparkles,
  users: Users,
  heart: Heart,
  coins: Coins,
  activity: Activity,
  footprints: Footprints,
  calendarDays: CalendarDays,
  bookmark: Bookmark,
  mountain: Mountain,
  medal: Medal,
  gem: Gem,
  wheat: Wheat,
  flower: Flower2,
  fish: Fish,
  sword: Swords,
  moon: Moon,
  waves: Waves,
};

// A single Sacred Milestone card — reused for both unlocked and locked states.
function MilestoneCard({
  def,
  unlocked,
  current,
  target,
  percent,
  locale,
}: {
  def: Milestone;
  unlocked: boolean;
  current: number;
  target: number;
  percent: number;
  locale: Locale;
}) {
  const t = useTranslations("Profile");
  const { title, subtitle, description } = localizeCatalogEntry(locale, def);
  const Icon = MILESTONE_ICONS[def.icon] ?? Award;
  // Count-style milestones (target > 1) show the "current / target" tally; boolean
  // ones (target === 1) rely on the empty/full bar alone.
  const showCount = target > 1;
  // Three visual states: earned (unlocked), started (in progress — any progress made),
  // and not-yet-started (locked, grayed out). In-progress cards stay fully enabled to
  // invite the next visit rather than being dimmed like untouched goals.
  const inProgress = !unlocked && current >= 1;
  const active = unlocked || inProgress;
  return (
    <div
      className={`wabi-sabi-card rounded-xl md:rounded-2xl p-3 md:p-4.5 flex gap-2.5 md:gap-4 h-full transition-all relative overflow-hidden ${
        unlocked
          ? "bg-washi/90 border-bamboo/25 text-stone"
          : inProgress
            ? "bg-washi/70 border-moss/15 text-stone"
            : "bg-stone/5 border-moss/10 opacity-60 text-stone/50"
      }`}
    >
      {unlocked && (
        <div className="absolute -right-8 -top-8 w-16 h-16 bg-bamboo/10 rotate-45 border border-dashed border-bamboo/20 pointer-events-none" />
      )}
      <div
        className={`w-9 min-h-9 md:w-12 md:min-h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 border ${
          unlocked
            ? "border-bamboo/30 bg-bamboo-light text-bamboo"
            : inProgress
              ? "border-torii/25 bg-torii/5 text-torii"
              : "border-moss/15 bg-stone/5 text-stone/40"
        }`}
      >
        <Icon size={18} className="md:w-5 md:h-5" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:gap-1">
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          <h4 className={`font-sans text-[11px] md:text-xs font-bold uppercase tracking-wider ${active ? "text-stone" : "text-stone/60"}`}>
            {title}
          </h4>
          <span className="font-serif text-[10px] text-torii">({subtitle})</span>
        </div>
        <p className="text-[10px] md:text-[11px] text-stone/75 leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-none">{description}</p>

        {/* Progress bar — fills as the milestone nears completion; pinned to card foot */}
        <div className="mt-auto pt-1 md:pt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-1 text-[9px] font-mono tracking-widest">
            {unlocked ? (
              <span className="text-bamboo font-bold flex items-center gap-0.5">
                <CheckCircle2 size={10} /> {t("unlocked")}
              </span>
            ) : inProgress ? (
              <span className="text-torii font-bold flex items-center gap-0.5">
                <Activity size={10} /> {percent}%
              </span>
            ) : (
              <span className="text-stone/40 font-bold flex items-center gap-0.5">
                <Lock size={10} /> {percent}%
              </span>
            )}
            {showCount && (
              <span className={unlocked ? "text-bamboo/80 font-bold" : inProgress ? "text-torii/80 font-bold" : "text-stone/45"}>
                {current} / {target}
              </span>
            )}
          </div>
          <div
            className={`h-1 w-full rounded-full overflow-hidden ${unlocked ? "bg-bamboo/15" : inProgress ? "bg-torii/10" : "bg-stone/10"}`}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full ${unlocked ? "bg-bamboo" : "bg-torii/60"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}


// ============================================================================
// TRADITIONAL JAPANESE CREST (KAMON - 家紋) DEFINITIONS
// ============================================================================
export interface Crest {
  id: string;
  name_ja: string;
  name_en: string;
  meaning: string;
  description: string;
  render: (className?: string) => React.ReactNode;
}

// Shared framed canvas — a thin double ring (the classic kamon "maru" border)
// wrapping each motif. Keeps every crest on a consistent footprint.
function CrestSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" />
      {children}
    </svg>
  );
}

export const CRESTS: Crest[] = [
  {
    id: "tomoe",
    name_ja: "三つ巴",
    name_en: "Mitsudomoe",
    meaning: "Cosmic Flow & Protection",
    description: "The triple swirl represents the alignment of heaven, earth, and humanity, associated with Hachiman (deity of warriors) and protection from lightning and fire.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Three interlocking commas (magatama) tiling the disc at 120° */}
        {[0, 120, 240].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 50 50)`}
            d="M 50,16 A 34,34 0 0,0 20.56,67 A 17,17 0 0,1 37.56,50 A 17,17 0 0,0 50,16 Z"
          />
        ))}
        <circle cx="50" cy="50" r="4.5" />
      </CrestSvg>
    ),
  },
  {
    id: "matsu",
    name_ja: "松",
    name_en: "Matsu",
    meaning: "Longevity & Resilience",
    description: "The evergreen pine tree represents longevity, steadfastness, and enduring strength through harsh winters.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Tiered evergreen — three stacked needle layers on a short trunk */}
        <rect x="46.5" y="58" width="7" height="11" rx="1" />
        <path d="M 50,38 L 30,60 L 70,60 Z" />
        <path d="M 50,26 L 35,46 L 65,46 Z" />
        <path d="M 50,15 L 39,34 L 61,34 Z" />
      </CrestSvg>
    ),
  },
  {
    id: "sakura",
    name_ja: "桜",
    name_en: "Sakura",
    meaning: "Ephemeral Beauty & Life",
    description: "The cherry blossom is a central motif of Japanese aesthetics, celebrating fleeting grace, renewal, and the exquisite transience of life.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Five cleft petals (the notched tip distinguishes sakura from ume) */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 50 50)`}
            d="M 50,50 C 42,49 35,41 37,30 C 38,24 43,18 47,16 C 48.5,15.2 49,18 50,21 C 51,18 51.5,15.2 53,16 C 57,18 62,24 63,30 C 65,41 58,49 50,50 Z"
          />
        ))}
        <circle cx="50" cy="50" r="3.5" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <circle key={angle} transform={`rotate(${angle} 50 50)`} cx="50" cy="40" r="1.4" />
        ))}
      </CrestSvg>
    ),
  },
  {
    id: "ume",
    name_ja: "梅",
    name_en: "Ume",
    meaning: "Elegance & Scholarly Devotion",
    description: "Plum blossoms bloom in late winter snows, representing loyalty, intellectual dedication, and elegance under adversity. Dedicated to Tenjin, the patron kami of learning.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Umebachi — five full rounded petals around a prominent core */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 50 50)`}
            d="M 50,50 C 43,49 37,43 37,34 C 37,25 43,19 50,19 C 57,19 63,25 63,34 C 63,43 57,49 50,50 Z"
          />
        ))}
        <circle cx="50" cy="50" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="2" />
      </CrestSvg>
    ),
  },
  {
    id: "kiku",
    name_ja: "菊",
    name_en: "Kiku",
    meaning: "Nobility & Perfect Order",
    description: "The chrysanthemum represents the autumn season, royalty, high status, and immaculate geometric order.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Imperial chrysanthemum — 16 outer petals over a 16-petal inner ring */}
        {Array.from({ length: 16 }).map((_, i) => (
          <path
            key={`o-${i}`}
            transform={`rotate(${i * 22.5} 50 50)`}
            d="M 50,49 C 47.5,40 47.5,22 50,15 C 52.5,22 52.5,40 50,49 Z"
          />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <path
            key={`i-${i}`}
            transform={`rotate(${i * 22.5 + 11.25} 50 50)`}
            d="M 50,47 C 48.5,40 48.5,28 50,23 C 51.5,28 51.5,40 50,47 Z"
          />
        ))}
        <circle cx="50" cy="50" r="7" />
      </CrestSvg>
    ),
  },
  {
    id: "fuji",
    name_ja: "藤",
    name_en: "Fuji",
    meaning: "Grace & Welcoming Abundance",
    description: "Hanging wisteria flower clusters represent warm hospitality, elegance, and deep-rooted spiritual connection.",
    render: (className) => (
      <CrestSvg className={className}>
        {/* Sagari-fuji — two clusters of wisteria drooping from a crown of leaves */}
        <path d="M 50,16 C 44,18 40,24 40,30 C 46,28 50,24 50,16 Z" />
        <path d="M 50,16 C 56,18 60,24 60,30 C 54,28 50,24 50,16 Z" />
        <path d="M 44,28 C 40,38 38,52 41,66" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 56,28 C 60,38 62,52 59,66" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="41" cy="34" r="4" />
        <circle cx="39" cy="42" r="4" />
        <circle cx="39.5" cy="50" r="3.6" />
        <circle cx="40.5" cy="58" r="3.1" />
        <circle cx="42" cy="65" r="2.5" />
        <circle cx="59" cy="34" r="4" />
        <circle cx="61" cy="42" r="4" />
        <circle cx="60.5" cy="50" r="3.6" />
        <circle cx="59.5" cy="58" r="3.1" />
        <circle cx="58" cy="65" r="2.5" />
      </CrestSvg>
    ),
  },
];

// Helper to format date
function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

// On mobile (<768px) force a hard navigation so the (.)shrines interceptor is bypassed and
// shrine links open the full detail page; iPad and desktop keep the soft-nav side modal.
function openShrineDirectOnMobile(e: React.MouseEvent, slug: string) {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    e.preventDefault();
    window.location.href = `/shrines/${slug}`;
  }
}

interface UserProfileClientProps {
  user: CurrentUser;
  stamped: StampEntry[];
  saved: SavedEntry[];
  totalShrines: number;
  totalRegions: number;
  totalPrefectures: number;
  crest: string;
}

export default function UserProfileClient({
  user,
  stamped,
  saved,
  totalShrines,
  totalRegions,
  totalPrefectures,
  crest,
}: UserProfileClientProps) {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("Profile");
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  // Modals portal to document.body so they escape the page's stacking context
  // and paint above the site chrome (nav/footer). Render only after mount (SSR-safe).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Tab State
  const [activeTab, setActiveTab] = useState<"stamps" | "saved" | "journey">("journey");

  // Chronicle Expansion State (Prefectures and long lists of Shrines)
  const [collapsedPrefs, setCollapsedPrefs] = useState<Record<string, boolean>>({});
  const [expandedShrinesPref, setExpandedShrinesPref] = useState<Record<string, boolean>>({});

  const togglePrefCollapse = (prefName: string) => {
    setCollapsedPrefs((prev) => ({ ...prev, [prefName]: !prev[prefName] }));
  };

  const toggleShrinesExpand = (prefName: string) => {
    setExpandedShrinesPref((prev) => ({ ...prev, [prefName]: !prev[prefName] }));
  };

  // Edit State — crest is server-persisted (passed in from the profile page)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [selectedCrestId, setSelectedCrestId] = useState(crest);

  const activeCrest = CRESTS.find((c) => c.id === selectedCrestId) || CRESTS[0];

  // Pilgrim Status — the headline rank/level, derived from the goshuin count via the
  // stamp-count ranks in lib/milestones.ts (Sanctuary Explorer, Devoted Wanderer, …).
  // These replace the old hardcoded tiers and are excluded from the Sacred Milestones list.
  const stampCount = stamped.length;
  const rank = getPilgrimRank(stampCount);
  const { title: statusTitle, subtitle: statusSubtitle, description: statusDesc } = localizeCatalogEntry(locale, rank.current);
  const progressPercentage = rank.percent;
  const nextGoal = rank.next?.threshold ?? stampCount;

  // Calculate statistics
  const wishlistCount = saved.length;
  const coveragePercentage = totalShrines > 0 ? Math.round((stampCount / totalShrines) * 100) : 0;

  // Sacred Milestones — derived from the collections (see lib/milestones.ts).
  // In-progress (not-yet-earned) first, then earned; laid out in a horizontal
  // scroller of 3-row columns. ~2.5 columns show by default (6 cards: the 3rd
  // column peeks to signal scrollability) and the rest, including completed ones,
  // are reached by scrolling right.
  const milestones = evaluateMilestones(
    buildMilestoneContext(stamped, saved, { totalShrines, totalRegions, totalPrefectures }),
  );
  const unlockedCount = milestones.filter((m) => m.unlocked).length;
  const orderedMilestones = [
    ...milestones.filter((m) => !m.unlocked),
    ...milestones.filter((m) => m.unlocked),
  ];

  // Translate a vertical mouse wheel into horizontal scrolling over the milestone
  // row, so a normal wheel scrolls it without grabbing the scrollbar. A non-passive
  // native listener is required to preventDefault; at the row's horizontal edges we
  // bail so the page resumes its usual vertical scroll.
  const milestoneScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = milestoneScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || e.shiftKey) return;
      if (el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Click-and-drag ("grab") panning with the mouse; touch/pen keep native scrolling.
  const milestoneDrag = useRef({ active: false, startX: 0, startLeft: 0 });
  function onMilestonePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = milestoneScrollRef.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    milestoneDrag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  }
  function onMilestonePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = milestoneScrollRef.current;
    const s = milestoneDrag.current;
    if (!el || !s.active) return;
    el.scrollLeft = s.startLeft - (e.clientX - s.startX);
  }
  function endMilestoneDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!milestoneDrag.current.active) return;
    milestoneDrag.current.active = false;
    const el = milestoneScrollRef.current;
    if (!el) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }

  // Sign out handle
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.notify(t("toast.signedOut"), "success");
      router.push("/");
      router.refresh();
    } catch {
      toast.notify(t("toast.signOutFailed"), "error");
      setSigningOut(false);
    }
  }

  // Handle Edit profile submit
  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      toast.notify(t("toast.nameEmpty"), "error");
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await authClient.updateUser({
          name: editName.trim(),
        });

        if (error) {
          toast.notify(error.message || t("toast.updateFailed"), "error");
          return;
        }

        // Persist the chosen crest to the backend (user_profile table).
        const crestResult = await saveCrestAction(selectedCrestId);
        if (crestResult.error) {
          toast.notify(crestResult.error || t("toast.crestFailed"), "error");
          return;
        }

        toast.notify(t("toast.passUpdated"), "success");
        setIsEditOpen(false);
        router.refresh();
      } catch {
        toast.notify(t("toast.unexpected"), "error");
      }
    });
  }

  return (
    <div className="mx-auto w-[calc(100%-2.5rem)] max-w-7xl pt-6 md:pt-16 pb-16">
      {/* =======================================================================
          PILGRIM SANCTUARY PASS (HEADER CARD)
          ======================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="wabi-sabi-card washi-paper sumi-shadow rounded-3xl p-5 sm:p-6 md:p-8 relative overflow-hidden"
      >
        {/* Japanese Shinto Sanctuary aesthetic corners */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-torii/30 pointer-events-none" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-torii/30 pointer-events-none hidden md:block" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-torii/30 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-torii/30 pointer-events-none" />

        {/* Soft torii glow, top-right corner */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-torii/5 blur-2xl pointer-events-none" />

        {/* Mobile sign-out — caps the top-right corner; opens the confirmation popup */}
        <button
          type="button"
          disabled={signingOut}
          onClick={() => setConfirmSignOut(true)}
          aria-label={signingOut ? t("signingOut") : t("signOut")}
          className="md:hidden absolute top-3.5 right-3.5 z-20 p-2 rounded-full border border-moss/20 bg-washi/90 text-moss-light shadow-xs hover:text-torii hover:border-torii/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <LogOut size={14} className={signingOut ? "animate-pulse" : ""} />
        </button>

        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-8 relative z-10">
          {/* Avatar Octagon Frame */}
          <div className="relative group shrink-0">
            <motion.div
              whileHover={{ scale: 1.03, rotate: 1.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-moss/5 flex items-center justify-center relative shadow-xs transition-all border border-moss/15 cursor-pointer hover:border-torii/40"
              style={{
                clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
              }}
              onClick={() => setIsEditOpen(true)}
            >
              {/* Inner paper texture overlay for the badge */}
              <div
                className="absolute inset-[3px] bg-washi flex items-center justify-center text-torii/80 hover:text-torii transition-colors"
                style={{
                  clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
              >
                {/* Dashed ring decoration matching the wabi-sabi card design */}
                <div
                  className="absolute inset-1.5 border border-dashed border-torii/15 pointer-events-none"
                  style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                  }}
                />
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-24 md:h-24 opacity-85 transition-transform group-hover:scale-105 group-hover:opacity-100 relative z-10">
                  {activeCrest.render("w-full h-full")}
                </div>
              </div>
            </motion.div>

            {/* Edit avatar tooltip/badge */}
            <button
              onClick={() => setIsEditOpen(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full border border-moss/10 bg-washi text-moss-light shadow-xs hover:text-torii hover:scale-110 transition-all cursor-pointer"
              aria-label={t("editProfile")}
            >
              <Edit2 size={13} />
            </button>
          </div>

          {/* Profile Pass details */}
          <div className="flex-1 w-full space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 md:gap-4 w-full">
                <div className="flex flex-row flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 text-center md:text-left">
                  <h1 className="font-display text-2xl md:text-3xl font-black tracking-wide text-stone">
                    {user.name || t("anonymousPilgrim")}
                  </h1>
                  <span
                    className={`rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-dashed ${
                      user.isAdmin
                        ? "border-torii/40 bg-torii/5 text-torii"
                        : "border-moss/30 bg-moss/5 text-moss-light"
                    }`}
                  >
                    {user.isAdmin ? t("sanctuaryGuardian") : t("pilgrim")}
                  </span>
                </div>

                {/* Inline Action Row — desktop only; on mobile sign-out lives at the card foot */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <button
                    disabled={signingOut}
                    onClick={() => setConfirmSignOut(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-moss/25 hover:bg-torii/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-moss-light hover:text-torii hover:border-torii/40 transition-colors cursor-pointer"
                  >
                    <LogOut size={11} />
                    {signingOut ? t("leaving") : t("leave")}
                  </button>
                </div>
              </div>
              <p className="text-xs font-mono text-moss-light/70 tracking-wider text-center md:text-left">
                {user.email}
              </p>
            </div>

            {/* Pilgrim Level Badge */}
            <div className="w-full">
              <div className="flex flex-col items-center md:items-start gap-1.5 md:gap-2 p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-bamboo/15 bg-bamboo-light/20 w-full">
                <div className="flex items-center gap-2">
                  <Award size={15} className="text-torii" />
                  <span className="font-sans text-sm font-bold uppercase text-stone tracking-wide">
                    {statusTitle} <span className="font-serif text-xs text-torii ml-1">({statusSubtitle})</span>
                  </span>
                </div>
                <p className="hidden md:block text-[11px] text-stone/75 leading-normal text-center md:text-left mb-2">
                  {statusDesc}
                </p>

                {/* Progress Bar to next level */}
                {rank.next && (
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono tracking-widest text-moss-light/80">
                      <span>
                        <span className="md:hidden">{t("nextRank")}</span>
                        <span className="hidden md:inline">{t("progressToNextRank")}</span>
                      </span>
                      <span>{t("stampsProgress", { current: stampCount, goal: nextGoal })}</span>
                    </div>
                    <div className="h-1.5 w-full bg-washi rounded-full border border-moss/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-torii"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 border-t border-moss/10 pt-4 md:pt-6 mt-4 md:mt-8">
          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Stamp size={16} />
            </div>
            <div className="font-sans text-xl md:text-2xl font-extrabold text-stone">{stampCount}</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">{t("statStamps")}</div>
          </div>

          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Heart size={16} />
            </div>
            <div className="font-sans text-xl md:text-2xl font-extrabold text-stone">{wishlistCount}</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">{t("statWishlist")}</div>
          </div>

          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Award size={16} />
            </div>
            <div className="font-sans text-xl md:text-2xl font-extrabold text-stone">{coveragePercentage}%</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">{t("statCoverage")}</div>
          </div>
        </div>

      </motion.div>

      {/* =======================================================================
          TABBED CONTENTS SELECTOR (EMA TABLETS)
          ======================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        className="mt-10 md:mt-12"
      >
        <div className="flex justify-around md:justify-center border-b border-moss/15 gap-1 md:gap-8 select-none pb-px">
          {([
            { id: "journey", label: "巡礼の旅路", sub: t("tabPilgrimLog"), count: null },
            { id: "stamps", label: "御朱印帳", sub: t("tabStampBook"), count: stampCount },
            { id: "saved", label: "お気に入り", sub: t("tabWishlist"), count: wishlistCount },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative pb-3 flex flex-col items-center group cursor-pointer flex-1 md:flex-none"
            >
              <span
                className={`font-serif text-sm tracking-wider transition-colors ${
                  activeTab === tab.id ? "text-torii font-semibold" : "text-moss-light/80 hover:text-torii"
                }`}
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-1.5 text-[10px] font-mono font-bold rounded-full bg-bamboo-light/50 border border-moss/10 px-1.5 py-0.5 text-moss">
                    {tab.count}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-stone/50 mt-0.5 group-hover:text-torii transition-colors">
                {tab.sub}
              </span>

              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-torii"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* =======================================================================
            TAB CONTENTS
            ======================================================================= */}
        <div className="mt-6 md:mt-8">
          <AnimatePresence mode="wait">
            {activeTab === "stamps" && (
              <motion.div
                key="stamps-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {stamped.length === 0 ? (
                  <div className="wabi-sabi-card rounded-2xl bg-washi/40 border border-dashed border-moss/20 px-6 py-16 text-center">
                    <Stamp className="mx-auto text-moss-light/40 mb-3" size={32} />
                    <h3 className="font-serif text-base font-bold text-stone">{t("noStampsTitle")}</h3>
                    <p className="text-xs text-stone/60 max-w-xs mx-auto mt-2 leading-relaxed">
                      {t("noStampsBody")}
                    </p>
                    <Link
                      href="/shrines"
                      className="inline-flex items-center gap-1 mt-6 text-xs font-mono font-black uppercase tracking-widest text-torii hover:text-torii-dark hover:underline"
                    >
                      {t("searchSanctuaries")} <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {stamped.map((item) => {
                      const firstKanji = item.name_ja ? item.name_ja.charAt(0) : "神";
                      return (
                        <motion.div
                          key={item.slug}
                          whileHover={{ y: -3, scale: 1.01 }}
                          className="wabi-sabi-card washi-paper rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group shadow-3xs hover:border-torii/30 hover:shadow-xs"
                        >
                          {/* Left: Authentic Red Hanko Seal stamp graphic */}
                          <div className="relative shrink-0 select-none">
                            {/* Seal boundary */}
                            <div className="hanko-seal w-13 h-13 rounded-md flex flex-col items-center justify-center p-1 border-2 border-torii text-torii font-serif font-black relative overflow-hidden bg-transparent shadow-xs transition-transform duration-300 group-hover:rotate-3">
                              {/* Distress grunge overlay to simulate paper stamp bleed */}
                              <div
                                className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none"
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                }}
                              />
                              <span className="text-lg leading-none">{firstKanji}</span>
                              <span className="text-[7px] font-sans tracking-tight leading-none mt-0.5 opacity-80 uppercase">印</span>
                            </div>
                          </div>

                          {/* Right: Shrine Details */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/shrines/${item.slug}`} scroll={false} onClick={(e) => openShrineDirectOnMobile(e, item.slug)} className="group-hover:text-torii transition-colors">
                              <h4 className="font-serif text-[13px] font-bold text-stone truncate leading-snug tracking-wide">
                                {namePair(locale, item).main}
                              </h4>
                              {namePair(locale, item).sub && (
                                <p
                                  className="font-serif text-[11px] text-torii-dark/70 tracking-wider leading-none mt-0.5 truncate"
                                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                                >
                                  {namePair(locale, item).sub}
                                </p>
                              )}
                            </Link>
                            
                            <div className="flex items-center gap-1.5 text-[10px] text-stone/55 mt-1.5">
                              <MapPin size={11} className="text-moss-light/60 shrink-0" />
                              <span className="truncate">
                                {[item.city, namePair(locale, item.prefecture).main].filter(Boolean).join(", ")}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[9px] font-mono tracking-widest text-moss-light uppercase mt-1">
                              <Calendar size={10} className="opacity-70" />
                              <span>{t("collected", { date: formatDate(item.stamped_at, locale) })}</span>
                            </div>
                          </div>
                          
                          {/* Small hover arrow */}
                          <Link
                            href={`/shrines/${item.slug}`}
                            scroll={false}
                            onClick={(e) => openShrineDirectOnMobile(e, item.slug)}
                            className="p-1 rounded-full border border-moss/10 bg-washi opacity-0 group-hover:opacity-100 group-hover:text-torii hover:scale-110 transition-all ml-2"
                            aria-label={t("viewShrine", { name: item.name_en })}
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "saved" && (
              <motion.div
                key="saved-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {saved.length === 0 ? (
                  <div className="wabi-sabi-card rounded-2xl bg-washi/40 border border-dashed border-moss/20 px-6 py-16 text-center">
                    <Heart className="mx-auto text-moss-light/40 mb-3" size={32} />
                    <h3 className="font-serif text-base font-bold text-stone">{t("wishlistEmptyTitle")}</h3>
                    <p className="text-xs text-stone/60 max-w-xs mx-auto mt-2 leading-relaxed">
                      {t("wishlistEmptyBody")}
                    </p>
                    <Link
                      href="/shrines"
                      className="inline-flex items-center gap-1 mt-6 text-xs font-mono font-black uppercase tracking-widest text-torii hover:text-torii-dark hover:underline"
                    >
                      {t("searchSanctuaries")} <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {saved.map((item) => (
                      <motion.div
                        key={item.slug}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className="wabi-sabi-card washi-paper rounded-xl p-3.5 flex flex-col justify-between group shadow-3xs hover:border-torii/30"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <Link href={`/shrines/${item.slug}`} scroll={false} onClick={(e) => openShrineDirectOnMobile(e, item.slug)} className="group-hover:text-torii transition-colors min-w-0">
                              <h4 className="font-serif text-[13px] font-bold text-stone leading-snug group-hover:text-torii truncate tracking-wide">
                                {namePair(locale, item).main}
                              </h4>
                              {namePair(locale, item).sub && (
                                <p
                                  className="font-serif text-[10px] text-torii-dark/70 tracking-wider mt-0.5 truncate"
                                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                                >
                                  {namePair(locale, item).sub}
                                </p>
                              )}
                            </Link>
                            <Heart size={14} className="text-torii fill-torii shrink-0" />
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-stone/55 mt-2.5">
                            <MapPin size={11} className="text-moss-light/60 shrink-0" />
                            <span className="truncate">
                              {[item.city, namePair(locale, item.prefecture).main].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-moss/5 mt-3 pt-3 flex justify-between items-center">
                          <span className="text-[8px] font-mono tracking-widest text-moss-light/70 uppercase">
                            {t("saved", { date: formatDate(item.saved_at, locale) })}
                          </span>
                          <Link
                            href={`/shrines/${item.slug}`}
                            scroll={false}
                            onClick={(e) => openShrineDirectOnMobile(e, item.slug)}
                            className="text-[10px] font-mono font-black uppercase tracking-widest text-stone hover:text-torii inline-flex items-center gap-0.5"
                          >
                            {t("visit")} <ChevronRight size={10} />
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "journey" && (
              <motion.div
                key="journey-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Sacred Milestones — horizontal grab/scroll row; in-progress first */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-6">
                    <Award size={18} className="text-torii" />
                    <h3 className="font-serif text-md font-black text-stone">{t("sacredMilestones")}</h3>
                    <span className="ml-auto text-[10px] font-mono font-bold tracking-widest rounded-full bg-bamboo-light/50 border border-moss/10 px-2 py-0.5 text-moss">
                      {t("earned", { unlocked: unlockedCount, total: milestones.length })}
                    </span>
                  </div>

                  <div
                    ref={milestoneScrollRef}
                    onPointerDown={onMilestonePointerDown}
                    onPointerMove={onMilestonePointerMove}
                    onPointerUp={endMilestoneDrag}
                    onPointerCancel={endMilestoneDrag}
                    className="grid grid-flow-col grid-rows-3 gap-4 overflow-x-auto pb-1 -mx-1 px-1 items-stretch cursor-grab select-none active:cursor-grabbing [grid-auto-columns:80%] sm:[grid-auto-columns:55%] md:[grid-auto-columns:40%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {orderedMilestones.map(({ def, unlocked, current, target, percent }) => (
                      <div key={def.id} className="h-full">
                        <MilestoneCard def={def} unlocked={unlocked} current={current} target={target} percent={percent} locale={locale} />
                      </div>
                    ))}
                  </div>

                  <p className="flex items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-widest text-moss-light/60">
                    <span className="sm:hidden">{t("swipeMore")}</span>
                    <span className="hidden sm:inline">{t("dragMore")}</span>
                    <span aria-hidden>→</span>
                  </p>
                </div>

                {/* Pilgrimage Chronicle */}
                <div className="border-t border-moss/10 pt-8 mt-4">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen size={18} className="text-torii" />
                    <h3 className="font-serif text-md font-black text-stone">{t("pilgrimageChronicle")}</h3>
                  </div>

                  {stamped.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-moss/20 bg-stone/5 p-8 text-center text-xs text-stone/55 italic">
                      {t("chronicleEmpty")}
                    </div>
                  ) : (
                    <div className="relative pl-4 md:pl-6 border-l border-moss/15 ml-2 md:ml-3 space-y-8">
                      {Object.entries(
                        stamped.reduce((acc, stamp) => {
                          const pref = stamp.prefecture.name_en;
                          if (!acc[pref]) acc[pref] = [];
                          acc[pref].push(stamp);
                          return acc;
                        }, {} as Record<string, StampEntry[]>)
                      ).map(([prefName, prefStamps]) => {
                        const isCollapsed = collapsedPrefs[prefName] || false;
                        const isExpanded = expandedShrinesPref[prefName] || false;
                        const displayStamps = isExpanded ? prefStamps : prefStamps.slice(0, 6);
                        const hasMore = prefStamps.length > 6;

                        return (
                          <div key={prefName} className="relative space-y-4">
                            {/* Timeline dot */}
                            <div className="absolute -left-[23px] md:-left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border border-torii bg-washi flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-torii" />
                            </div>

                            {/* Collapsible Header Trigger */}
                            <button
                              onClick={() => togglePrefCollapse(prefName)}
                              className="flex items-center gap-2 group cursor-pointer text-left w-full focus:outline-none"
                            >
                              <ChevronRight
                                size={14}
                                className={`text-torii transition-transform duration-200 shrink-0 ${
                                  isCollapsed ? "" : "rotate-90"
                                }`}
                              />
                              <h4 className="font-display text-base md:text-lg font-black text-stone flex items-baseline gap-2 select-none min-w-0 flex-1 truncate">
                                {namePair(locale, prefStamps[0].prefecture).main}
                                <span className="font-serif text-xs text-torii font-bold shrink-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                  {namePair(locale, prefStamps[0].region).main}
                                </span>
                              </h4>
                              <span className="text-[9px] font-mono tracking-widest text-moss-light/60 uppercase font-bold shrink-0 group-hover:text-torii transition-colors select-none">
                                {isCollapsed ? t("expand") : t("collapse")} ({prefStamps.length})
                              </span>
                            </button>

                            {/* Shrine Cards Section */}
                            <AnimatePresence initial={false}>
                              {!isCollapsed && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden space-y-4 pl-2"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                    {displayStamps.map((stamp) => (
                                      <Link
                                        key={stamp.slug}
                                        href={`/shrines/${stamp.slug}`}
                                        scroll={false}
                                        onClick={(e) => openShrineDirectOnMobile(e, stamp.slug)}
                                        className="wabi-sabi-card washi-paper rounded-lg px-3 py-2.5 flex items-center gap-2.5 shadow-3xs group hover:border-torii/30 transition-all"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <span className="font-serif text-[13px] font-bold text-stone truncate block group-hover:text-torii tracking-wide leading-tight">
                                            {namePair(locale, stamp).main}
                                          </span>
                                          {namePair(locale, stamp).sub && (
                                            <span className="font-serif text-[10px] text-torii-dark/70 tracking-wider truncate block mt-0.5" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                              {namePair(locale, stamp).sub}
                                            </span>
                                          )}
                                          {stamp.primary_deity && (
                                            <span className="flex items-center gap-0.5 mt-0.5 text-[10px] text-moss-light/80 truncate">
                                              <Sparkles size={9} className="text-torii/70 shrink-0" />
                                              {namePair(locale, stamp.primary_deity).main}
                                            </span>
                                          )}
                                          <span className="text-[8px] font-mono tracking-widest text-stone/45 uppercase mt-1 block">
                                            {formatDate(stamp.stamped_at, locale)}
                                          </span>
                                        </div>
                                        <ChevronRight size={13} className="text-moss-light/40 group-hover:text-torii shrink-0 transition-colors" />
                                      </Link>
                                    ))}
                                  </div>

                                  {/* Expand / Collapse items toggle */}
                                  {hasMore && (
                                    <button
                                      onClick={() => toggleShrinesExpand(prefName)}
                                      className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-moss/20 hover:border-torii/40 text-[9px] font-mono font-bold tracking-widest text-moss-light/80 hover:text-torii bg-washi/40 transition-colors uppercase cursor-pointer"
                                    >
                                      {isExpanded
                                        ? t("collapseExtra")
                                        : t("showMoreEntries", { count: prefStamps.length - 6 })}
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* =======================================================================
          EDIT PROFILE MODAL
          ======================================================================= */}
      {mounted && createPortal(
        <AnimatePresence>
        {isEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="wabi-sabi-card washi-paper sumi-shadow rounded-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Corner boundaries */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-torii/20 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-torii/20 pointer-events-none" />

              <div className="p-6 md:p-8 overflow-y-auto flex-1 min-h-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-black text-stone">{t("editRecord")}</h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-full text-stone/50 hover:text-torii hover:bg-stone/5 transition-colors cursor-pointer"
                  aria-label={t("closeModal")}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Display Name Input */}
                <div className="space-y-1.5">
                  <label htmlFor="pilgrim-name" className="block text-[11px] font-bold uppercase tracking-widest text-moss-light">
                    {t("pilgrimName")}
                  </label>
                  <input
                    id="pilgrim-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-sm text-stone outline-none transition-all placeholder:text-moss-light/50 focus:border-torii focus:ring-3 focus:ring-torii/10 focus:bg-washi/90"
                    placeholder={t("enterName")}
                  />
                </div>

                {/* Crest Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-moss-light">
                    {t("pilgrimCrest")}
                  </label>
                  <p className="text-[10px] text-stone/60 leading-normal mb-3">
                    {t("crestHint")}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {CRESTS.map((crest) => (
                      <button
                        key={crest.id}
                        type="button"
                        onClick={() => setSelectedCrestId(crest.id)}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all hover:scale-102 cursor-pointer ${
                          selectedCrestId === crest.id
                            ? "border-torii bg-torii/5 text-torii"
                            : "border-moss/10 bg-washi/50 text-moss-light/75 hover:border-moss/30 hover:text-moss-light"
                        }`}
                      >
                        <div className="w-10 h-10 mb-2">
                          {crest.render("w-full h-full")}
                        </div>
                        <span className="font-serif text-[10px] font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                          {crest.name_ja}
                        </span>
                        <span className="text-[8px] font-mono tracking-wider opacity-75 uppercase mt-0.5">
                          {crest.name_en}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active crest meaning */}
                <div className="p-3.5 rounded-xl border border-dashed border-bamboo/20 bg-bamboo-light/10 text-stone/80 text-[11px] leading-relaxed">
                  <div className="font-bold text-moss-light uppercase tracking-wider text-[9px] mb-1 font-mono">
                    {t("significanceOf", { en: activeCrest.name_en, ja: activeCrest.name_ja })}
                  </div>
                  <div className="font-bold text-stone">{activeCrest.meaning}</div>
                  <div className="mt-0.5 text-stone/70">{activeCrest.description}</div>
                </div>

                {/* Submit Row */}
                <div className="flex gap-3 justify-end border-t border-moss/10 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="rounded-xl border border-moss/20 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-stone hover:bg-stone/5 transition-colors cursor-pointer"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-xl bg-torii px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-washi hover:bg-torii-dark transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t("applying")}
                      </>
                    ) : (
                      t("applyChanges")
                    )}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}

      {/* =======================================================================
          SIGN-OUT CONFIRMATION POPUP — shared by mobile icon + desktop "Leave".
          Mobile: compact row card. Tablet/desktop: centered column with larger crest.
          ======================================================================= */}
      {mounted && createPortal(
        <AnimatePresence>
        {confirmSignOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md"
            onClick={() => !signingOut && setConfirmSignOut(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="wabi-sabi-card washi-paper sumi-shadow relative w-full max-w-[17rem] md:max-w-sm rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Soft torii glow */}
              <div className="absolute -left-6 -top-8 w-28 h-28 md:w-56 md:h-56 rounded-full bg-torii/10 blur-2xl pointer-events-none" />

              {/* Corner marks — desktop only */}
              <div className="hidden md:block absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="hidden md:block absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-torii/20 pointer-events-none" />
              <div className="hidden md:block absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="hidden md:block absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-torii/20 pointer-events-none" />

              {/* Close button — absolute top-right on all sizes */}
              <button
                type="button"
                aria-label={t("closeSignOut")}
                onClick={() => setConfirmSignOut(false)}
                disabled={signingOut}
                className="absolute top-3.5 right-3.5 z-10 rounded-full p-1 text-stone/35 hover:text-stone hover:bg-stone/5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <X size={14} />
              </button>

              {/* Crest + heading — inline row on mobile, centered column on md+ */}
              <div className="relative z-10 flex items-center gap-3 pr-6 md:flex-col md:items-center md:text-center md:gap-5 md:pr-0">
                <div className="relative shrink-0 w-11 h-11 md:w-20 md:h-20">
                  <div className="absolute inset-0 rounded-full bg-bamboo-light/30 border border-moss/15" />
                  <div className="absolute inset-1 rounded-full border border-dashed border-torii/25 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center text-torii/80">
                    <div className="w-6 h-6 md:w-12 md:h-12">{activeCrest.render("w-full h-full")}</div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base md:text-xl font-black tracking-wide text-stone leading-tight">
                    {t("leaveSanctuary")}
                  </h3>
                  <p
                    className="font-serif text-[10px] md:text-sm tracking-[0.2em] text-torii md:mt-1"
                    style={{ fontFamily: "'Noto Serif JP', serif" }}
                  >
                    {t("leaveSanctuaryJa")}
                  </p>
                </div>
              </div>

              <p className="relative z-10 mt-2.5 md:mt-4 text-[11px] md:text-sm text-stone/65 leading-relaxed md:text-center">
                {t("leaveConfirm")}
              </p>

              {/* Actions */}
              <div className="relative z-10 mt-3.5 md:mt-6 flex gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  disabled={signingOut}
                  className="flex-1 rounded-lg md:rounded-xl border border-dashed border-moss/30 px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest text-moss-light hover:text-stone hover:border-moss/50 hover:bg-stone/5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t("stay")}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg md:rounded-xl bg-torii px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest text-washi hover:bg-torii-dark transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <LogOut size={12} className={signingOut ? "animate-pulse" : ""} />
                  {signingOut ? t("leaving") : t("signOut")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
