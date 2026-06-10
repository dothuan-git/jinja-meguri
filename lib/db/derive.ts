export function pickHighestRankId(ranks: { id: number; rank_order: number }[]): number | null {
  if (ranks.length === 0) return null;
  return ranks.reduce((best, r) => (r.rank_order < best.rank_order ? r : best)).id;
}
