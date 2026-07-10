import { getLocale } from "next-intl/server";
import { loadStore } from "@/lib/db/store";
import { getFestivalYear } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/server";
import type { Locale } from "@/lib/i18n";
import Calendar from "@/components/Calendar";

export const dynamic = "force-dynamic";

const YEAR = new Date().getFullYear(); // calendar tracks the current year's occurrences

export default async function CalendarPage() {
  const [store, user, locale] = await Promise.all([loadStore(), getCurrentUser(), getLocale()]);
  const isAdmin = Boolean(user?.isAdmin);
  return (
    <Calendar
      year={YEAR}
      festivals={getFestivalYear(store, YEAR, locale as Locale)}
      isAdmin={isAdmin}
      occurrenceSeed={isAdmin ? store.festival_occurrences : undefined}
    />
  );
}
