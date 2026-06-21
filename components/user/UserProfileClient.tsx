"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  User,
  Shield,
  BookOpen
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { useToast } from "@/components/ui/Toast";
import type { StampEntry, SavedEntry } from "@/lib/types";

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

export const CRESTS: Crest[] = [
  {
    id: "tomoe",
    name_ja: "三つ巴",
    name_en: "Mitsudomoe",
    meaning: "Cosmic Flow & Protection",
    description: "The triple swirl represents the alignment of heaven, earth, and humanity, associated with Hachiman (deity of warriors) and protection from lightning and fire.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 50,10 A 40,40 0 0,0 15.36,70 A 20,20 0 0,1 35.36,50 A 20,20 0 0,0 50,10 Z" />
        <path d="M 15.36,70 A 40,40 0 0,0 84.64,70 A 20,20 0 0,1 50,50 A 20,20 0 0,0 15.36,70 Z" />
        <path d="M 84.64,70 A 40,40 0 0,0 50,10 A 20,20 0 0,1 64.64,50 A 20,20 0 0,0 84.64,70 Z" />
        <circle cx="50" cy="50" r="6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "matsu",
    name_ja: "松",
    name_en: "Matsu",
    meaning: "Longevity & Resilience",
    description: "The evergreen pine tree represents longevity, steadfastness, and enduring strength through harsh winters.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 50,22 C 40,22 34,28 34,35 C 34,42 42,46 50,42 C 58,46 66,42 66,35 C 66,28 60,22 50,22 Z" />
        <path d="M 32,48 C 22,48 16,54 16,61 C 16,68 24,72 32,68 C 40,72 48,68 48,61 C 48,54 42,48 32,48 Z" />
        <path d="M 68,48 C 58,48 52,54 52,61 C 52,68 60,72 68,72 C 76,72 84,68 84,61 C 84,54 78,48 68,48 Z" />
        <path d="M 50,42 L 50,75 M 32,68 L 50,75 M 68,68 L 50,75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "sakura",
    name_ja: "桜",
    name_en: "Sakura",
    meaning: "Ephemeral Beauty & Life",
    description: "The cherry blossom is a central motif of Japanese aesthetics, celebrating fleeting grace, renewal, and the exquisite transience of life.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path d="M 50,42 C 43,26 46,14 49,16 C 50,14 50,14 51,16 C 54,14 57,26 50,42 Z" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "ume",
    name_ja: "梅",
    name_en: "Ume",
    meaning: "Elegance & Scholarly Devotion",
    description: "Plum blossoms bloom in late winter snows, representing loyalty, intellectual dedication, and elegance under adversity. Dedicated to Tenjin, the patron kami of learning.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="50" cy="50" r="7" fill="currentColor" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path d="M 50,43 C 40,38 38,20 50,20 C 62,20 60,38 50,43 Z" />
            <line x1="50" y1="43" x2="50" y2="24" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="22" r="2" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "kiku",
    name_ja: "菊",
    name_en: "Kiku",
    meaning: "Nobility & Perfect Order",
    description: "The chrysanthemum represents the autumn season, royalty, high status, and immaculate geometric order.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="50" cy="50" r="10" fill="currentColor" />
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 22.5} 50 50)`}>
            <path d="M 50,43 C 48,34 48,15 50,12 C 52,15 52,34 50,43 Z" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "fuji",
    name_ja: "藤",
    name_en: "Fuji",
    meaning: "Grace & Welcoming Abundance",
    description: "Hanging wisteria flower clusters represent warm hospitality, elegance, and deep-rooted spiritual connection.",
    render: (className) => (
      <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 50,15 C 30,15 20,30 20,50 C 20,65 32,75 42,75 L 42,70 C 35,70 25,62 25,50 C 25,35 33,20 50,20 Z" />
        <path d="M 50,15 C 70,15 80,30 80,50 C 80,65 68,75 58,75 L 58,70 C 65,70 75,62 75,50 C 75,35 67,20 50,20 Z" />
        <circle cx="21" cy="40" r="3.5" />
        <circle cx="23" cy="50" r="3.5" />
        <circle cx="28" cy="60" r="3" />
        <circle cx="35" cy="68" r="3" />
        <circle cx="79" cy="40" r="3.5" />
        <circle cx="77" cy="50" r="3.5" />
        <circle cx="72" cy="60" r="3" />
        <circle cx="65" cy="68" r="3" />
        <path d="M 45,15 C 50,10 50,10 55,15 L 50,25 Z" />
      </svg>
    ),
  },
];

// Helper to format date
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

interface UserProfileClientProps {
  user: CurrentUser;
  stamped: StampEntry[];
  saved: SavedEntry[];
  totalShrines: number;
}

export default function UserProfileClient({
  user,
  stamped,
  saved,
  totalShrines,
}: UserProfileClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Tab State
  const [activeTab, setActiveTab] = useState<"stamps" | "saved" | "journey">("stamps");

  // Chronicle Expansion State (Prefectures and long lists of Shrines)
  const [collapsedPrefs, setCollapsedPrefs] = useState<Record<string, boolean>>({});
  const [expandedShrinesPref, setExpandedShrinesPref] = useState<Record<string, boolean>>({});

  const togglePrefCollapse = (prefName: string) => {
    setCollapsedPrefs((prev) => ({ ...prev, [prefName]: !prev[prefName] }));
  };

  const toggleShrinesExpand = (prefName: string) => {
    setExpandedShrinesPref((prev) => ({ ...prev, [prefName]: !prev[prefName] }));
  };

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [selectedCrestId, setSelectedCrestId] = useState("tomoe");

  // Load avatar crest preference from localstorage on mount
  useEffect(() => {
    const savedCrest = localStorage.getItem(`crest_${user.id}`);
    if (savedCrest && CRESTS.some((c) => c.id === savedCrest)) {
      setSelectedCrestId(savedCrest);
    }
  }, [user.id]);

  const activeCrest = CRESTS.find((c) => c.id === selectedCrestId) || CRESTS[0];

  // Pilgrim Status Level Calculations
  const stampCount = stamped.length;
  let statusLevel = 0;
  let statusNameEn = "Novice Pilgrim";
  let statusNameJa = "駆け出しの巡礼者";
  let statusDesc = "Your pilgrimage has just begun. Cross the threshold and collect your first goshuin stamp.";
  let progressPercentage = 0;
  let nextGoal = 1;

  if (stampCount >= 9) {
    statusLevel = 3;
    statusNameEn = "Master of Goshuin";
    statusNameJa = "御朱印の達人";
    statusDesc = "A revered traveler who has accumulated divine grace across the islands of Japan.";
    progressPercentage = 100;
    nextGoal = 9;
  } else if (stampCount >= 4) {
    statusLevel = 2;
    statusNameEn = "Dedicated Devotee";
    statusNameJa = "誠実な信者";
    statusDesc = "Your footsteps fall in deep rhythm with the sanctuaries. The kami guide your journey.";
    progressPercentage = Math.min(((stampCount - 4) / 5) * 100, 99);
    nextGoal = 9;
  } else if (stampCount >= 1) {
    statusLevel = 1;
    statusNameEn = "Sanctuary Wanderer";
    statusNameJa = "鳥居の旅人";
    statusDesc = "You have unlocked the seal catalog and begun collecting sacred calligraphy marks.";
    progressPercentage = Math.min(((stampCount - 1) / 3) * 100, 99);
    nextGoal = 4;
  } else {
    statusLevel = 0;
    statusNameEn = "Novice Pilgrim";
    statusNameJa = "駆け出しの巡礼者";
    statusDesc = "Your pilgrimage has just begun. Cross the threshold and collect your first goshuin stamp.";
    progressPercentage = 0;
    nextGoal = 1;
  }

  // Calculate statistics
  const wishlistCount = saved.length;
  const coveragePercentage = totalShrines > 0 ? Math.round((stampCount / totalShrines) * 100) : 0;

  // Compile visited prefectures
  const visitedPrefecturesMap = stamped.reduce((acc, s) => {
    acc[s.prefecture] = (acc[s.prefecture] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const visitedPrefectures = Object.entries(visitedPrefecturesMap).sort((a, b) => b[1] - a[1]);

  // Compile deities met
  const deitiesMet = Array.from(
    new Map(
      stamped
        .filter((s) => s.primary_deity)
        .map((s) => [s.primary_deity!.name_en, s.primary_deity!])
    ).values()
  );

  // Compile achievements
  const achievements = [
    {
      id: "first_stamp",
      title_en: "First Steps",
      title_ja: "初参拝",
      description: "Affix your first sacred seal in your Goshuin Stamp Book.",
      isUnlocked: stampCount >= 1,
      icon: Stamp,
    },
    {
      id: "explorer",
      title_en: "Sanctuary Explorer",
      title_ja: "神域の探求者",
      description: "Visit at least 5 sanctuaries and collect their seals.",
      isUnlocked: stampCount >= 5,
      icon: BookOpen,
    },
    {
      id: "cross_pref",
      title_en: "Cross-Prefectural Pilgrim",
      title_ja: "国境越えの巡礼",
      description: "Visit shrines in 2 or more different prefectures.",
      isUnlocked: visitedPrefectures.length >= 2,
      icon: MapIcon,
    },
    {
      id: "pantheon",
      title_en: "Pantheon Seeker",
      title_ja: "神話の語り手",
      description: "Visit a shrine dedicated to a major deity (Amaterasu, Susanoo, or Inari).",
      isUnlocked: stamped.some((s) => {
        const name = s.primary_deity?.name_en?.toLowerCase() || "";
        const targetDeities = ["amaterasu", "susanoo", "inari", "ugajin", "okuninushi"];
        return targetDeities.some((d) => name.includes(d));
      }),
      icon: Sparkles,
    },
    {
      id: "grand_shrine",
      title_en: "Imperial Communion",
      title_ja: "大社・神宮参拝",
      description: "Visit a Grand Shrine (Taisha 大社) or Imperial Shrine (Jingū 神宮).",
      isUnlocked: stamped.some((s) => {
        const nameEn = s.name_en.toLowerCase();
        const nameJa = s.name_ja || "";
        return (
          nameEn.includes("jingu") ||
          nameEn.includes("taisha") ||
          nameEn.includes("grand shrine") ||
          nameJa.includes("神宮") ||
          nameJa.includes("大社")
        );
      }),
      icon: Award,
    },
  ];

  // Sign out handle
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.notify("Signed out successfully", "success");
      router.push("/");
      router.refresh();
    } catch {
      toast.notify("Could not sign out", "error");
      setSigningOut(false);
    }
  }

  // Handle Edit profile submit
  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      toast.notify("Name cannot be empty", "error");
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await authClient.updateUser({
          name: editName.trim(),
        });

        if (error) {
          toast.notify(error.message || "Failed to update profile", "error");
          return;
        }

        // Save crest to local storage
        localStorage.setItem(`crest_${user.id}`, selectedCrestId);
        toast.notify("Pilgrim pass updated successfully", "success");
        setIsEditOpen(false);
        router.refresh();
      } catch (err) {
        toast.notify("An unexpected error occurred", "error");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      {/* =======================================================================
          PILGRIM SANCTUARY PASS (HEADER CARD)
          ======================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="wabi-sabi-card washi-paper sumi-shadow rounded-3xl p-6 md:p-8 relative overflow-hidden"
      >
        {/* Japanese Shinto Sanctuary aesthetic corners */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-torii/30 pointer-events-none" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-torii/30 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-torii/30 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-torii/30 pointer-events-none" />

        {/* Diagonal textured backing strip */}
        <div className="absolute -right-16 -top-16 w-44 h-44 bg-torii/5 rotate-45 pointer-events-none border border-dashed border-torii/15" />

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          {/* Avatar Octagon Frame */}
          <div className="relative group shrink-0">
            <motion.div
              whileHover={{ scale: 1.03, rotate: 1.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-28 h-28 md:w-32 md:h-32 bg-moss/5 flex items-center justify-center relative shadow-xs transition-all border border-moss/15 cursor-pointer hover:border-torii/40"
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
                <div className="w-16 h-16 md:w-20 md:h-20 opacity-85 transition-transform group-hover:scale-105 group-hover:opacity-100 relative z-10">
                  {activeCrest.render("w-full h-full")}
                </div>
              </div>
            </motion.div>

            {/* Edit avatar tooltip/badge */}
            <button
              onClick={() => setIsEditOpen(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full border border-moss/10 bg-washi text-moss-light shadow-xs hover:text-torii hover:scale-110 transition-all cursor-pointer"
              aria-label="Edit Profile"
            >
              <Edit2 size={13} />
            </button>
          </div>

          {/* Profile Pass details */}
          <div className="flex-1 w-full space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3 text-center md:text-left">
                  <h1 className="font-display text-3xl font-black tracking-wide text-stone">
                    {user.name || "Anonymous Pilgrim"}
                  </h1>
                  <span
                    className={`rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-dashed ${
                      user.isAdmin
                        ? "border-torii/40 bg-torii/5 text-torii"
                        : "border-moss/30 bg-moss/5 text-moss-light"
                    }`}
                  >
                    {user.isAdmin ? "Sanctuary Guardian" : "Pilgrim"}
                  </span>
                </div>

                {/* Inline Action Row - Smaller and placed next to name */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-moss/20 bg-washi/90 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone hover:text-torii hover:border-torii transition-colors shadow-3xs cursor-pointer"
                  >
                    <Edit2 size={11} />
                    Edit Record
                  </button>
                  <button
                    disabled={signingOut}
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-moss/25 hover:bg-torii/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-moss-light hover:text-torii hover:border-torii/40 transition-colors cursor-pointer"
                  >
                    <LogOut size={11} />
                    {signingOut ? "Leaving…" : "Leave"}
                  </button>
                </div>
              </div>
              <p className="text-xs font-mono text-moss-light/70 tracking-wider text-center md:text-left">
                {user.email}
              </p>
            </div>

            {/* Pilgrim Level Badge */}
            <div className="w-full">
              <div className="flex flex-col items-center md:items-start p-3 rounded-xl border border-bamboo/15 bg-bamboo-light/20 w-full">
                <div className="flex items-center gap-2">
                  <Award size={15} className="text-torii" />
                  <span className="font-serif text-sm font-bold text-stone tracking-wide">
                    {statusNameEn} <span className="font-serif text-xs text-torii ml-1">({statusNameJa})</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone/75 mt-1 leading-normal text-center md:text-left">
                  {statusDesc}
                </p>
                
                {/* Progress Bar to next level */}
                {stampCount < 9 && (
                  <div className="w-full mt-2 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono tracking-widest text-moss-light/80">
                      <span>PROGRESS TO NEXT RANK</span>
                      <span>{stampCount} / {nextGoal} STAMPS</span>
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
        <div className="grid grid-cols-3 gap-3 border-t border-moss/10 pt-6 mt-8">
          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Stamp size={16} />
            </div>
            <div className="font-sans text-2xl font-extrabold text-stone">{stampCount}</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">Stamps</div>
          </div>

          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Heart size={16} />
            </div>
            <div className="font-sans text-2xl font-extrabold text-stone">{wishlistCount}</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">Wishlist</div>
          </div>

          <div className="text-center p-3 rounded-xl bg-washi/50 border border-moss/5">
            <div className="flex justify-center text-torii mb-1">
              <Award size={16} />
            </div>
            <div className="font-sans text-2xl font-extrabold text-stone">{coveragePercentage}%</div>
            <div className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold">Coverage</div>
          </div>
        </div>
      </motion.div>

      {/* =======================================================================
          TABBED CONTENTS SELECTOR (EMA TABLETS)
          ======================================================================= */}
      <div className="mt-12">
        <div className="flex justify-center border-b border-moss/15 gap-4 md:gap-8 select-none overflow-x-auto pb-px">
          {([
            { id: "stamps", label: "御朱印帳", sub: "Stamp Book", count: stampCount },
            { id: "saved", label: "お気に入り", sub: "Wishlist", count: wishlistCount },
            { id: "journey", label: "巡礼の旅路", sub: "Pilgrim Log", count: null },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative pb-3 flex flex-col items-center group cursor-pointer"
            >
              <span
                className={`font-serif text-sm tracking-wider transition-colors ${
                  activeTab === tab.id ? "text-torii font-bold" : "text-moss-light/80 hover:text-torii"
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
        <div className="mt-8">
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
                    <h3 className="font-serif text-base font-bold text-stone">No sacred seals collected</h3>
                    <p className="text-xs text-stone/60 max-w-xs mx-auto mt-2 leading-relaxed">
                      Your goshuin stamp book is currently empty. Visit one of the sanctuaries to receive their red hanko seals.
                    </p>
                    <Link
                      href="/shrines"
                      className="inline-flex items-center gap-1 mt-6 text-xs font-mono font-black uppercase tracking-widest text-torii hover:text-torii-dark hover:underline"
                    >
                      Search Sanctuaries <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stamped.map((item) => {
                      const firstKanji = item.name_ja ? item.name_ja.charAt(0) : "神";
                      return (
                        <motion.div
                          key={item.slug}
                          whileHover={{ y: -3, scale: 1.01 }}
                          className="wabi-sabi-card washi-paper rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group shadow-3xs hover:border-torii/30 hover:shadow-xs"
                        >
                          {/* Left: Authentic Red Hanko Seal stamp graphic */}
                          <div className="relative shrink-0 select-none">
                            {/* Seal boundary */}
                            <div className="hanko-seal w-16 h-16 rounded-md flex flex-col items-center justify-center p-1 border-[2.5px] border-torii text-torii font-serif font-black relative overflow-hidden bg-transparent shadow-xs transition-transform duration-300 group-hover:rotate-3">
                              {/* Distress grunge overlay to simulate paper stamp bleed */}
                              <div
                                className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none"
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                }}
                              />
                              <span className="text-xl leading-none">{firstKanji}</span>
                              <span className="text-[8px] font-sans tracking-tight leading-none mt-0.5 opacity-80 uppercase">印</span>
                            </div>
                          </div>

                          {/* Right: Shrine Details */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/shrines/${item.slug}`} className="group-hover:text-torii transition-colors">
                              <h4 className="font-serif text-sm font-bold text-stone truncate leading-snug tracking-wide">
                                {item.name_en}
                              </h4>
                              {item.name_ja && (
                                <p
                                  className="font-serif text-xs text-torii-dark/70 tracking-wider leading-none mt-0.5"
                                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                                >
                                  {item.name_ja}
                                </p>
                              )}
                            </Link>
                            
                            <div className="flex items-center gap-1.5 text-[10px] text-stone/55 mt-2">
                              <MapPin size={11} className="text-moss-light/60" />
                              <span className="truncate">
                                {[item.city, item.prefecture].filter(Boolean).join(", ")}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[9px] font-mono tracking-widest text-moss-light uppercase mt-1">
                              <Calendar size={10} className="opacity-70" />
                              <span>COLLECTED {formatDate(item.stamped_at)}</span>
                            </div>
                          </div>
                          
                          {/* Small hover arrow */}
                          <Link
                            href={`/shrines/${item.slug}`}
                            className="p-1 rounded-full border border-moss/10 bg-washi opacity-0 group-hover:opacity-100 group-hover:text-torii hover:scale-110 transition-all ml-2"
                            aria-label={`View ${item.name_en}`}
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
                    <h3 className="font-serif text-base font-bold text-stone">Wishlist is empty</h3>
                    <p className="text-xs text-stone/60 max-w-xs mx-auto mt-2 leading-relaxed">
                      Tap the heart icon on any shrine detail page to save it for your next pilgrimage visit.
                    </p>
                    <Link
                      href="/shrines"
                      className="inline-flex items-center gap-1 mt-6 text-xs font-mono font-black uppercase tracking-widest text-torii hover:text-torii-dark hover:underline"
                    >
                      Search Sanctuaries <ChevronRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {saved.map((item) => (
                      <motion.div
                        key={item.slug}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className="wabi-sabi-card washi-paper rounded-xl p-4.5 flex flex-col justify-between group shadow-3xs hover:border-torii/30"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <Link href={`/shrines/${item.slug}`} className="group-hover:text-torii transition-colors min-w-0">
                              <h4 className="font-serif text-sm font-bold text-stone leading-snug group-hover:text-torii truncate tracking-wide">
                                {item.name_en}
                              </h4>
                              {item.name_ja && (
                                <p
                                  className="font-serif text-[11px] text-torii-dark/70 tracking-wider mt-0.5 truncate"
                                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                                >
                                  {item.name_ja}
                                </p>
                              )}
                            </Link>
                            <Heart size={14} className="text-torii fill-torii shrink-0" />
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-stone/55 mt-3">
                            <MapPin size={11} className="text-moss-light/60" />
                            <span className="truncate">
                              {[item.city, item.prefecture].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-moss/5 mt-4 pt-3.5 flex justify-between items-center">
                          <span className="text-[8px] font-mono tracking-widest text-moss-light/70 uppercase">
                            SAVED {formatDate(item.saved_at)}
                          </span>
                          <Link
                            href={`/shrines/${item.slug}`}
                            className="text-[10px] font-mono font-black uppercase tracking-widest text-stone hover:text-torii inline-flex items-center gap-0.5"
                          >
                            VISIT <ChevronRight size={10} />
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
                {/* Achievements List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={18} className="text-torii" />
                    <h3 className="font-display text-lg font-black text-stone">Sacred Milestones</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((a) => {
                      const Icon = a.icon;
                      return (
                        <div
                          key={a.id}
                          className={`wabi-sabi-card rounded-2xl p-4.5 flex gap-4 transition-all relative overflow-hidden ${
                            a.isUnlocked
                              ? "bg-washi/90 border-bamboo/25 text-stone"
                              : "bg-stone/5 border-moss/10 opacity-60 text-stone/50"
                          }`}
                        >
                          {/* Ribbon or unlock banner */}
                          {a.isUnlocked && (
                            <div className="absolute -right-8 -top-8 w-16 h-16 bg-bamboo/10 rotate-45 border border-dashed border-bamboo/20 pointer-events-none" />
                          )}

                          {/* Icon container */}
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                              a.isUnlocked
                                ? "border-bamboo/30 bg-bamboo-light text-bamboo"
                                : "border-moss/15 bg-stone/5 text-stone/40"
                            }`}
                          >
                            <Icon size={20} />
                          </div>

                          {/* Prose details */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-sans text-xs font-bold uppercase tracking-wider ${a.isUnlocked ? "text-stone" : "text-stone/60"}`}>
                                {a.title_en}
                              </h4>
                              <span className="font-serif text-[10px] text-torii">({a.title_ja})</span>
                            </div>
                            <p className="text-[11px] text-stone/75 leading-relaxed">
                              {a.description}
                            </p>
                            
                            <div className="flex items-center gap-1 pt-1 text-[9px] font-mono tracking-widest">
                              {a.isUnlocked ? (
                                <span className="text-bamboo font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> UNLOCKED
                                </span>
                              ) : (
                                <span className="text-stone/40 font-bold flex items-center gap-0.5">
                                  <Lock size={10} /> LOCKED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pilgrimage Chronicle (巡礼の記録) */}
                <div className="border-t border-moss/10 pt-8 mt-4">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen size={18} className="text-torii" />
                    <h3 className="font-display text-lg font-black text-stone">Pilgrimage Chronicle (巡礼の記録)</h3>
                  </div>

                  {stamped.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-moss/20 bg-stone/5 p-8 text-center text-xs text-stone/55 italic">
                      Your chronicle is unwritten. Visit a sanctuary and collect a seal to begin.
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-moss/15 ml-3 space-y-8">
                      {Object.entries(
                        stamped.reduce((acc, stamp) => {
                          const pref = stamp.prefecture;
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
                            <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border border-torii bg-washi flex items-center justify-center">
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
                              <h4 className="font-display text-lg font-black text-stone flex items-baseline gap-2 select-none">
                                {prefName}
                                <span className="font-serif text-xs text-torii font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                                  {prefStamps[0]?.region || ""}
                                </span>
                              </h4>
                              <span className="text-[9px] font-mono tracking-widest text-moss-light/60 uppercase font-bold ml-auto group-hover:text-torii transition-colors select-none">
                                {isCollapsed ? "Expand" : "Collapse"} ({prefStamps.length} visits)
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
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {displayStamps.map((stamp) => (
                                      <div
                                        key={stamp.slug}
                                        className="wabi-sabi-card washi-paper rounded-xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-torii/30 transition-all"
                                      >
                                        <div className="space-y-2">
                                          <Link href={`/shrines/${stamp.slug}`} className="group-hover:text-torii transition-colors block">
                                            <span className="font-serif text-sm font-bold text-stone truncate block group-hover:text-torii tracking-wide">
                                              {stamp.name_en}
                                            </span>
                                            {stamp.name_ja && (
                                              <span
                                                className="font-serif text-[11px] text-torii-dark/70 tracking-wider truncate block"
                                                style={{ fontFamily: "'Noto Serif JP', serif" }}
                                              >
                                                {stamp.name_ja}
                                              </span>
                                            )}
                                          </Link>

                                          {stamp.primary_deity && (
                                            <div className="pt-2 border-t border-moss/5 flex flex-col">
                                              <span className="text-[8px] font-mono tracking-widest text-moss-light/80 uppercase font-bold">
                                                Enshrined Kami
                                              </span>
                                              <span className="text-xs font-bold text-stone mt-0.5 flex items-center gap-1.5">
                                                <Sparkles size={11} className="text-torii/75 shrink-0" />
                                                {stamp.primary_deity.name_en}
                                                {stamp.primary_deity.name_ja && (
                                                  <span className="font-serif text-[10px] text-stone/50 font-normal">
                                                    ({stamp.primary_deity.name_ja})
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="mt-4 pt-2.5 border-t border-moss/5 flex items-center justify-between text-[9px] font-mono tracking-widest text-stone/50 uppercase">
                                          <span>Visited {formatDate(stamp.stamped_at)}</span>
                                          <Link
                                            href={`/shrines/${stamp.slug}`}
                                            className="text-torii font-bold hover:underline inline-flex items-center gap-0.5"
                                          >
                                            VIEW <ChevronRight size={10} />
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Expand / Collapse items toggle */}
                                  {hasMore && (
                                    <button
                                      onClick={() => toggleShrinesExpand(prefName)}
                                      className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-moss/20 hover:border-torii/40 text-[9px] font-mono font-bold tracking-widest text-moss-light/80 hover:text-torii bg-washi/40 transition-colors uppercase cursor-pointer"
                                    >
                                      {isExpanded
                                        ? "Collapse extra entries"
                                        : `Show ${prefStamps.length - 6} more entries`}
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
      </div>

      {/* =======================================================================
          EDIT PROFILE MODAL
          ======================================================================= */}
      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="wabi-sabi-card washi-paper sumi-shadow rounded-2xl w-full max-w-lg p-6 md:p-8 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Corner boundaries */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-torii/20 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-torii/20 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-torii/20 pointer-events-none" />

              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-black text-stone">Edit Pilgrimage Record</h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-full text-stone/50 hover:text-torii hover:bg-stone/5 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Display Name Input */}
                <div className="space-y-1.5">
                  <label htmlFor="pilgrim-name" className="block text-[11px] font-bold uppercase tracking-widest text-moss-light">
                    Pilgrim Name (お名前)
                  </label>
                  <input
                    id="pilgrim-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-sm text-stone outline-none transition-all placeholder:text-moss-light/50 focus:border-torii focus:ring-3 focus:ring-torii/10 focus:bg-washi/90"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Crest Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-moss-light">
                    Pilgrim Crest (紋章 / アバター)
                  </label>
                  <p className="text-[10px] text-stone/60 leading-normal mb-3">
                    Choose a traditional Kamon symbol to represent your spirit on this pilgrimage pass.
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
                    SIGNIFICANCE OF {activeCrest.name_en} ({activeCrest.name_ja})
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
                    Cancel
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
                        Applying…
                      </>
                    ) : (
                      "Apply Changes"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
