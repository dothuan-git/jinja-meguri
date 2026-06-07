import { loadStore } from "@/lib/db/store";
import { entriesForMonth } from "@/lib/calendar";
import { getFacetCatalogs } from "@/lib/db/repo";
import Calendar from "@/components/Calendar";
import type { CalendarEntry } from "@/lib/types";

const YEAR = 2026; // dummy occurrences are seeded for 2026

export default function CalendarPage() {
  const store = loadStore();
  const months: Record<number, CalendarEntry[]> = {};
  for (let m = 1; m <= 12; m++) months[m] = entriesForMonth(store, YEAR, m);
  const facets = getFacetCatalogs(store);
  return (
    <Calendar
      year={YEAR}
      months={months}
      regions={facets.regions}
      categoryGroups={facets.categoryGroups}
    />
  );
}
