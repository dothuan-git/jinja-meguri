"use client";

import { Plus, X } from "lucide-react";
import { useShrineEdit } from "@/components/shrineEdit/context";
import { typo } from "@/components/shrineEdit/detailStyles";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import { DEITY_TYPE_LABEL } from "@/lib/labels";
import { getDeityTypeTextColor } from "@/lib/facetColors";

type DeityDraft = ShrineInput["deities"][number];
const DEITY_TYPES = ["mythological", "deified_human", "syncretic"] as const;

function emptyCompanion(sortOrder: number): DeityDraft {
  return { name_ja: "", is_primary: false, sort_order: sortOrder, regional_lore: null, alter_name_en: null, alter_name_ja: null };
}

const inputBase =
  "bg-torii/[0.04] outline-none rounded-sm border-b border-dashed border-torii/40 focus:border-torii px-1 text-sm placeholder:text-stone/30";
const selectBase =
  "bg-torii/[0.04] outline-none rounded-sm border border-dashed border-torii/40 focus:border-torii px-1.5 py-1 text-sm";
const areaBase =
  "block w-full bg-torii/[0.04] outline-none rounded-md border border-dashed border-torii/30 focus:border-torii p-2 resize-y placeholder:text-stone/30";

/**
 * Draft-driven deity editor for the create-on-detail-page flow. Always one Primary
 * deity slot; companions are optional. Each deity either links an existing DB deity
 * (the dropdown — shows its canonical lore read-only) or starts a brand-new deity
 * (reveals identity inputs), rendered in the detail-page card style.
 */
export default function DeityCreateEditor() {
  const api = useShrineEdit();
  if (!api) return null;

  const deities = (api.getValue("deities") as DeityDraft[] | undefined) ?? [];
  const deityOptions = api.catalogs.deities ?? [];

  const setDeities = (next: DeityDraft[]) => api.setValue("deities", next);
  const update = (i: number, patch: Partial<DeityDraft>) =>
    setDeities(deities.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  // Picker: link existing (no canonical → importer reuses), new deity (reveal fields), or clear.
  const selectDeity = (i: number, value: string) => {
    if (value === "__new__") update(i, { name_ja: "", canonical: { name_en: "", deity_type: "mythological" } });
    else if (value === "") update(i, { name_ja: "", canonical: undefined });
    else {
      const picked = deityOptions.find((o) => o.id === value);
      update(i, { name_ja: picked?.name_ja ?? "", canonical: undefined });
    }
  };

  const setPrimary = (i: number) =>
    setDeities(deities.map((d, j) => ({ ...d, is_primary: j === i })));

  const addCompanion = () => setDeities([...deities, emptyCompanion(deities.length)]);

  const remove = (i: number) => {
    const next = deities.filter((_, j) => j !== i);
    // Always keep exactly one primary.
    if (!next.some((d) => d.is_primary) && next.length > 0) next[0] = { ...next[0], is_primary: true };
    setDeities(next);
  };

  return (
    <>
      {deities.map((d, i) => {
        const linked =
          d.canonical === undefined && d.name_ja
            ? deityOptions.find((o) => o.name_ja === d.name_ja)
            : undefined;
        const isNew = d.canonical !== undefined;
        const selectValue = isNew ? "__new__" : (deityOptions.find((o) => o.name_ja === d.name_ja)?.id ?? "");

        return (
          <div
            key={i}
            className={`rounded-2xl p-6 md:p-8 border shadow-3xs space-y-5 ${
              d.is_primary ? "bg-washi/70 border-moss/8" : "bg-stone/[0.015] border-stone/5"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase font-bold bg-white border border-moss/10 px-2.5 py-0.5 rounded-full inline-block select-none">
                {d.is_primary ? "Primary Enshrined Spirit" : "Companion Spirit"}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-stone/60 cursor-pointer">
                  <input
                    type="radio"
                    name="primary-deity"
                    checked={d.is_primary}
                    onChange={() => setPrimary(i)}
                  />
                  Primary
                </label>
                {deities.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove deity ${i + 1}`}
                    onClick={() => remove(i)}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-500 hover:text-red-700"
                  >
                    <X size={12} /> Remove
                  </button>
                )}
              </div>
            </div>

            {/* Picker */}
            <div className="space-y-1">
              <span className={`${typo.fieldLabel} block select-none`}>Deity</span>
              <select
                value={selectValue}
                onChange={(e) => selectDeity(i, e.target.value)}
                aria-label={`Deity ${i + 1}`}
                className={`${selectBase} w-full max-w-md`}
              >
                <option value="">— select a deity —</option>
                {deityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_en}{o.name_ja ? ` (${o.name_ja})` : ""}
                  </option>
                ))}
                <option value="__new__">＋ New deity (not in the list)</option>
              </select>
            </div>

            {/* New canonical deity — identity fields */}
            {isNew && (
              <div className="space-y-3 rounded-xl bg-torii/[0.03] border border-dashed border-torii/20 p-4">
                <p className="text-[11px] text-stone/50 font-sans">
                  New deity — created in the database on save.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className={`${typo.fieldLabel} block`}>Name (kanji)</span>
                    <input
                      value={d.name_ja}
                      onChange={(e) => update(i, { name_ja: e.target.value })}
                      placeholder="例: 天照大神"
                      aria-label="Deity name (kanji)"
                      className={`${inputBase} w-full`}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className={`${typo.fieldLabel} block`}>Name (romaji)</span>
                    <input
                      value={d.canonical?.name_en ?? ""}
                      onChange={(e) => update(i, { canonical: { ...d.canonical!, name_en: e.target.value } })}
                      placeholder="Amaterasu-Ōmikami"
                      aria-label="Deity name (romaji)"
                      className={`${inputBase} w-full`}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className={`${typo.fieldLabel} block`}>Deity type</span>
                    <select
                      value={d.canonical?.deity_type ?? "mythological"}
                      onChange={(e) =>
                        update(i, { canonical: { ...d.canonical!, deity_type: e.target.value as typeof DEITY_TYPES[number] } })
                      }
                      aria-label="Deity type"
                      className={`${selectBase} w-full`}
                    >
                      {DEITY_TYPES.map((t) => (
                        <option key={t} value={t}>{DEITY_TYPE_LABEL[t] ?? t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="space-y-1 block">
                  <span className={`${typo.fieldLabel} block`}>Titles / epithets (one per line)</span>
                  <textarea
                    value={(d.canonical?.titles ?? []).join("\n")}
                    onChange={(e) =>
                      update(i, { canonical: { ...d.canonical!, titles: e.target.value.split("\n") } })
                    }
                    rows={2}
                    placeholder={"God of Rice and Agriculture\nGuardian of Sailors"}
                    aria-label="Deity titles"
                    className={`${areaBase} text-xs font-sans`}
                  />
                </label>
              </div>
            )}

            {/* Linked existing deity — read-only canonical info (matches the detail card). */}
            {linked && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif text-moss font-medium pr-2 border-r border-stone/10" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                    {linked.name_ja}
                  </span>
                  <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(linked.deity_type)}`}>
                    {DEITY_TYPE_LABEL[linked.deity_type] ?? linked.deity_type}
                  </span>
                </div>
                {linked.titles.length > 0 && (
                  <div className="pt-2 border-t border-moss/5 space-y-1">
                    <span className={`${typo.fieldLabel} block`}>Divine Powers & Epithets</span>
                    <div className="flex flex-col gap-1 text-xs text-stone/60 font-sans font-medium">
                      {linked.titles.map((t, ti) => (
                        <div key={ti} className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1 h-1 rounded-full bg-torii/40 shrink-0 mt-1.5" />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {linked.canonical_lore && (
                  <div className="pt-3 border-t border-moss/5 space-y-1">
                    <span className={`${typo.fieldLabel} block`}>Canonical Chronicle</span>
                    <p className={`${typo.prose} whitespace-pre-line`}>{linked.canonical_lore}</p>
                  </div>
                )}
              </div>
            )}

            {/* Enshrined-as / alternate name (shrine-specific). Optional — when set, the
                shrine displays this name in place of the canonical deity name; canonical
                lore/titles still come from the deities table. */}
            <div className="space-y-1 pt-3 border-t border-dashed border-moss/10">
              <span className={`${typo.fieldLabel} block`}>Enshrined as (this shrine&rsquo;s alternate name)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={d.alter_name_en ?? ""}
                  onChange={(e) => update(i, { alter_name_en: e.target.value || null })}
                  placeholder="Alternate name (romaji) — optional"
                  aria-label="Enshrined alternate name (romaji)"
                  className={`${inputBase} w-full`}
                />
                <input
                  value={d.alter_name_ja ?? ""}
                  onChange={(e) => update(i, { alter_name_ja: e.target.value || null })}
                  placeholder="別名 (kanji) — optional"
                  aria-label="Enshrined alternate name (kanji)"
                  className={`${inputBase} w-full`}
                />
              </div>
            </div>

            {/* Regional lore (shrine-specific) */}
            <label className="space-y-1 block pt-3 border-t border-dashed border-moss/10">
              <span className={`${typo.fieldLabel} block`}>Regional Lore & Sacred Origins</span>
              <textarea
                value={d.regional_lore ?? ""}
                onChange={(e) => update(i, { regional_lore: e.target.value || null })}
                rows={d.is_primary ? 5 : 4}
                placeholder="This shrine's regional lore for the deity…"
                aria-label="Regional lore"
                className={`${areaBase} text-xs md:text-sm font-quote italic text-stone/75`}
              />
            </label>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addCompanion}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-torii/40 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-torii transition-colors hover:bg-torii/5"
      >
        <Plus size={13} /> Add companion deity
      </button>
    </>
  );
}
