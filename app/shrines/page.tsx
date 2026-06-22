import { Suspense } from "react";
import { loadStore } from "@/lib/db/store";
import { getShrineCards, getFacetCatalogs } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/server";
import { loadUserMarks, savedSlugs, stampedSlugs } from "@/lib/db/userRepo";
import ShrineListing from "@/components/ShrineListing";

export const dynamic = "force-dynamic";

export default async function ShrinesPage() {
  const store = await loadStore();
  const cards = getShrineCards(store);
  const facets = getFacetCatalogs(store);
  const user = await getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin);

  // Per-user collection state for the heart toggles + saved/collected filters.
  const marks = user ? await loadUserMarks(user.id) : [];

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">Loading…</div>}>
      <ShrineListing
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
