import type { StampEntry, SavedEntry } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

/**
 * Sacred Milestones — a derived achievement catalog for the profile page.
 *
 * Pure logic, React-free (icons are string keys mapped to components in the client
 * component). Unlock state is **derived** from the user's collections on every render —
 * nothing is persisted, so there is no drift. Milestone definitions live here as the
 * single source of truth; `evaluateMilestones` runs each predicate over a context built
 * once from the collections by `buildMilestoneContext`.
 *
 * Deity matching is intentionally heuristic (English substring + kanji substring) — these
 * are cosmetic badges, not exact identity assertions.
 */

export interface MilestoneContext {
  stampCount: number;
  savedCount: number;
  prefectures: Set<string>;
  regions: Set<string>;
  /** Lowercased English names of primary deities across stamped shrines. */
  primaryDeities: string[];
  /** Kanji names of all deities (primary + enshrined) across stamped shrines. */
  deityJa: Set<string>;
  /** Union of rank codes (rank `name_en`) across stamped shrines. */
  ranks: Set<string>;
  /** Union of prayer-category group labels (e.g. "Love & Family"). */
  categoryGroups: Set<string>;
  coveragePct: number;
  distinctDeityCount: number;
  maxStampsInOneDay: number;
  distinctMonths: number;
  hasNewYearStamp: boolean;
  /** Totals across the catalog (shrines that actually exist), for "visit all …" goals. */
  totalRegions: number;
  totalPrefectures: number;
}

export interface MilestoneTotals {
  totalShrines: number;
  totalRegions: number;
  totalPrefectures: number;
}

export interface Milestone {
  id: string;
  title_en: string;
  title_ja: string;
  description: string;
  description_ja: string;
  /** Icon key, mapped to a lucide component in the client. */
  icon: string;
  group: string;
  evaluate: (c: MilestoneContext) => boolean;
  /**
   * Progress toward the goal, for the card's progress bar. Count-style milestones
   * (e.g. "collect 5 seals") define this so the bar fills gradually. Boolean-style
   * milestones (e.g. "visit a shrine of Amaterasu") omit it and render 0% / 100%.
   */
  progress?: (c: MilestoneContext) => { current: number; target: number };
}

/** Build the evaluation context once from the user's collections. Pure. */
export function buildMilestoneContext(
  stamped: StampEntry[],
  saved: SavedEntry[],
  totals: MilestoneTotals,
): MilestoneContext {
  const prefectures = new Set<string>();
  const regions = new Set<string>();
  const primaryDeities: string[] = [];
  const deityJa = new Set<string>();
  const ranks = new Set<string>();
  const categoryGroups = new Set<string>();
  const distinctPrimary = new Set<string>();
  const byDay = new Map<string, number>();
  const months = new Set<string>();
  let hasNewYearStamp = false;

  for (const s of stamped) {
    if (s.prefecture.name_en) prefectures.add(s.prefecture.name_en);
    if (s.region.name_en) regions.add(s.region.name_en);
    if (s.primary_deity) {
      const en = normName(s.primary_deity.name_en);
      primaryDeities.push(en);
      distinctPrimary.add(en);
      if (s.primary_deity.name_ja) deityJa.add(s.primary_deity.name_ja);
    }
    for (const k of s.deity_ja) deityJa.add(k);
    for (const r of s.rank_codes) ranks.add(r);
    for (const c of s.categories) categoryGroups.add(c.group_label);

    // Temporal signals from the ISO `stamped_at` (YYYY-MM-DDTHH:MM:SS…).
    const iso = s.stamped_at;
    const day = iso.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    months.add(iso.slice(0, 7));
    const mm = iso.slice(5, 7);
    const dd = iso.slice(8, 10);
    if (mm === "01" && (dd === "01" || dd === "02" || dd === "03")) hasNewYearStamp = true;
  }

  const maxStampsInOneDay = byDay.size ? Math.max(...byDay.values()) : 0;
  const coveragePct = totals.totalShrines > 0 ? (stamped.length / totals.totalShrines) * 100 : 0;

  return {
    stampCount: stamped.length,
    savedCount: saved.length,
    prefectures,
    regions,
    primaryDeities,
    deityJa,
    ranks,
    categoryGroups,
    coveragePct,
    distinctDeityCount: distinctPrimary.size,
    maxStampsInOneDay,
    distinctMonths: months.size,
    hasNewYearStamp,
    totalRegions: totals.totalRegions,
    totalPrefectures: totals.totalPrefectures,
  };
}

// --- Predicate helpers ---

/** Lowercase + strip Latin diacritics (macrons), so "Ōkuninushi" matches "okuninushi". */
function normName(s: string): string {
  // After NFD, accents become combining marks (U+0300–U+036F); drop them by codepoint.
  return Array.from(s.normalize("NFD"))
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 0x0300 || c > 0x036f;
    })
    .join("")
    .toLowerCase();
}

/**
 * True if any visited shrine enshrines a matching deity — by English name (diacritic-
 * insensitive substring, against the primary deity) or by kanji (substring, against any
 * enshrined deity). Needles are matched as substrings to tolerate alt spellings/honorifics.
 */
function hasDeity(c: MilestoneContext, en: string[], ja: string[]): boolean {
  if (c.primaryDeities.some((n) => en.some((needle) => n.includes(needle)))) return true;
  for (const stored of c.deityJa) {
    if (ja.some((needle) => stored.includes(needle))) return true;
  }
  return false;
}

/** True if any visited shrine carries a rank whose code includes the token. */
function hasRankIncluding(c: MilestoneContext, token: string): boolean {
  for (const r of c.ranks) if (r.includes(token)) return true;
  return false;
}

export const MILESTONES: Milestone[] = [
  // NOTE: stamp-count milestones ("collect goshuin at N shrines") are NOT here — they power
  // the profile's headline level badge instead (see PILGRIM_RANKS below), so the two surfaces
  // never duplicate each other.

  // --- Geographic breadth ---
  { id: "pref_2", title_en: "Cross-Prefectural Pilgrim", title_ja: "国境越えの巡礼", icon: "mapPin", group: "Geography",
    description: "Visit shrines in 2 or more prefectures.",
    description_ja: "2つ以上の都道府県で神社を参拝する。",
    evaluate: (c) => c.prefectures.size >= 2, progress: (c) => ({ current: c.prefectures.size, target: 2 }) },
  { id: "pref_5", title_en: "Provincial Voyager", title_ja: "五国巡遊", icon: "map", group: "Geography",
    description: "Visit shrines in 5 or more prefectures.",
    description_ja: "5つ以上の都道府県で神社を参拝する。",
    evaluate: (c) => c.prefectures.size >= 5, progress: (c) => ({ current: c.prefectures.size, target: 5 }) },
  { id: "pref_10", title_en: "Ten Provinces", title_ja: "十国巡拝", icon: "map", group: "Geography",
    description: "Visit shrines in 10 or more prefectures.",
    description_ja: "10の都道府県以上で神社を参拝する。",
    evaluate: (c) => c.prefectures.size >= 10, progress: (c) => ({ current: c.prefectures.size, target: 10 }) },
  { id: "pref_20", title_en: "Twenty Provinces", title_ja: "二十国巡拝", icon: "map", group: "Geography",
    description: "Visit shrines in 20 or more prefectures.",
    description_ja: "20の都道府県以上で神社を参拝する。",
    evaluate: (c) => c.prefectures.size >= 20, progress: (c) => ({ current: c.prefectures.size, target: 20 }) },
  { id: "pref_30", title_en: "Thirty Provinces", title_ja: "三十国巡拝", icon: "mountain", group: "Geography",
    description: "Visit shrines in 30 or more prefectures.",
    description_ja: "30の都道府県以上で神社を参拝する。",
    evaluate: (c) => c.prefectures.size >= 30, progress: (c) => ({ current: c.prefectures.size, target: 30 }) },
  { id: "region_3", title_en: "Island Hopper", title_ja: "地方巡り", icon: "globe", group: "Geography",
    description: "Visit shrines across 3 or more regions of Japan.",
    description_ja: "日本の3つ以上の地方にまたがって神社を参拝する。",
    evaluate: (c) => c.regions.size >= 3, progress: (c) => ({ current: c.regions.size, target: 3 }) },
  { id: "region_5", title_en: "Five Regions", title_ja: "五地方巡拝", icon: "globe", group: "Geography",
    description: "Visit shrines across 5 or more regions of Japan.",
    description_ja: "日本の5つ以上の地方にまたがって神社を参拝する。",
    evaluate: (c) => c.regions.size >= 5, progress: (c) => ({ current: c.regions.size, target: 5 }) },
  { id: "all_regions", title_en: "Realm Spanner", title_ja: "全地方制覇", icon: "compass", group: "Geography",
    description: "Visit a shrine in every one of Japan's 8 regions.",
    description_ja: "日本の8地方すべてで神社を参拝する。",
    evaluate: (c) => c.totalRegions > 0 && c.regions.size >= c.totalRegions,
    progress: (c) => ({ current: c.regions.size, target: c.totalRegions }) },
  { id: "all_prefectures", title_en: "Nationwide Devotion", title_ja: "全国制覇", icon: "crown", group: "Geography",
    description: "Visit a shrine in all 47 prefectures of Japan — the ultimate pilgrimage.",
    description_ja: "日本全国47都道府県すべてで神社を参拝する — 巡礼の集大成。",
    evaluate: (c) => c.totalPrefectures > 0 && c.prefectures.size >= c.totalPrefectures,
    progress: (c) => ({ current: c.prefectures.size, target: c.totalPrefectures }) },

  // --- Rank / prestige ---
  { id: "taisha", title_en: "Grand Shrine Visitor", title_ja: "大社参拝", icon: "landmark", group: "Prestige",
    description: "Visit a Grand Shrine (Taisha 大社).",
    description_ja: "大社(たいしゃ)を参拝する。",
    evaluate: (c) => hasRankIncluding(c, "Taisha") },
  { id: "ichinomiya", title_en: "Provincial Crown", title_ja: "一宮参拝", icon: "award", group: "Prestige",
    description: "Visit an Ichinomiya (一宮), a province's highest shrine.",
    description_ja: "その国で最も格式高い神社、一宮(いちのみや)を参拝する。",
    evaluate: (c) => c.ranks.has("Ichinomiya") },
  { id: "honso", title_en: "Heart of Shinto", title_ja: "本宗参拝", icon: "crown", group: "Prestige",
    description: "Visit the Honso (本宗), supreme head shrine of all Shinto.",
    description_ja: "神道の総本宗、本宗(ほんそう)を参拝する。",
    evaluate: (c) => c.ranks.has("Honso") },
  { id: "imperial", title_en: "Imperial Communion", title_ja: "官国幣社参拝", icon: "shield", group: "Prestige",
    description: "Visit an Imperial or National shrine (Kanpei / Kokuhei).",
    description_ja: "旧社格の官幣社・国幣社(かんぺい・こくへい)を参拝する。",
    evaluate: (c) => hasRankIncluding(c, "Kanpei-") || hasRankIncluding(c, "Kokuhei-") },
  { id: "rank_variety", title_en: "Hierarch of Shrines", title_ja: "社格巡達", icon: "landmark", group: "Prestige",
    description: "Visit shrines spanning 5 or more different shrine ranks.",
    description_ja: "5つ以上の異なる社格の神社を参拝する。",
    evaluate: (c) => c.ranks.size >= 5, progress: (c) => ({ current: c.ranks.size, target: 5 }) },

  // --- Deity-themed ---
  { id: "amaterasu", title_en: "Child of the Sun", title_ja: "天照大神", icon: "sun", group: "Deities",
    description: "Visit a shrine of Amaterasu, the sun goddess and supreme kami.",
    description_ja: "太陽の女神にして最高神、天照大神を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["amaterasu"], ["天照"]) },
  { id: "inari", title_en: "Fox Messenger", title_ja: "稲荷信仰", icon: "flame", group: "Deities",
    description: "Visit a shrine of Inari, kami of rice, prosperity & foxes.",
    description_ja: "稲・商売繁盛・狐を司る稲荷神を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["inari"], ["稲荷", "宇迦"]) },
  { id: "hachiman", title_en: "Banner of Hachiman", title_ja: "八幡信仰", icon: "flag", group: "Deities",
    description: "Visit a shrine of Hachiman, divine protector of warriors.",
    description_ja: "武士の守護神、八幡神を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["hachiman"], ["八幡"]) },
  { id: "tenjin", title_en: "Scholar's Patron", title_ja: "天神信仰", icon: "graduationCap", group: "Deities",
    description: "Visit a shrine of Tenjin (Sugawara no Michizane), kami of learning.",
    description_ja: "学問の神、天神(菅原道真)を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["tenjin", "sugawara", "michizane"], ["天神", "菅原"]) },
  { id: "susanoo", title_en: "Storm Brother", title_ja: "須佐之男", icon: "sparkles", group: "Deities",
    description: "Visit a shrine of Susanoo, the tempestuous storm kami.",
    description_ja: "荒ぶる嵐の神、須佐之男命を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["susanoo", "susano-o"], ["須佐之男", "素戔嗚", "須佐男", "建速須佐"]) },
  { id: "okuninushi", title_en: "Lord of the Land", title_ja: "大国主", icon: "heart", group: "Deities",
    description: "Visit a shrine of Ōkuninushi (Izumo), kami of nation-building & en-musubi.",
    description_ja: "国造りと縁結びを司る大国主命(出雲)を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["okuninushi", "onamuchi", "daikoku"], ["大国主", "大國主", "大己貴", "大穴牟遅"]) },
  { id: "toyouke", title_en: "Keeper of the Harvest", title_ja: "豊受大神", icon: "wheat", group: "Deities",
    description: "Visit a shrine of Toyouke (Ise Gekū), kami of food, grain & industry.",
    description_ja: "食物・穀物・産業を司る豊受大神(伊勢外宮)を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["toyouke"], ["豊受", "豐受", "登由宇気"]) },
  { id: "konohana", title_en: "Blossom of the Mountain", title_ja: "木花咲耶姫", icon: "flower", group: "Deities",
    description: "Visit a Sengen/Asama shrine of Konohanasakuya-hime, goddess of Mt. Fuji.",
    description_ja: "富士山の女神、木花咲耶姫を祀る浅間・仙元系の神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["konohana", "sakuya", "sengen", "asama"], ["木花", "咲耶", "浅間"]) },
  { id: "ebisu", title_en: "Bringer of Fortune", title_ja: "恵比寿信仰", icon: "fish", group: "Deities",
    description: "Visit a shrine of Ebisu, kami of fishers, commerce & good luck.",
    description_ja: "漁業・商売・福運を司る恵比寿神を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["ebisu", "kotoshironushi", "hiruko"], ["恵比寿", "恵比須", "蛭子", "事代主", "戎"]) },
  { id: "takemikazuchi", title_en: "Thunder of Kashima", title_ja: "建御雷神", icon: "sword", group: "Deities",
    description: "Visit a shrine of Takemikazuchi (Kashima), kami of thunder & the sword.",
    description_ja: "雷と剣の神、建御雷神(鹿島)を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["takemikazuchi"], ["建御雷", "武甕槌", "健御賀豆智"]) },
  { id: "sarutahiko", title_en: "Guide of the Crossroads", title_ja: "猿田彦大神", icon: "compass", group: "Deities",
    description: "Visit a shrine of Sarutahiko, kami of guidance, paths & beginnings.",
    description_ja: "導きと道行き、新たな始まりの神、猿田彦大神を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["sarutahiko"], ["猿田彦", "猿田毘古"]) },
  { id: "tsukuyomi", title_en: "Reader of the Moon", title_ja: "月読命", icon: "moon", group: "Deities",
    description: "Visit a shrine of Tsukuyomi, the moon kami and Amaterasu's sibling.",
    description_ja: "月の神であり天照大神の兄弟神、月読命を祀る神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["tsukuyomi", "tsukiyomi"], ["月読", "月夜見", "月讀"]) },
  { id: "munakata", title_en: "Maidens of the Sea", title_ja: "宗像三女神", icon: "waves", group: "Deities",
    description: "Visit a Munakata/Itsukushima shrine of the three sea goddesses.",
    description_ja: "海の三女神を祀る宗像・厳島系の神社を参拝する。",
    evaluate: (c) => hasDeity(c, ["ichikishima", "munakata", "itsukushima", "tagori", "tagitsu"], ["市杵島", "宗像", "厳島", "田心", "湍津"]) },
  { id: "deity_variety", title_en: "Pantheon Seeker", title_ja: "八百万巡り", icon: "users", group: "Deities",
    description: "Collect seals from shrines of 5 or more different deities.",
    description_ja: "5柱以上の異なる神々の御朱印を集める。",
    evaluate: (c) => c.distinctDeityCount >= 5, progress: (c) => ({ current: c.distinctDeityCount, target: 5 }) },
  { id: "deity_variety_10", title_en: "Myriad Deities", title_ja: "十神巡拝", icon: "sparkles", group: "Deities",
    description: "Collect seals from shrines of 10 or more different deities.",
    description_ja: "10柱以上の異なる神々の御朱印を集める。",
    evaluate: (c) => c.distinctDeityCount >= 10, progress: (c) => ({ current: c.distinctDeityCount, target: 10 }) },

  // --- Prayer focus (goriyaku) ---
  { id: "love", title_en: "Threads of Fate", title_ja: "縁結び祈願", icon: "heart", group: "Blessings",
    description: "Visit a shrine for love & family (matchmaking).",
    description_ja: "縁結び・家庭円満を祈願する神社を参拝する。",
    evaluate: (c) => c.categoryGroups.has("Love & Family") },
  { id: "study", title_en: "Path of Learning", title_ja: "学業成就", icon: "bookOpen", group: "Blessings",
    description: "Visit a shrine for scholarship & exam success.",
    description_ja: "学業成就・合格祈願の神社を参拝する。",
    evaluate: (c) => c.categoryGroups.has("Scholarship") },
  { id: "wealth", title_en: "Fortune's Favor", title_ja: "商売繁盛", icon: "coins", group: "Blessings",
    description: "Visit a shrine for prosperity & wealth.",
    description_ja: "商売繁盛・金運を祈願する神社を参拝する。",
    evaluate: (c) => c.categoryGroups.has("Prosperity") },
  { id: "health", title_en: "Vital Blessing", title_ja: "無病息災", icon: "activity", group: "Blessings",
    description: "Visit a shrine for good health.",
    description_ja: "無病息災を祈願する神社を参拝する。",
    evaluate: (c) => c.categoryGroups.has("Health") },
  { id: "protection", title_en: "Warding Charm", title_ja: "厄除祈願", icon: "shieldCheck", group: "Blessings",
    description: "Visit a shrine for protection & safety.",
    description_ja: "厄除け・安全祈願の神社を参拝する。",
    evaluate: (c) => c.categoryGroups.has("Protection & Safety") },

  // --- Behavioral / temporal ---
  { id: "same_day_3", title_en: "Pilgrimage Marathon", title_ja: "一日三社", icon: "footprints", group: "Journey",
    description: "Collect 3 goshuin in a single day.",
    description_ja: "1日で3つの御朱印を集める。",
    evaluate: (c) => c.maxStampsInOneDay >= 3, progress: (c) => ({ current: c.maxStampsInOneDay, target: 3 }) },
  { id: "same_day_5", title_en: "Pilgrim's Sprint", title_ja: "一日五社", icon: "footprints", group: "Journey",
    description: "Collect 5 goshuin in a single day.",
    description_ja: "1日で5つの御朱印を集める。",
    evaluate: (c) => c.maxStampsInOneDay >= 5, progress: (c) => ({ current: c.maxStampsInOneDay, target: 5 }) },
  { id: "multi_month", title_en: "Seasons of Devotion", title_ja: "四季巡拝", icon: "calendarDays", group: "Journey",
    description: "Collect seals across 3 or more different months.",
    description_ja: "3か月以上にわたって御朱印を集める。",
    evaluate: (c) => c.distinctMonths >= 3, progress: (c) => ({ current: c.distinctMonths, target: 3 }) },
  { id: "year_round", title_en: "Twelve Moons", title_ja: "十二月巡拝", icon: "calendarDays", group: "Journey",
    description: "Collect a goshuin in all 12 months of the year.",
    description_ja: "1年12か月すべてで御朱印を集める。",
    evaluate: (c) => c.distinctMonths >= 12, progress: (c) => ({ current: c.distinctMonths, target: 12 }) },
  { id: "hatsumode", title_en: "First Shrine Visit", title_ja: "初詣", icon: "sparkles", group: "Journey",
    description: "Collect a goshuin during the New Year (Jan 1–3).",
    description_ja: "正月三が日(1月1日〜3日)に御朱印を頂く。",
    evaluate: (c) => c.hasNewYearStamp },
  { id: "wishlist_10", title_en: "Pilgrim's Plan", title_ja: "参拝計画", icon: "bookmark", group: "Journey",
    description: "Save 10 shrines to your wishlist.",
    description_ja: "10社をお気に入りの参拝計画に登録する。",
    evaluate: (c) => c.savedCount >= 10, progress: (c) => ({ current: c.savedCount, target: 10 }) },
  { id: "coverage_25", title_en: "Quarter Master", title_ja: "四分一達成", icon: "trophy", group: "Journey",
    description: "Collect seals at 25% of all sanctuaries.",
    description_ja: "掲載されている全社寺の25%で御朱印を集める。",
    evaluate: (c) => c.coveragePct >= 25, progress: (c) => ({ current: Math.round(c.coveragePct), target: 25 }) },
  { id: "coverage_50", title_en: "Halfway to Heaven", title_ja: "半数達成", icon: "trophy", group: "Journey",
    description: "Collect seals at 50% of all sanctuaries.",
    description_ja: "掲載されている全社寺の50%で御朱印を集める。",
    evaluate: (c) => c.coveragePct >= 50, progress: (c) => ({ current: Math.round(c.coveragePct), target: 50 }) },
  { id: "coverage_100", title_en: "Complete Pilgrimage", title_ja: "全社踏破", icon: "gem", group: "Journey",
    description: "Collect a goshuin at every sanctuary in the catalog.",
    description_ja: "掲載されている全社寺で御朱印を集める。",
    evaluate: (c) => c.coveragePct >= 100, progress: (c) => ({ current: Math.round(c.coveragePct), target: 100 }) },
];

export interface EvaluatedMilestone {
  def: Milestone;
  unlocked: boolean;
  /** Current progress value, capped at `target` for display. */
  current: number;
  /** Goal value. Boolean-style milestones report `1`. */
  target: number;
  /** Completion in 0–100 (rounded, clamped); always 100 once unlocked. */
  percent: number;
}

/** Evaluate every milestone against the context, preserving catalog order. */
export function evaluateMilestones(ctx: MilestoneContext): EvaluatedMilestone[] {
  return MILESTONES.map((def) => {
    const unlocked = def.evaluate(ctx);
    const raw = def.progress ? def.progress(ctx) : { current: unlocked ? 1 : 0, target: 1 };
    const target = raw.target > 0 ? raw.target : 1;
    const current = Math.max(0, Math.min(raw.current, target));
    const percent = unlocked ? 100 : Math.min(100, Math.round((current / target) * 100));
    return { def, unlocked, current, target, percent };
  });
}

// ============================================================================
// PILGRIM RANKS — the headline level on the profile pass
// ============================================================================

/**
 * The pilgrim's headline rank, earned purely by goshuin count ("collect goshuin at N
 * shrines"). Ascending by `threshold`; index 0 is the base rank held before the first seal.
 * Single source of truth so the level badge and its progress bar stay in sync. These are
 * deliberately separate from `MILESTONES` — they drive the level badge, not the Sacred
 * Milestones list, so the two never show the same goal twice.
 */
export interface PilgrimRank {
  title_en: string;
  title_ja: string;
  description: string;
  description_ja: string;
  /** Goshuin required to hold this rank (0 = the base rank, before any seal). */
  threshold: number;
}

export const PILGRIM_RANKS: PilgrimRank[] = [
  { title_en: "First Steps", title_ja: "駆け出しの巡礼者", threshold: 0,
    description: "Your pilgrimage has just begun. Cross the threshold and collect your first goshuin stamp.",
    description_ja: "巡礼はまだ始まったばかり。鳥居をくぐり、最初の御朱印を頂きましょう。" },
  { title_en: "Novice Pilgrim", title_ja: "初参拝", threshold: 3,
    description: "Your first sacred seal is affixed — the journey along the sanctuaries has begun.",
    description_ja: "最初の御朱印が捺された — 神社を巡る旅がここに始まる。" },
  { title_en: "Sanctuary Explorer", title_ja: "神域の探求者", threshold: 5,
    description: "Goshuin collected at 5 sanctuaries. The seal catalog opens before you.",
    description_ja: "5つの神社で御朱印を収集。御朱印帳がその姿を現し始める。" },
  { title_en: "Devoted Wanderer", title_ja: "熱心な巡礼者", threshold: 10,
    description: "Ten seals gathered. Your footsteps fall in deep rhythm with the kami.",
    description_ja: "十の御朱印を集めた。歩みは神々の息吹と深く重なり合う。" },
  { title_en: "Seasoned Pilgrim", title_ja: "練達の巡礼者", threshold: 25,
    description: "Twenty-five sanctuaries honored — a seasoned traveler of the sacred ways.",
    description_ja: "二十五の社寺を参拝 — 神聖なる道を歩む熟練の旅人。" },
  { title_en: "Grand Pilgrim", title_ja: "大巡礼者", threshold: 50,
    description: "Fifty seals collected. Divine grace gathers across the islands of Japan.",
    description_ja: "五十の御朱印を集めた。日本列島に神恩が満ちわたる。" },
  { title_en: "Hundred Sanctuaries", title_ja: "百社参拝", threshold: 100,
    description: "One hundred goshuin — a feat of true and enduring devotion.",
    description_ja: "百の御朱印 — 真摯なる信仰が成し遂げた偉業。" },
];

export interface PilgrimRankProgress {
  /** The rank currently held. */
  current: PilgrimRank;
  /** The next rank to reach, or null once at the top. */
  next: PilgrimRank | null;
  /**
   * 0–100 toward the next rank's threshold, measured from zero so the bar matches the
   * "{stampCount} / {nextGoal} STAMPS" label (e.g. 1 of 5 = 20%). 100 once at the top rank.
   */
  percent: number;
}

/** Resolve the held rank and progress toward the next from a goshuin count. Pure. */
export function getPilgrimRank(stampCount: number): PilgrimRankProgress {
  let idx = 0;
  for (let i = 0; i < PILGRIM_RANKS.length; i++) {
    if (stampCount >= PILGRIM_RANKS[i].threshold) idx = i;
  }
  const current = PILGRIM_RANKS[idx];
  const next = PILGRIM_RANKS[idx + 1] ?? null;
  const percent = next ? Math.min(100, Math.round((stampCount / next.threshold) * 100)) : 100;
  return { current, next, percent };
}

// ============================================================================
// LOCALIZATION — shared by Milestone and PilgrimRank, which carry the same
// four bilingual fields.
// ============================================================================

export interface LocalizedCatalogText {
  title: string;
  subtitle: string;
  description: string;
}

/**
 * Locale-aware title/description resolution, mirroring `namePair()`
 * (lib/names.ts): JA flips to kanji-primary with the English title as the
 * parenthetical subtitle; EN keeps `title_en` primary.
 */
export function localizeCatalogEntry(
  locale: Locale,
  entry: { title_en: string; title_ja: string; description: string; description_ja: string },
): LocalizedCatalogText {
  return locale === "ja"
    ? { title: entry.title_ja, subtitle: entry.title_en, description: entry.description_ja }
    : { title: entry.title_en, subtitle: entry.title_ja, description: entry.description };
}
