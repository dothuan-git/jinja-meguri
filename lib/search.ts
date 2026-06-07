import Fuse from "fuse.js";
import type { Store, SearchDoc, SearchResult } from "@/lib/types";

export function toSearchDocs(store: Store): SearchDoc[] {
  return store.shrine_search.map((r) => ({
    slug: r.slug,
    name_en: r.name_en,
    name_ja: r.name_ja,
    city: r.city,
    blob: r.search_blob,
  }));
}

export function makeSearcher(docs: SearchDoc[]): (query: string) => SearchResult[] {
  const fuse = new Fuse(docs, {
    includeScore: true,
    threshold: 0.4, // fuzzy / typo tolerance
    ignoreLocation: true, // match anywhere in the blob
    minMatchCharLength: 1, // allow single CJK char matches
    keys: [
      { name: "name_en", weight: 0.5 },
      { name: "name_ja", weight: 0.4 },
      { name: "city", weight: 0.2 },
      { name: "blob", weight: 0.3 },
    ],
  });
  return (query: string) => {
    const q = query.trim();
    if (!q) return [];
    return fuse.search(q).map((res) => ({
      slug: res.item.slug,
      name_en: res.item.name_en,
      name_ja: res.item.name_ja,
      city: res.item.city,
      score: res.score ?? 1,
    }));
  };
}
