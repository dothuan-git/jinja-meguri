import Fuse from "fuse.js";
import type { Store, SearchDoc, SearchResult } from "@/lib/types";

export function toSearchDocs(store: Store): SearchDoc[] {
  return store.shrines.map((s) => {
    const deityIds = store.shrine_deities
      .filter((sd) => sd.shrine_id === s.id)
      .map((sd) => sd.deity_id);
    const deities = store.deities.filter((d) => deityIds.includes(d.id));
    const catIds = store.shrine_prayer_categories
      .filter((spc) => spc.shrine_id === s.id)
      .map((spc) => spc.category_id);
    const categories = store.prayer_categories.filter((c) => catIds.includes(c.id));
    const festivals = store.festivals.filter((f) => f.shrine_id === s.id);

    const blob = [
      s.name_en,
      s.name_ja,
      s.city,
      ...deities.map((d) => d.name_en),
      ...deities.map((d) => d.name_ja).filter(Boolean),
      ...categories.map((c) => c.name_en),
      ...festivals.map((f) => f.name_en),
      ...festivals.map((f) => f.name_ja).filter(Boolean),
    ]
      .filter(Boolean)
      .join(" ");

    return { slug: s.slug, name_en: s.name_en, name_ja: s.name_ja, city: s.city, blob };
  });
}

export function makeSearcher(docs: SearchDoc[]): (query: string) => SearchResult[] {
  const fuse = new Fuse(docs, {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
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
