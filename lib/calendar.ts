import type { Store, CalendarEntry } from "@/lib/types";

export function monthRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-based; day 0 of next = last of this
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function shrineContext(store: Store, shrineId: number) {
  const s = store.shrines.find((x) => x.id === shrineId)!;
  const region = store.regions.find((r) => r.id === s.region_id);
  const catIdsByShrine = store.shrine_prayer_categories
    .filter((c) => c.shrine_id === shrineId)
    .map((c) => c.category_id);
  const category_codes = store.prayer_categories
    .filter((c) => catIdsByShrine.includes(c.id))
    .map((c) => c.code);
  return { slug: s.slug, name_en: s.name_en, region: region?.name_en ?? "", region_id: s.region_id, category_codes };
}

export function entriesForMonth(store: Store, year: number, month: number): CalendarEntry[] {
  const { start, end } = monthRange(year, month);
  const entries: CalendarEntry[] = [];

  // Dated occurrences overlapping the month: start_date <= end AND end_date >= start
  for (const occ of store.event_occurrences) {
    if (occ.start_date <= end && occ.end_date >= start) {
      const ev = store.events.find((e) => e.id === occ.event_id);
      if (!ev) continue;
      const ctx = shrineContext(store, occ.shrine_id);
      entries.push({
        event_id: ev.id,
        shrine_slug: ctx.slug,
        shrine_name_en: ctx.name_en,
        event_name_en: ev.name_en,
        event_name_ja: ev.name_ja,
        region: ctx.region,
        region_id: ctx.region_id,
        category_codes: ctx.category_codes,
        start_date: occ.start_date,
        end_date: occ.end_date,
        time_prose: ev.time_prose,
        is_fallback: false,
      });
    }
  }

  // Fallback: events with NO occurrence in the chosen YEAR get one unpinned entry per displayed month.
  const yearPrefix = `${year}-`;
  for (const ev of store.events) {
    const hasOccThisYear = store.event_occurrences.some(
      (o) => o.event_id === ev.id && (o.start_date.startsWith(yearPrefix) || o.end_date.startsWith(yearPrefix))
    );
    if (hasOccThisYear) continue;
    const ctx = shrineContext(store, ev.shrine_id);
    entries.push({
      event_id: ev.id,
      shrine_slug: ctx.slug,
      shrine_name_en: ctx.name_en,
      event_name_en: ev.name_en,
      event_name_ja: ev.name_ja,
      region: ctx.region,
      region_id: ctx.region_id,
      category_codes: ctx.category_codes,
      start_date: null,
      end_date: null,
      time_prose: ev.time_prose,
      is_fallback: true,
    });
  }

  return entries;
}
