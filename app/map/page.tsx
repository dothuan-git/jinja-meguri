import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { loadStore } from "@/lib/db/store";
import { getShrineCards, getFacetCatalogs } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/server";
import { loadUserMarks, savedSlugs, stampedSlugs } from "@/lib/db/userRepo";
import type { Locale } from "@/lib/i18n";
import ShrineMapView from "@/components/map/ShrineMapView";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const store = await loadStore();
  const locale = (await getLocale()) as Locale;
  const cards = getShrineCards(store, locale);
  const facets = getFacetCatalogs(store, locale);
  const user = await getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin);

  // Per-user collection state for the saved/collected map filters.
  const marks = user ? await loadUserMarks(user.id) : [];

  return (
    <Suspense fallback={<div className="mx-auto w-full md:w-[calc(100%-2.5rem)] max-w-7xl px-4 md:px-6 lg:px-8 py-12">Loading…</div>}>
      <ShrineMapView
        cards={cards}
        facets={facets}
        isAdmin={isAdmin}
        isSignedIn={Boolean(user)}
        savedSlugs={savedSlugs(marks)}
        stampedSlugs={stampedSlugs(marks)}
      />
    </Suspense>
  );
}
