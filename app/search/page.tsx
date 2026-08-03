import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { loadStore } from "@/lib/db/store";
import { toSearchDocs } from "@/lib/search";
import { getShrineCards } from "@/lib/db/repo";
import type { Locale } from "@/lib/i18n";
import SearchResults from "@/components/SearchResults";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const store = await loadStore();
  const locale = (await getLocale()) as Locale;
  return (
    <Suspense fallback={<div className="mx-auto w-full md:w-[calc(100%-2.5rem)] max-w-7xl px-4 md:px-6 lg:px-8 py-12">Loading…</div>}>
      <SearchResults docs={toSearchDocs(store)} cards={getShrineCards(store, locale)} />
    </Suspense>
  );
}
