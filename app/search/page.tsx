import { Suspense } from "react";
import { loadStore } from "@/lib/db/store";
import { toSearchDocs } from "@/lib/search";
import { getShrineCards } from "@/lib/db/repo";
import SearchResults from "@/components/SearchResults";

export default async function SearchPage() {
  const store = await loadStore();
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">Loading…</div>}>
      <SearchResults docs={toSearchDocs(store)} cards={getShrineCards(store)} />
    </Suspense>
  );
}
