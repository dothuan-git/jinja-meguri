"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ShrineCard as Card, FacetCatalogs } from "@/lib/types";
import ShrineCard from "@/components/ShrineCard";
import ShrineFilters from "@/components/ShrineFilters";

const KEYS = ["cat", "rank", "region", "pref", "deity"] as const;
type Key = (typeof KEYS)[number];
type Sets = Record<Key, Set<string>>;

export default function ShrineListing({ cards, facets }: { cards: Card[]; facets: FacetCatalogs }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spString = sp.toString();

  const sets: Sets = useMemo(() => {
    const get = (k: Key) => new Set((sp.get(k) ?? "").split(",").filter(Boolean));
    return { cat: get("cat"), rank: get("rank"), region: get("region"), pref: get("pref"), deity: get("deity") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString]);

  const write = (next: Sets) => {
    const params = new URLSearchParams();
    for (const k of KEYS) if (next[k].size) params.set(k, [...next[k]].join(","));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const onToggle = (key: Key, value: string) => {
    const next = {} as Sets;
    for (const k of KEYS) next[k] = new Set(sets[k]);
    if (next[key].has(value)) next[key].delete(value);
    else next[key].add(value);
    if (key === "region") {
      const allowed = new Set(
        [...next.region].flatMap((rid) => (facets.prefecturesByRegion[Number(rid)] ?? []).map((p) => String(p.id)))
      );
      next.pref = new Set([...next.pref].filter((p) => allowed.has(p)));
    }
    write(next);
  };

  const onClear = () => router.replace(pathname, { scroll: false });

  const activeCount = KEYS.reduce((n, k) => n + sets[k].size, 0);

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        if (sets.cat.size && !c.category_codes.some((x) => sets.cat.has(x))) return false;
        if (sets.rank.size && !c.rank_codes.some((x) => sets.rank.has(x))) return false;
        if (sets.region.size && !sets.region.has(String(c.region_id))) return false;
        if (sets.pref.size && !sets.pref.has(String(c.prefecture_id))) return false;
        if (sets.deity.size && !c.deity_kanji.some((x) => sets.deity.has(x))) return false;
        return true;
      }),
    [cards, sets]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <p className="kicker">The collection</p>
        <h1 className="mt-2 font-display text-5xl font-semibold">Browse the shrines</h1>
        <p className="mt-3 text-sm text-sumi-soft">
          <span className="text-sumi">{filtered.length}</span> of {cards.length} shrines
          {activeCount > 0 ? " · filtered" : ""}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[256px_1fr]">
        <aside>
          <ShrineFilters
            facets={facets}
            sets={sets}
            activeCount={activeCount}
            onToggle={onToggle}
            onClear={onClear}
          />
        </aside>

        <section>
          {filtered.length === 0 ? (
            <div className="rounded-md border hairline bg-washi-deep/40 p-10 text-center">
              <p className="font-display text-2xl">No shrines match these filters.</p>
              <button
                type="button"
                onClick={onClear}
                className="mt-3 text-sm uppercase tracking-widest text-vermilion-deep hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {filtered.map((c) => (
                <ShrineCard key={c.slug} card={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
