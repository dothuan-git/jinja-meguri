"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarEntry, CategoryView, Region } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");

function fmt(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${MONTH_ABBR[Number(m) - 1]} ${Number(d)}`;
}
function fmtRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Dates TBC";
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

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

function EventTag({ entry }: { entry: CalendarEntry }) {
  return (
    <Link
      href={`/shrines/${entry.shrine_slug}`}
      title={`${entry.event_name_en} — ${entry.shrine_name_en}`}
      className="block truncate rounded-sm bg-vermilion/12 px-1.5 py-0.5 text-[0.68rem] leading-tight text-vermilion-deep transition-colors hover:bg-vermilion hover:text-washi"
    >
      {entry.event_name_en}
    </Link>
  );
}

export default function Calendar({
  year,
  months,
  regions,
  categoryGroups,
}: {
  year: number;
  months: Record<number, CalendarEntry[]>;
  regions: Region[];
  categoryGroups: { group_label: string; categories: CategoryView[] }[];
}) {
  const [month, setMonth] = useState(7);
  const [view, setView] = useState<"grid" | "agenda">("grid");
  const [regionSel, setRegionSel] = useState<Set<string>>(new Set());
  const [catSel, setCatSel] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const entries = useMemo(() => {
    const all = months[month] ?? [];
    return all.filter((e) => {
      if (regionSel.size && !regionSel.has(String(e.region_id))) return false;
      if (catSel.size && !e.category_codes.some((c) => catSel.has(c))) return false;
      return true;
    });
  }, [months, month, regionSel, catSel]);

  const dated = entries.filter((e) => !e.is_fallback);
  const fallback = entries.filter((e) => e.is_fallback);

  const nDays = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];

  const entriesOn = (day: number) => {
    const iso = `${year}-${pad(month)}-${pad(day)}`;
    return dated.filter((e) => e.start_date! <= iso && e.end_date! >= iso);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">When the kami are honored</p>
          <h1 className="mt-2 font-display text-5xl font-semibold">Festival calendar</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full border hairline p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={"rounded-full px-4 py-1 " + (view === "grid" ? "bg-sumi text-washi" : "text-sumi-soft")}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView("agenda")}
            className={"rounded-full px-4 py-1 " + (view === "agenda" ? "bg-sumi text-washi" : "text-sumi-soft")}
          >
            Agenda
          </button>
        </div>
      </header>

      {/* month nav */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month === 1}
          onClick={() => setMonth((m) => Math.max(1, m - 1))}
          className="rounded-full border hairline px-3 py-1 text-sumi-soft enabled:hover:border-vermilion enabled:hover:text-vermilion-deep disabled:opacity-30"
        >
          ←
        </button>
        <h2 className="font-display text-3xl font-semibold">
          {MONTHS[month - 1]} <span className="text-sumi-soft">{year}</span>
        </h2>
        <button
          type="button"
          aria-label="Next month"
          disabled={month === 12}
          onClick={() => setMonth((m) => Math.min(12, m + 1))}
          className="rounded-full border hairline px-3 py-1 text-sumi-soft enabled:hover:border-vermilion enabled:hover:text-vermilion-deep disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* filters */}
      <div className="mt-6 space-y-3 border-y hairline py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="kicker mr-1">Region</span>
          {regions.map((r) => (
            <FilterPill
              key={r.id}
              active={regionSel.has(String(r.id))}
              onClick={() => toggle(regionSel, setRegionSel, String(r.id))}
            >
              {r.name_en}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="kicker mr-1">Strong for</span>
          {categoryGroups.flatMap((g) =>
            g.categories.map((c) => (
              <FilterPill
                key={c.code}
                active={catSel.has(c.code)}
                onClick={() => toggle(catSel, setCatSel, c.code)}
              >
                {c.name_en}
              </FilterPill>
            ))
          )}
        </div>
      </div>

      {/* month grid */}
      {view === "grid" && (
        <div className="mt-8">
          <div className="grid grid-cols-7 gap-px border hairline bg-[var(--hairline)] text-center text-xs">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-washi py-2 font-medium uppercase tracking-widest text-sumi-soft">
                {w}
              </div>
            ))}
            {cells.map((day, i) => (
              <div key={i} className="min-h-[5.5rem] bg-washi p-1.5 text-left align-top">
                {day && (
                  <>
                    <div className="mb-1 text-[0.7rem] text-sumi-soft">{day}</div>
                    <div className="space-y-1">
                      {entriesOn(day)
                        .slice(0, 3)
                        .map((e) => (
                          <EventTag key={`${e.event_id}-${day}`} entry={e} />
                        ))}
                      {entriesOn(day).length > 3 && (
                        <div className="text-[0.62rem] text-sumi-soft">+{entriesOn(day).length - 3}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* agenda */}
      {view === "agenda" && (
        <div className="mt-8">
          {dated.length === 0 ? (
            <p className="text-sumi-soft">No dated festivals this month.</p>
          ) : (
            <ul className="divide-y hairline border-y hairline">
              {[...dated]
                .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))
                .map((e) => (
                  <li key={`${e.event_id}-${e.start_date}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                    <span className="w-28 shrink-0 font-display text-lg text-vermilion-deep">
                      {fmtRange(e.start_date, e.end_date)}
                    </span>
                    <Link href={`/shrines/${e.shrine_slug}`} className="group">
                      <span className="text-lg">{e.event_name_en}</span>
                      {e.event_name_ja && <span className="jp ml-2 text-sumi-soft">{e.event_name_ja}</span>}
                      <span className="block text-sm text-sumi-soft">
                        {e.shrine_name_en} · {e.region}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {/* fallback — unpinned expected timing */}
      {fallback.length > 0 && (
        <section className="mt-10 rounded-md border border-dashed border-vermilion/40 bg-vermilion/[0.04] p-5">
          <h3 className="kicker text-vermilion-deep">Expected timing — dates TBC</h3>
          <p className="mt-1 text-sm text-sumi-soft">
            These festivals recur on lunar or “Nth-weekday” schedules; concrete {year} dates are not yet
            uploaded.
          </p>
          <ul className="mt-4 space-y-3">
            {fallback.map((e) => (
              <li key={e.event_id}>
                <Link href={`/shrines/${e.shrine_slug}`} className="group">
                  <span className="text-base">{e.event_name_en}</span>
                  {e.event_name_ja && <span className="jp ml-2 text-sumi-soft">{e.event_name_ja}</span>}
                  <span className="block text-sm text-sumi-soft">
                    {e.shrine_name_en} · {e.region}
                    {e.time_prose ? ` — ${e.time_prose}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
