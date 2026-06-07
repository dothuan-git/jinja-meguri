import { Suspense } from "react";
import { loadStore } from "@/lib/db/store";
import { getShrineCards, getFacetCatalogs } from "@/lib/db/repo";
import ShrineListing from "@/components/ShrineListing";

export default function ShrinesPage() {
  const store = loadStore();
  const cards = getShrineCards(store);
  const facets = getFacetCatalogs(store);
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">Loading…</div>}>
      <ShrineListing cards={cards} facets={facets} />
    </Suspense>
  );
}
