import { loadStore } from "@/lib/db/store";
import { getFestivalYear } from "@/lib/db/repo";
import Calendar from "@/components/Calendar";

export const dynamic = "force-dynamic";

const YEAR = 2026; // occurrences are seeded for 2026

export default async function CalendarPage() {
  const store = await loadStore();
  return <Calendar year={YEAR} festivals={getFestivalYear(store, YEAR)} />;
}
