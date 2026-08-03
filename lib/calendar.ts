import type { Store, CalendarEntry, FestivalOccurrenceRow } from "@/lib/types";

export function monthRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-based; day 0 of next = last of this
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` };
}

// Swap a YYYY-MM-DD date's year, keeping its month-day. Used to project a festival's
// (year-agnostic) default date onto the calendar's current year.
function projectToYear(date: string | null, year: number): string | null {
  return date ? `${year}-${date.slice(5)}` : null;
}

// Effective festival dates for the calendar in a given year:
//  1. an occurrence for that exact year wins (used literally),
//  2. otherwise the festival's default month-day is projected onto that year,
//  3. otherwise the festival is undated (is_fallback).
// No previous-year-occurrence fallback — every resolved date is in `year`, so the day grid pins it.
export function resolveCalendarDates(
  occForYear: FestivalOccurrenceRow | undefined,
  f: { start_date: string | null; end_date: string | null },
  year: number,
): { start_date: string | null; end_date: string | null; is_fallback: boolean } {
  if (occForYear) {
    return { start_date: occForYear.start_date, end_date: occForYear.end_date, is_fallback: false };
  }
  const start = projectToYear(f.start_date, year);
  if (!start) return { start_date: null, end_date: null, is_fallback: true };
  let end = projectToYear(f.end_date, year);
  if (end && end < start) end = `${year + 1}-${(f.end_date as string).slice(5)}`; // festival crosses New Year
  return { start_date: start, end_date: end, is_fallback: false };
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
  return { slug: s.slug, name_en: s.name_en, name_ja: s.name_ja, name_hiragana: s.name_hiragana, region: region?.name_en ?? "", region_id: s.region_id, category_codes };
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

    const { start_date: startDate, end_date: endDate, is_fallback } = resolveCalendarDates(occ, f, year);
    const effectiveEnd = endDate ?? startDate; // single-day event: end = start

    if (!is_fallback && startDate && effectiveEnd) {
      if (startDate <= end && effectiveEnd >= start) {
        entries.push({
          festival_id: f.id,
          shrine_slug: ctx.slug,
          shrine_name_en: ctx.name_en,
          shrine_name_ja: ctx.name_ja,
          shrine_name_hiragana: ctx.name_hiragana,
          festival_name_en: f.name_en,
          festival_name_ja: f.name_ja,
          festival_name_hiragana: f.name_hiragana,
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
        shrine_name_ja: ctx.name_ja,
        shrine_name_hiragana: ctx.name_hiragana,
        festival_name_en: f.name_en,
        festival_name_ja: f.name_ja,
        festival_name_hiragana: f.name_hiragana,
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
