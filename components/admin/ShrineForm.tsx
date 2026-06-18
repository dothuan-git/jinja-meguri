"use client";

import { useState } from "react";
import type { ShrineInput } from "@/lib/admin/shrineContract";
import type { Region, Prefecture, Rank, PrayerCategory, Deity } from "@/lib/types";

interface Props {
  initialData?: ShrineInput;
  catalogs: { regions: Region[]; prefectures: Prefecture[]; ranks: Rank[]; prayerCategories: PrayerCategory[] };
  existingDeities: Deity[];
  onSave: (data: ShrineInput) => void;
  pending: boolean;
}

const DEITY_TYPES = ["mythological", "deified_human", "syncretic"] as const;
const FESTIVAL_TYPES = ["spectacle", "pilgrimage"] as const;
const CURRENT_YEAR = new Date().getFullYear();

type DeityDraft = ShrineInput["deities"][number];
type FestivalDraft = NonNullable<ShrineInput["festivals"]>[number];
type OccurrenceDraft = NonNullable<FestivalDraft["occurrences"]>[number];
type SourceDraft = NonNullable<ShrineInput["sources"]>[number];

function emptyDeity(): DeityDraft {
  return { name_ja: "", is_primary: false, sort_order: 0, regional_lore: "" };
}
function emptyFestival(): FestivalDraft {
  return { name_en: "", name_ja: "", time_prose: "", festival_type: "spectacle", occurrences: [] };
}
function emptyOccurrence(): OccurrenceDraft {
  return { year: CURRENT_YEAR, start_date: "", end_date: null };
}
function emptySource(): SourceDraft {
  return { url: "", title: "" };
}

// Textarea (one epithet per line) → trimmed string[]; omit the key entirely when empty.
function cleanTitles(titles: string[] | null | undefined): string[] | undefined {
  const cleaned = (titles ?? []).map((t) => t.trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const cls = "w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500";
const textareaClass = `${cls} font-sans`;

export default function ShrineForm({ initialData, catalogs, existingDeities, onSave, pending }: Props) {
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [nameEn, setNameEn] = useState(initialData?.name_en ?? "");
  const [nameJa, setNameJa] = useState(initialData?.name_ja ?? "");
  const [region, setRegion] = useState(initialData?.region ?? "");
  const [prefecture, setPrefecture] = useState(initialData?.prefecture ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [lat, setLat] = useState(initialData?.coordinates?.lat?.toString() ?? "");
  const [lng, setLng] = useState(initialData?.coordinates?.lng?.toString() ?? "");
  const [history, setHistory] = useState(initialData?.details?.history ?? "");
  const [description, setDescription] = useState(initialData?.details?.description ?? "");
  const [prayerFocus, setPrayerFocus] = useState(initialData?.details?.prayer_focus ?? "");
  const [bestTime, setBestTime] = useState(initialData?.details?.best_time ?? "");
  const [quote, setQuote] = useState(initialData?.details?.quote ?? "");
  const [ranks, setRanks] = useState<string[]>(initialData?.ranks ?? []);
  const [categories, setCategories] = useState<string[]>(initialData?.prayer_categories ?? []);
  const [deities, setDeities] = useState<DeityDraft[]>(initialData?.deities ?? [emptyDeity()]);
  const [festivals, setFestivals] = useState<FestivalDraft[]>(initialData?.festivals ?? []);
  const [sources, setSources] = useState<SourceDraft[]>(initialData?.sources ?? []);

  const filteredPrefectures = region
    ? catalogs.prefectures.filter((p) => {
        const r = catalogs.regions.find((r) => r.name_en === region);
        return r ? p.region_id === r.id : true;
      })
    : catalogs.prefectures;

  function toggleCheck(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // Existing deities the user can link to (the contract keys on name_ja, so only
  // those with a kanji name are selectable).
  const deityOptions = existingDeities
    .filter((d) => d.name_ja)
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  function updateDeity(i: number, patch: Partial<DeityDraft>) {
    setDeities((prev) => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  }

  // Deity picker: link an existing deity (no canonical block → importer reuses it),
  // start a new deity (reveal canonical fields), or clear the selection.
  function selectDeity(i: number, value: string) {
    if (value === "__new__") {
      updateDeity(i, { name_ja: "", canonical: { name_en: "", deity_type: "mythological" } });
    } else if (value === "") {
      updateDeity(i, { name_ja: "", canonical: undefined });
    } else {
      const picked = deityOptions.find((o) => o.id === value);
      updateDeity(i, { name_ja: picked?.name_ja ?? "", canonical: undefined });
    }
  }
  function updateFestival(i: number, patch: Partial<FestivalDraft>) {
    setFestivals((prev) => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }
  function addOccurrence(fi: number) {
    setFestivals((prev) => prev.map((f, idx) => idx === fi ? { ...f, occurrences: [...(f.occurrences ?? []), emptyOccurrence()] } : f));
  }
  function updateOccurrence(fi: number, oi: number, patch: Partial<OccurrenceDraft>) {
    setFestivals((prev) => prev.map((f, idx) =>
      idx === fi ? { ...f, occurrences: (f.occurrences ?? []).map((o, j) => j === oi ? { ...o, ...patch } : o) } : f
    ));
  }
  function removeOccurrence(fi: number, oi: number) {
    setFestivals((prev) => prev.map((f, idx) =>
      idx === fi ? { ...f, occurrences: (f.occurrences ?? []).filter((_, j) => j !== oi) } : f
    ));
  }
  function updateSource(i: number, patch: Partial<SourceDraft>) {
    setSources((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: ShrineInput = {
      slug,
      name_en: nameEn,
      name_ja: nameJa || null,
      region,
      prefecture,
      city: city || null,
      address: address || null,
      coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
      details: { history: history || null, description: description || null, prayer_focus: prayerFocus || null, best_time: bestTime || null, quote: quote || null },
      ranks: ranks.length ? ranks : undefined,
      prayer_categories: categories.length ? categories : undefined,
      deities: deities.map((d, i) => ({
        ...d,
        canonical: d.canonical ? { ...d.canonical, titles: cleanTitles(d.canonical.titles) } : d.canonical,
        sort_order: i,
        regional_lore: d.regional_lore || null,
      })),
      festivals: festivals.length
        ? festivals.map((f) => ({
            ...f,
            // Keep only complete occurrence rows; normalize empty end_date to null.
            occurrences: (f.occurrences ?? [])
              .filter((o) => o.start_date)
              .map((o) => ({ ...o, year: Number(o.year), end_date: o.end_date || null })),
          }))
        : undefined,
      sources: sources.length ? sources : undefined,
    };
    onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug *">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className={cls} placeholder="my-shrine-name" />
          </Field>
          <Field label="Name (English) *">
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className={cls} />
          </Field>
          <Field label="Name (Japanese)">
            <input value={nameJa} onChange={(e) => setNameJa(e.target.value)} className={cls} />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={cls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Region *">
            <select value={region} onChange={(e) => { setRegion(e.target.value); setPrefecture(""); }} required className={cls}>
              <option value="">— select —</option>
              {catalogs.regions.map((r) => <option key={r.id} value={r.name_en}>{r.name_en}</option>)}
            </select>
          </Field>
          <Field label="Prefecture *">
            <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)} required className={cls}>
              <option value="">— select —</option>
              {filteredPrefectures.map((p) => <option key={p.id} value={p.name_en}>{p.name_en}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={cls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className={cls} placeholder="35.0036" />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className={cls} placeholder="135.7785" />
          </Field>
        </div>
      </section>

      {/* Prose details */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Details</h2>
        <Field label="History">
          <textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={4} className={textareaClass} />
        </Field>
        <Field label="Description (why visit)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={textareaClass} />
        </Field>
        <Field label="Prayer focus">
          <textarea value={prayerFocus} onChange={(e) => setPrayerFocus(e.target.value)} rows={2} className={textareaClass} />
        </Field>
        <Field label="Best time to visit">
          <textarea value={bestTime} onChange={(e) => setBestTime(e.target.value)} rows={2} className={textareaClass} />
        </Field>
        <Field label="Quote">
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} className={textareaClass} />
        </Field>
      </section>

      {/* Ranks */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Ranks</h2>
        <div className="flex flex-wrap gap-3">
          {catalogs.ranks.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={ranks.includes(r.name_en)}
                onChange={() => toggleCheck(ranks, setRanks, r.name_en)}
                className="rounded"
              />
              {r.name_en}
            </label>
          ))}
        </div>
      </section>

      {/* Prayer categories */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Prayer Categories</h2>
        <div className="flex flex-wrap gap-3">
          {catalogs.prayerCategories.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={categories.includes(c.name_en)}
                onChange={() => toggleCheck(categories, setCategories, c.name_en)}
                className="rounded"
              />
              {c.name_en}
            </label>
          ))}
        </div>
      </section>

      {/* Deities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Deities *</h2>
          <button type="button" onClick={() => setDeities((d) => [...d, emptyDeity()])} className="text-sm text-stone-600 hover:text-stone-900">
            + Add deity
          </button>
        </div>
        {deities.map((d, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Deity {i + 1}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={d.is_primary} onChange={(e) => {
                    if (e.target.checked) setDeities((prev) => prev.map((x, j) => ({ ...x, is_primary: j === i })));
                    else updateDeity(i, { is_primary: false });
                  }} className="rounded" />
                  Primary
                </label>
                {deities.length > 1 && (
                  <button type="button" onClick={() => setDeities((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <Field label="Deity *">
              <select
                value={d.canonical !== undefined ? "__new__" : (deityOptions.find((o) => o.name_ja === d.name_ja)?.id ?? "")}
                onChange={(e) => selectDeity(i, e.target.value)}
                required
                className={cls}
              >
                <option value="">— select a deity —</option>
                {deityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_en}{o.name_ja ? ` (${o.name_ja})` : ""}
                  </option>
                ))}
                <option value="__new__">＋ New deity (not in the list)</option>
              </select>
            </Field>

            {d.canonical !== undefined && (
              <div className="space-y-3 rounded bg-gray-50 p-3">
                <p className="text-xs text-gray-500">New canonical deity — it will be created in the database on save.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name (kanji) *">
                    <input value={d.name_ja} onChange={(e) => updateDeity(i, { name_ja: e.target.value })} required className={cls} />
                  </Field>
                  <Field label="Name (romaji) *">
                    <input value={d.canonical?.name_en ?? ""} onChange={(e) => updateDeity(i, { canonical: { ...d.canonical!, name_en: e.target.value } })} required className={cls} />
                  </Field>
                  <Field label="Deity type">
                    <select value={d.canonical?.deity_type ?? "mythological"} onChange={(e) => updateDeity(i, { canonical: { ...d.canonical!, deity_type: e.target.value as typeof DEITY_TYPES[number] } })} className={cls}>
                      {DEITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Titles">
                  <textarea
                    value={(d.canonical?.titles ?? []).join("\n")}
                    onChange={(e) => updateDeity(i, { canonical: { ...d.canonical!, titles: e.target.value.split("\n") } })}
                    rows={2}
                    className={textareaClass}
                    placeholder={"One English domain epithet per line\ne.g. God of Rice and Agriculture"}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    One English domain epithet per line (sphere of patronage). Mainly for new companion deities.
                  </p>
                </Field>
              </div>
            )}

            <Field label="Regional lore">
              <textarea value={d.regional_lore ?? ""} onChange={(e) => updateDeity(i, { regional_lore: e.target.value })} rows={2} className={textareaClass} />
              <p className="mt-1 text-xs text-gray-400">
                Primary deity: shown as a supplementary note beneath the canonical lore. Secondary deity: the only lore shown on the shrine page.
              </p>
            </Field>
          </div>
        ))}
      </section>

      {/* Festivals */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Festivals</h2>
          <button type="button" onClick={() => setFestivals((f) => [...f, emptyFestival()])} className="text-sm text-stone-600 hover:text-stone-900">
            + Add festival
          </button>
        </div>
        {festivals.map((f, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Festival {i + 1}</span>
              <button type="button" onClick={() => setFestivals((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name (English) *">
                <input value={f.name_en} onChange={(e) => updateFestival(i, { name_en: e.target.value })} required className={cls} />
              </Field>
              <Field label="Name (Japanese)">
                <input value={f.name_ja ?? ""} onChange={(e) => updateFestival(i, { name_ja: e.target.value })} className={cls} />
              </Field>
              <Field label="Type">
                <select value={f.festival_type ?? "spectacle"} onChange={(e) => updateFestival(i, { festival_type: e.target.value as typeof FESTIVAL_TYPES[number] })} className={cls}>
                  {FESTIVAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Time (display)">
                <input value={f.time_prose ?? ""} onChange={(e) => updateFestival(i, { time_prose: e.target.value })} className={cls} placeholder="e.g. First Sunday of May" />
              </Field>
            </div>
            <Field label="Origin">
              <textarea value={f.origin ?? ""} onChange={(e) => updateFestival(i, { origin: e.target.value })} rows={2} className={textareaClass} />
            </Field>
            <Field label="Meaning">
              <textarea value={f.meaning ?? ""} onChange={(e) => updateFestival(i, { meaning: e.target.value })} rows={2} className={textareaClass} />
            </Field>
            <Field label="Ritual">
              <textarea value={f.ritual ?? ""} onChange={(e) => updateFestival(i, { ritual: e.target.value })} rows={2} className={textareaClass} />
            </Field>
            <Field label="Prayer">
              <textarea value={f.prayer ?? ""} onChange={(e) => updateFestival(i, { prayer: e.target.value })} rows={2} className={textareaClass} />
            </Field>
            <Field label="Visitor notes">
              <textarea value={f.visitor_notes ?? ""} onChange={(e) => updateFestival(i, { visitor_notes: e.target.value })} rows={2} className={textareaClass} />
            </Field>

            {/* Dates (festival_occurrences) — per-year exact dates that drive the calendar */}
            <div className="space-y-2 rounded border border-dashed border-gray-300 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dates</span>
                <button type="button" onClick={() => addOccurrence(i)} className="text-xs text-stone-600 hover:text-stone-900">
                  + Add date for {CURRENT_YEAR}
                </button>
              </div>
              {(f.occurrences ?? []).length === 0 && (
                <p className="text-xs text-gray-400">No dates yet — undated festivals don’t appear on the calendar.</p>
              )}
              {(f.occurrences ?? []).map((o, oi) => (
                <div key={oi} className="flex items-end gap-2">
                  <div className="w-24">
                    <Field label={`Year (now ${CURRENT_YEAR})`}>
                      <input type="number" value={o.year} onChange={(e) => updateOccurrence(i, oi, { year: Number(e.target.value) })} className={cls} />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Start date *">
                      <input type="date" value={o.start_date} onChange={(e) => updateOccurrence(i, oi, { start_date: e.target.value })} className={cls} />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="End date">
                      <input type="date" value={o.end_date ?? ""} onChange={(e) => updateOccurrence(i, oi, { end_date: e.target.value || null })} className={cls} />
                    </Field>
                  </div>
                  <button type="button" onClick={() => removeOccurrence(i, oi)} className="mb-1.5 text-xs text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Sources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Sources</h2>
          <button type="button" onClick={() => setSources((s) => [...s, emptySource()])} className="text-sm text-stone-600 hover:text-stone-900">
            + Add source
          </button>
        </div>
        {sources.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Field label="URL *">
                <input type="url" value={s.url} onChange={(e) => updateSource(i, { url: e.target.value })} required className={cls} />
              </Field>
              <Field label="Title">
                <input value={s.title ?? ""} onChange={(e) => updateSource(i, { title: e.target.value })} className={cls} />
              </Field>
            </div>
            <button type="button" onClick={() => setSources((prev) => prev.filter((_, j) => j !== i))} className="mt-6 text-xs text-red-500 hover:text-red-700">✕</button>
          </div>
        ))}
      </section>

      {/* Submit */}
      <div className="flex gap-3 pt-2 border-t">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-stone-800 px-6 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save shrine"}
        </button>
        <a href="/admin" className="rounded border px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </a>
      </div>
    </form>
  );
}
