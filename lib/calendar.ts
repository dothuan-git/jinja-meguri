import type { Store, CalendarEntry } from "@/lib/types";

export function monthRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-based; day 0 of next = last of this
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function shrineContext(store: Store, shrineId: string) {
  const s = store.shrines.find((x) => x.id === shrineId)!;
  const region = store.regions.find((r) => r.id === s.region_id);
  const catIdsByShrine = store.shrine_prayer_categories
    .filter((c) => c.shrine_id === shrineId)
    .map((c) => c.category_id);
  const category_codes = store.prayer_categories
    .filter((c) => catIdsByShrine.includes(c.id))
    .map((c) => c.name_en);
  return { slug: s.slug, name_en: s.name_en, region: region?.name_en ?? "", region_id: s.region_id, category_codes };
}

export function entriesForMonth(store: Store, year: number, month: number): CalendarEntry[] {
  const { start, end } = monthRange(year, month);
  const entries: CalendarEntry[] = [];

  // Index occurrences for the requested year so lookup is O(1) per festival
  const occByFestival = new Map(
    store.festival_occurrences
      .filter((o) => o.year === year)
      .map((o) => [o.festival_id, o])
  );

  for (const f of store.festivals) {
    const ctx = shrineContext(store, f.shrine_id);
    const occ = occByFestival.get(f.id);

    // Occurrence dates take priority over festival defaults
    const startDate = occ?.start_date ?? f.start_date;
    const endDate = occ ? occ.end_date : f.end_date;
    const effectiveEnd = endDate ?? startDate; // single-day event: end = start

    if (startDate && effectiveEnd) {
      if (startDate <= end && effectiveEnd >= start) {
        entries.push({
          festival_id: f.id,
          shrine_slug: ctx.slug,
          shrine_name_en: ctx.name_en,
          festival_name_en: f.name_en,
          festival_name_ja: f.name_ja,
          region: ctx.region,
          region_id: ctx.region_id,
          category_codes: ctx.category_codes,
          start_date: startDate,
          end_date: endDate,
          time_prose: f.time_prose,
          is_fallback: false,
        });
      }
    } else {
      // No date at all — show as undated for any month queried
      entries.push({
        festival_id: f.id,
        shrine_slug: ctx.slug,
        shrine_name_en: ctx.name_en,
        festival_name_en: f.name_en,
        festival_name_ja: f.name_ja,
        region: ctx.region,
        region_id: ctx.region_id,
        category_codes: ctx.category_codes,
        start_date: null,
        end_date: null,
        time_prose: f.time_prose,
        is_fallback: true,
      });
    }
  }

  return entries;
}
