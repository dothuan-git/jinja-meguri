import { loadStore } from "@/lib/db/store";
import { getFestivalYear } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/server";
import Calendar from "@/components/Calendar";

export const dynamic = "force-dynamic";

const YEAR = new Date().getFullYear(); // calendar tracks the current year's occurrences

export default async function CalendarPage() {
  const [store, user] = await Promise.all([loadStore(), getCurrentUser()]);
  const isAdmin = Boolean(user?.isAdmin);
  return (
    <Calendar
      year={YEAR}
      festivals={getFestivalYear(store, YEAR)}
      isAdmin={isAdmin}
      occurrenceSeed={isAdmin ? store.festival_occurrences : undefined}
    />
  );
}
