import Fuse from "fuse.js";
import type { Store, SearchDoc, SearchResult } from "@/lib/types";

// Strip diacritics (e.g. "Ōkami" → "okami") and lowercase, so ASCII queries
// match macron'd romaji. Applied to both the index and the query. A no-op for
// kanji/kana, and harmless on both sides since they fold identically.
// NFD splits "Ō" into "O" + U+0304; the range drops U+0300–U+036F combining marks.
export const fold = (s: string): string =>
  [...s.normalize("NFD")]
    .filter((c) => { const n = c.codePointAt(0)!; return n < 0x0300 || n > 0x036f; })
    .join("")
    .toLowerCase();

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
      s.name_hiragana,
      s.city,
      ...deities.map((d) => d.name_en),
      ...deities.map((d) => d.name_ja).filter(Boolean),
      ...deities.map((d) => d.name_hiragana).filter(Boolean),
      ...categories.map((c) => c.name_en),
      ...festivals.map((f) => f.name_en),
      ...festivals.map((f) => f.name_ja).filter(Boolean),
      ...festivals.map((f) => f.name_hiragana).filter(Boolean),
    ]
      .filter(Boolean)
      .join(" ");

    return { slug: s.slug, name_en: s.name_en, name_ja: s.name_ja, name_hiragana: s.name_hiragana, city: s.city, blob };
  });
}

export function makeSearcher(docs: SearchDoc[]): (query: string) => SearchResult[] {
  // Index against diacritic-folded copies of the searchable text; keep the
  // original doc for display. Both index and query pass through fold().
  const indexed = docs.map((doc) => ({
    doc,
    name_en: fold(doc.name_en),
    name_ja: fold(doc.name_ja ?? ""),
    city: fold(doc.city ?? ""),
    blob: fold(doc.blob),
  }));
  const fuse = new Fuse(indexed, {
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
    return fuse.search(fold(q)).map((res) => ({
      slug: res.item.doc.slug,
      name_en: res.item.doc.name_en,
      name_ja: res.item.doc.name_ja,
      name_hiragana: res.item.doc.name_hiragana,
      city: res.item.doc.city,
      score: res.score ?? 1,
    }));
  };
}
