"use client";

import { MapPin, ArrowRight } from "lucide-react";
import { DEITY_TYPE_LABEL } from "@/lib/labels";
import { getDeityTypeTextColor } from "@/lib/facetColors";
import { DEITY_TYPES } from "@/lib/admin/deityContract";
import { useDeityEdit } from "@/components/deityEdit/context";

export interface DeityCardShrine {
  id: string;
  name: string;
  location: string;
  prefecture: string;
  region: string;
  slug: string;
  isPrimary: boolean;
  regionalLore: string;
}

export interface DeityCardData {
  name: string;
  japaneseName: string;
  deityType: string;
  titles: string[];
  canonicalLore: string;
  shrines: DeityCardShrine[];
}

const inputBase =
  "bg-torii/[0.04] outline-none rounded-sm border-b border-dashed border-torii/40 focus:border-torii px-1 placeholder:text-stone/30";
const selectBase =
  "bg-torii/[0.04] outline-none rounded-sm border border-dashed border-torii/40 focus:border-torii px-1.5 py-1 text-sm";
const areaBase =
  "block w-full bg-torii/[0.04] outline-none rounded-md border border-dashed border-torii/30 focus:border-torii p-2 resize-y placeholder:text-stone/30";

/**
 * Presentational deity card (identity · canonical chronicle · enshrined sites),
 * shared by the `/deities` carousel and the `/deities/new` create page. When a
 * {@link DeityEditProvider} is mounted above it (admin edit / create), the
 * editable canonical fields swap to inputs and read/write the draft; otherwise
 * it renders read-only from the `deity` prop. The enshrined-sites zone is always
 * read-only (derived from shrine_deities).
 */
export default function DeityCardBody({
  deity,
  onShrineClick,
}: {
  deity: DeityCardData;
  onShrineClick?: (slug: string) => void;
}) {
  const edit = useDeityEdit();
  const editing = edit?.editing ?? false;

  // Display values: from the draft while editing, from the prop on the read path.
  const name = editing ? edit!.draft.name_en : deity.name;
  const japaneseName = editing ? edit!.draft.name_ja : deity.japaneseName;
  const deityType = editing ? edit!.draft.deity_type : deity.deityType;
  const titles = editing ? edit!.draft.titles ?? [] : deity.titles;
  const canonicalLore = editing ? edit!.draft.canonical_lore ?? "" : deity.canonicalLore;

  return (
    <div className="relative z-10">
      {/* ZONE 1 — Identity band */}
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Top Row: Meta Indicator and Stamp Seal */}
          <div className="flex items-start justify-between">
            <span className="text-[9px] font-mono tracking-[0.15em] text-[#5e7f5a] font-bold bg-[#f3f6f1] border border-bamboo/15 px-2.5 py-1 rounded-sm select-none scale-95 origin-left uppercase">
              Kami Chronicle Archive
            </span>

            {/* Traditional Vermillion Square Hanko Stamp */}
            <div className="w-12 h-12 border border-torii/80 text-torii font-bold font-display text-[10px] leading-tight tracking-wider flex items-center justify-center p-1.5 rotate-[-2.5deg] shadow-[inset_0_0_2px_rgba(201,75,50,0.25)] select-none shrink-0" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              <div className="text-center font-black select-none">
                {japaneseName.slice(0, 2)}
                <br />
                之神
              </div>
            </div>
          </div>

          {/* Display Divine Names */}
          <div className="space-y-1">
            {editing ? (
              <input
                value={name}
                onChange={(e) => edit!.update({ name_en: e.target.value })}
                placeholder="Amaterasu-Ōmikami"
                aria-label="Deity name (romaji)"
                className={`${inputBase} text-3xl md:text-4xl font-display font-black text-stone tracking-tight leading-tight w-full`}
              />
            ) : (
              <h3 className="text-3xl md:text-4xl font-display font-black text-stone tracking-tight leading-tight select-all">
                {name}
              </h3>
            )}
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  value={japaneseName}
                  onChange={(e) => edit!.update({ name_ja: e.target.value })}
                  placeholder="例: 天照大神"
                  aria-label="Deity name (kanji)"
                  className={`${inputBase} text-sm font-display text-moss font-medium`}
                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                />
              ) : (
                <span className="text-sm font-display text-moss font-medium pr-2 border-r border-stone/10 select-all" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  {japaneseName}
                </span>
              )}
              {editing ? (
                <select
                  value={deityType}
                  onChange={(e) => edit!.update({ deity_type: e.target.value as (typeof DEITY_TYPES)[number] })}
                  aria-label="Deity type"
                  className={selectBase}
                >
                  {DEITY_TYPES.map((t) => (
                    <option key={t} value={t}>{DEITY_TYPE_LABEL[t] ?? t}</option>
                  ))}
                </select>
              ) : (
                <span className={`text-[10px] font-mono tracking-widest font-bold select-none ${getDeityTypeTextColor(deityType)}`}>
                  {DEITY_TYPE_LABEL[deityType] ?? deityType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Epithets (chips) + quick stats, side by side */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 pt-6 border-t border-moss/10">
          <div className="flex-1 space-y-2 select-text">
            <span className="text-[9px] font-bold tracking-widest text-moss/55 uppercase block select-none">
              Divine Powers & Epithets
            </span>
            {editing ? (
              <textarea
                value={titles.join("\n")}
                onChange={(e) => edit!.update({ titles: e.target.value.trim() === "" ? [] : e.target.value.split("\n") })}
                rows={3}
                placeholder={"God of Rice and Agriculture\nGuardian of Sailors"}
                aria-label="Deity titles (one per line)"
                className={`${areaBase} text-xs font-sans`}
              />
            ) : (
              titles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs text-stone/75 font-sans font-medium">
                  {titles.map((title, tIdx) => (
                    <span key={tIdx} className="inline-flex items-center gap-1.5 leading-snug bg-white/40 px-2.5 py-1 rounded-lg border border-stone/[0.03] shadow-3xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-torii shrink-0" />
                      {title}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 lg:w-72 shrink-0 select-none">
            <div className="p-3 bg-white/50 border border-stone/5 rounded-xl shadow-4xs text-center sm:text-left">
              <span className="text-[8px] font-bold tracking-widest text-stone/45 uppercase block">Enshrined Sites</span>
              <span className="text-xs font-serif font-bold text-torii leading-none mt-1 block">{deity.shrines.length} Sanctuaries</span>
            </div>
            <div className="p-3 bg-white/50 border border-stone/5 rounded-xl shadow-4xs text-center sm:text-left">
              <span className="text-[8px] font-bold tracking-widest text-stone/45 uppercase block">Mythic Sphere</span>
              <span className="text-xs font-serif font-bold text-moss-light leading-none mt-1 block">
                {name.includes("Inari") ? "Agriculture & Commerce" :
                 name.includes("Amaterasu") ? "Solar & Imperial" :
                 name.includes("Susanoo") ? "Storm & Gion" : "Natural Forces"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 2 — Canonical Chronicle */}
      <div className="space-y-3 pt-8 mt-8 border-t border-moss/10">
        <span className="text-[9px] font-bold tracking-widest text-moss/55 uppercase block select-none">
          Canonical Chronicle
        </span>
        {editing ? (
          <textarea
            value={canonicalLore}
            onChange={(e) => edit!.update({ canonical_lore: e.target.value || null })}
            rows={8}
            placeholder="The deity's canonical mythological narrative (Kojiki / Nihon Shoki)…"
            aria-label="Canonical lore"
            className={`${areaBase} text-xs md:text-sm font-sans text-stone/80 leading-relaxed`}
          />
        ) : (
          <p className="text-xs md:text-sm font-sans text-stone/80 leading-relaxed text-justify select-text whitespace-pre-line lg:columns-2 lg:gap-10 lg:[column-rule:1px_solid_rgba(0,0,0,0.05)]">
            {canonicalLore}
          </p>
        )}
      </div>

      {/* ZONE 3 — Enshrined Sites (read-only, derived) */}
      <div className="space-y-4 pt-8 mt-8 border-t border-moss/10">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[9px] font-bold tracking-widest text-[#782c1a] uppercase block select-none">
            Enshrined Sites & Regional Lore
          </span>
          {deity.shrines.length > 0 && (
            <span className="text-[10px] font-mono text-stone/35 select-none hidden sm:block">
              Scroll for more →
            </span>
          )}
        </div>

        {deity.shrines.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-stone/15 bg-stone/[0.015] text-center flex flex-col items-center gap-2">
            <MapPin size={16} className="text-stone/25" />
            <p className="text-xs font-serif text-stone/45 italic">
              No shrine linked yet
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x select-none">
            {deity.shrines.map(({ id, name: shrineName, location, prefecture, region, slug, isPrimary, regionalLore }) => (
              <div
                key={id}
                onClick={() => onShrineClick?.(slug)}
                className={`snap-start shrink-0 w-[calc(100vw-3rem)] sm:w-[380px] md:w-[560px] p-5 rounded-xl border transition-all text-left group cursor-pointer hover:bg-stone/[0.015] ${
                  isPrimary
                    ? "bg-white border-torii/15 hover:border-torii shadow-3xs"
                    : "bg-stone/[0.01] border-stone/10 hover:border-moss shadow-4xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                      isPrimary ? "bg-torii/10 text-torii border-torii/10" : "bg-stone/10 text-stone/60 border-stone/5"
                    }`}>
                      <MapPin size={11} className={isPrimary ? "animate-pulse" : ""} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-serif font-black text-stone leading-tight flex items-center gap-1.5">
                        {shrineName}
                      </h4>
                      <span className="text-[9px] font-sans text-stone/40 block mt-0.5">
                        {location} • {prefecture} Prefecture ({region} Region)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 scale-95 font-bold ${
                      isPrimary ? "text-torii bg-torii/5" : "text-stone/40 bg-stone/5"
                    }`}>
                      {isPrimary ? "Primary Enshrined" : "Companion Spirit"}
                    </span>
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-stone/40 group-hover:text-torii transition-colors flex items-center gap-0.5 shrink-0 pl-1.5 border-l border-stone/10">
                      File
                      <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {regionalLore && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-stone/10 font-quote italic text-xs md:text-sm text-stone/75 leading-relaxed bg-[#fbfaf6] p-3 rounded-lg border border-stone/5 relative select-text flex gap-2">
                    <span className="text-torii text-base leading-none font-sans font-black select-none">“</span>
                    <div className="flex-1 text-justify whitespace-pre-line">
                      {regionalLore}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
