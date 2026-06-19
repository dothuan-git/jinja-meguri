import { Suspense } from "react";
import { loadStore } from "@/lib/db/store";
import { getShrineCards, getFacetCatalogs } from "@/lib/db/repo";
import { getAdminEmail } from "@/lib/auth/server";
import ShrineListing from "@/components/ShrineListing";

export const dynamic = "force-dynamic";

export default async function ShrinesPage() {
  const store = await loadStore();
  const cards = getShrineCards(store);
  const facets = getFacetCatalogs(store);
  const isAdmin = Boolean(await getAdminEmail());
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">Loading…</div>}>
      <ShrineListing cards={cards} facets={facets} isAdmin={isAdmin} />
    </Suspense>
  );
}
