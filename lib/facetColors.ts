// Fixed color schemes for the two colored facets the UI renders as chips:
// prayer categories (25) and shrine ranks (17). Centralized here so the
// listing, detail page, and modal all read identically.
//
// Full class strings are kept inline (no string interpolation of color
// values) so Tailwind's content scanner can see and emit every class.

/* ------------------------------------------------------------------ */
/* Prayer categories — one hue per semantic group (see docs/seed.sql) */
/* ------------------------------------------------------------------ */

const CATEGORY_GROUP = {
  fortune:     "text-[#7a643f] border-[#7a643f]/12 bg-[#7a643f]/5", // amber-brown
  love:        "text-[#9d4060] border-[#9d4060]/12 bg-[#9d4060]/5", // rose
  health:      "text-[#3e5f49] border-[#3e5f49]/12 bg-[#3e5f49]/5", // forest green
  prosperity:  "text-[#6b5420] border-[#6b5420]/12 bg-[#6b5420]/5", // harvest gold
  protection:  "text-[#4b6678] border-[#4b6678]/12 bg-[#4b6678]/5", // slate blue
  scholarship: "text-[#655375] border-[#655375]/12 bg-[#655375]/5", // wisteria violet
  nation:      "text-[#9d4432] border-[#9d4432]/12 bg-[#9d4432]/5", // torii red
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  // Fortune & Success
  "Victory": CATEGORY_GROUP.fortune,
  "Good Fortune": CATEGORY_GROUP.fortune,
  "Wish Fulfillment": CATEGORY_GROUP.fortune,
  "Career Advancement": CATEGORY_GROUP.fortune,
  "Competition Win": CATEGORY_GROUP.fortune,
  // Love & Family
  "Matchmaking": CATEGORY_GROUP.love,
  "Good Marriage": CATEGORY_GROUP.love,
  "Fertility": CATEGORY_GROUP.love,
  "Safe Childbirth": CATEGORY_GROUP.love,
  "Family Safety": CATEGORY_GROUP.love,
  // Health
  "Good Health": CATEGORY_GROUP.health,
  "Longevity": CATEGORY_GROUP.health,
  "Recovery from Illness": CATEGORY_GROUP.health,
  // Prosperity
  "Business Prosperity": CATEGORY_GROUP.prosperity,
  "Wealth": CATEGORY_GROUP.prosperity,
  "Bountiful Harvest": CATEGORY_GROUP.prosperity,
  // Protection & Safety
  "Warding off Evil": CATEGORY_GROUP.protection,
  "Purification": CATEGORY_GROUP.protection,
  "Disaster Prevention": CATEGORY_GROUP.protection,
  "Traffic Safety": CATEGORY_GROUP.protection,
  "Maritime Safety": CATEGORY_GROUP.protection,
  // Scholarship
  "Academic Success": CATEGORY_GROUP.scholarship,
  "Exam Success": CATEGORY_GROUP.scholarship,
  // Nation
  "National Peace": CATEGORY_GROUP.nation,
  "National Protection": CATEGORY_GROUP.nation,
};

const CATEGORY_FALLBACK = "text-[#755f46] border-[#755f46]/12 bg-[#755f46]/5";

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? CATEGORY_FALLBACK;
}

/* ------------------------------------------------------------------ */
/* Ranks — a single prestige ramp (gold → gray), not per-rank hues.    */
/* Rank is one ordinal dimension, so a descending warmth reads as a    */
/* hierarchy. Banded by rank_order (see docs/seed.sql).                */
/* ------------------------------------------------------------------ */

const RANK_BAND = {
  supreme: "text-[#8a6a1c] border-[#8a6a1c]/15 bg-[#8a6a1c]/5", // imperial gold
  eminent: "text-[#9a6b3f] border-[#9a6b3f]/15 bg-[#9a6b3f]/5", // antique bronze
  major:   "text-[#7a6a52] border-[#7a6a52]/12 bg-[#7a6a52]/5", // warm taupe
  local:   "text-[#5f6b5a] border-[#5f6b5a]/12 bg-[#5f6b5a]/5", // stone-moss
  modern:  "text-[#7a7468] border-[#7a7468]/12 bg-[#7a7468]/5", // warm gray
} as const;

const RANK_COLORS: Record<string, string> = {
  // Supreme (order 0)
  "Honso": RANK_BAND.supreme,
  "Ise Grand Shrine": RANK_BAND.supreme, // display alias for the Honso
  // Eminent (order 1–5)
  "Sohonsha": RANK_BAND.eminent,
  "Chokusaisha": RANK_BAND.eminent,
  "Ichinomiya": RANK_BAND.eminent,
  "Myojin-Taisha": RANK_BAND.eminent,
  "Shikinai-sha": RANK_BAND.eminent,
  // Major imperial / national (order 6–11)
  "Kanpei-Taisha": RANK_BAND.major,
  "Kokuhei-Taisha": RANK_BAND.major,
  "Kanpei-Chusha": RANK_BAND.major,
  "Kokuhei-Chusha": RANK_BAND.major,
  "Kanpei-Shosha": RANK_BAND.major,
  "Kokuhei-Shosha": RANK_BAND.major,
  // Regional / local (order 12–15)
  "Bekkaku-Kanpeisha": RANK_BAND.local,
  "Fu-Ken-sha": RANK_BAND.local,
  "Gosha": RANK_BAND.local,
  "Sonsha": RANK_BAND.local,
  // Modern administrative (order 20)
  "Beppyo-sha": RANK_BAND.modern,
};

const RANK_FALLBACK = RANK_BAND.modern;

export function getRankColor(name: string): string {
  return RANK_COLORS[name] ?? RANK_FALLBACK;
}
