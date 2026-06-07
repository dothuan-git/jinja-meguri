"use client";

import type { FacetCatalogs, Prefecture } from "@/lib/types";

type Sets = {
  cat: Set<string>;
  rank: Set<string>;
  region: Set<string>;
  pref: Set<string>;
  deity: Set<string>;
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (active
          ? "border-vermilion bg-vermilion text-washi"
          : "border-[var(--hairline)] text-sumi-soft hover:border-vermilion/50 hover:text-sumi")
      }
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t hairline py-5 first:border-t-0 first:pt-0">
      <h3 className="kicker mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function ShrineFilters({
  facets,
  sets,
  activeCount,
  onToggle,
  onClear,
}: {
  facets: FacetCatalogs;
  sets: Sets;
  activeCount: number;
  onToggle: (key: keyof Sets, value: string) => void;
  onClear: () => void;
}) {
  // Prefectures available given the selected regions.
  const availablePrefs: Prefecture[] = [...sets.region]
    .flatMap((rid) => facets.prefecturesByRegion[Number(rid)] ?? [])
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  return (
    <div className="lg:sticky lg:top-20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Filter</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs uppercase tracking-widest text-vermilion-deep hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <Section title="Strong for">
        <div className="space-y-3">
          {facets.categoryGroups.map((group) => (
            <div key={group.group_label}>
              <p className="mb-1.5 text-[0.78rem] font-medium text-sumi">{group.group_label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.categories.map((c) => (
                  <FilterPill key={c.code} active={sets.cat.has(c.code)} onClick={() => onToggle("cat", c.code)}>
                    {c.name_en}
                  </FilterPill>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rank">
        <div className="flex flex-wrap gap-1.5">
          {facets.ranks.map((r) => (
            <FilterPill key={r.code} active={sets.rank.has(r.code)} onClick={() => onToggle("rank", r.code)}>
              {r.name_en}
            </FilterPill>
          ))}
        </div>
      </Section>

      <Section title="Region">
        <div className="flex flex-wrap gap-1.5">
          {facets.regions.map((r) => (
            <FilterPill
              key={r.id}
              active={sets.region.has(String(r.id))}
              onClick={() => onToggle("region", String(r.id))}
            >
              {r.name_en}
            </FilterPill>
          ))}
        </div>
      </Section>

      <Section title="Prefecture">
        {availablePrefs.length === 0 ? (
          <p className="text-xs italic text-sumi-soft/70">Select a region to narrow by prefecture.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availablePrefs.map((p) => (
              <FilterPill
                key={p.id}
                active={sets.pref.has(String(p.id))}
                onClick={() => onToggle("pref", String(p.id))}
              >
                {p.name_en}
              </FilterPill>
            ))}
          </div>
        )}
      </Section>

      <Section title="Enshrined deity">
        <div className="flex flex-wrap gap-1.5">
          {facets.deities.map((d) => (
            <FilterPill
              key={d.name_kanji}
              active={sets.deity.has(d.name_kanji)}
              onClick={() => onToggle("deity", d.name_kanji)}
            >
              {d.name_romaji}
            </FilterPill>
          ))}
        </div>
      </Section>
    </div>
  );
}
