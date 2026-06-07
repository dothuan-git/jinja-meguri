export function pickHighestRankId(ranks: { id: number; rank_order: number }[]): number | null {
  if (ranks.length === 0) return null;
  return ranks.reduce((best, r) => (r.rank_order < best.rank_order ? r : best)).id;
}

export function resolveLore(
  regional: string | null,
  canonical: string | null
): { lore: string | null; is_regional: boolean } {
  if (regional != null) return { lore: regional, is_regional: true };
  return { lore: canonical, is_regional: false };
}
