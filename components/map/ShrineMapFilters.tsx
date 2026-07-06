"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  CalendarRange,
  Globe2,
  MapPin,
  PartyPopper,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  monthInRange,
  type MonthRange,
  type ShrineFacetId,
  type ShrineFilters,
} from "@/lib/shrineFilters";

export type FacetDropdown = { id: ShrineFacetId; label: string; options: string[] };

// Per-facet icon so the facet tabs scan at a glance.
const FACET_ICON: Partial<Record<ShrineFacetId, LucideIcon>> = {
  region: Globe2,
  prefecture: MapPin,
  prayerFocus: Sparkles,
  ranks: Award,
};

export default function ShrineMapFilters({
  open,
  onClose,
  filters,
  dropdowns,
  onToggleFacet,
  onSetFestivalMonths,
  showFestivals,
  onToggleShowFestivals,
  onClearAll,
  hasActiveFilters,
}: {
  open: boolean;
  onClose: () => void;
  filters: ShrineFilters;
  dropdowns: FacetDropdown[];
  onToggleFacet: (facet: ShrineFacetId, value: string) => void;
  onSetFestivalMonths: (range: MonthRange | null) => void;
  showFestivals: boolean;
  onToggleShowFestivals: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-torii/20 bg-sand/97 backdrop-blur-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-moss/10 shrink-0">
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
                <SlidersHorizontal size={12} />
                Filter shrines
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-0.5 text-stone/40 hover:text-stone transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body — festival controls grouped in one card, then the facets as a tab switcher */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <FestivalsCard
                value={filters.festivalMonths}
                onChange={onSetFestivalMonths}
                showFestivals={showFestivals}
                onToggleShowFestivals={onToggleShowFestivals}
              />

              <p className="text-[9px] font-mono font-black uppercase tracking-widest text-moss-light/60 pt-1 select-none">
                Refine by
              </p>

              <FacetTabs dropdowns={dropdowns} filters={filters} onToggleFacet={onToggleFacet} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-moss/10 shrink-0">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[10px] uppercase font-mono tracking-widest text-[#9d4432] hover:text-torii font-black transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-moss text-white px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer hover:bg-moss-light transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Facet filters as a 2x2 tab switcher over one shared search+options panel,
// instead of four independently-expanding accordions stacked in a column —
// only one panel ever needs to lay out, so opening a facet never reflows the
// others below it.
function FacetTabs({
  dropdowns,
  filters,
  onToggleFacet,
}: {
  dropdowns: FacetDropdown[];
  filters: ShrineFilters;
  onToggleFacet: (facet: ShrineFacetId, value: string) => void;
}) {
  const [activeId, setActiveId] = useState<ShrineFacetId | null>(dropdowns[0]?.id ?? null);
  const [optionQuery, setOptionQuery] = useState("");

  const active = dropdowns.find((d) => d.id === activeId) ?? dropdowns[0];
  if (!active) return null;

  const query = optionQuery.trim().toLowerCase();
  const options = query ? active.options.filter((o) => o.toLowerCase().includes(query)) : active.options;

  function selectTab(id: ShrineFacetId) {
    setActiveId(id);
    setOptionQuery("");
  }

  return (
    <div className="space-y-2">
      {/* Tab row — one button per facet, switches the shared panel below */}
      <div className="grid grid-cols-2 gap-1.5">
        {dropdowns.map((dropdown) => {
          const activeCount = filters[dropdown.id].length;
          const isActive = dropdown.id === active.id;
          const FacetIcon = FACET_ICON[dropdown.id];
          return (
            <button
              key={dropdown.id}
              type="button"
              onClick={() => selectTab(dropdown.id)}
              className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                isActive
                  ? "border-torii bg-torii/10 text-torii font-bold"
                  : activeCount > 0
                    ? "border-torii/25 bg-torii/5 text-torii font-semibold"
                    : "border-moss/15 bg-washi/60 text-stone/70 hover:bg-washi"
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {FacetIcon && <FacetIcon size={12} className="shrink-0" />}
                <span className="truncate">{dropdown.label}</span>
              </span>
              {activeCount > 0 && <span className="shrink-0 text-[9px] font-mono font-black">{activeCount}</span>}
            </button>
          );
        })}
      </div>

      {/* Shared panel for whichever facet is active. AutoHeight animates the
          panel's real height as its content grows/shrinks (switching facets,
          typing a search query) — a true height animation, so nothing scales
          or distorts. The keyed inner div cross-fades the content on a tab
          switch; searching within a tab keeps the same key, so only the height
          animates. */}
      <AutoHeight className="border border-moss/15 rounded-xl overflow-hidden bg-washi/40">
        <motion.div key={active.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          <div className="p-3 pb-2.5">
            <div className="relative flex items-center bg-washi/90 border border-moss/15 rounded-lg focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
              <Search className="absolute left-2.5 text-stone/40" size={12} />
              <input
                type="text"
                placeholder={`Search ${active.label.toLowerCase()}…`}
                value={optionQuery}
                onChange={(e) => setOptionQuery(e.target.value)}
                className="w-full text-[11px] font-sans pl-7 pr-7 py-2 bg-transparent border-none outline-hidden focus:ring-0 text-stone"
              />
              {optionQuery && (
                <button
                  type="button"
                  onClick={() => setOptionQuery("")}
                  aria-label="Clear"
                  className="absolute right-2 text-stone/40 hover:text-torii p-1 rounded-full transition-colors cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
          <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-0.5">
            {options.length === 0 ? (
              <p className="px-1 py-2 text-[11px] font-sans italic text-stone/40">No matches</p>
            ) : (
              options.map((option) => {
                const checked = filters[active.id].includes(option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2.5 text-xs text-stone cursor-pointer py-1.5 px-1 rounded-lg hover:bg-bamboo-light select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleFacet(active.id, option)}
                      className="rounded border-moss/30 text-torii focus:ring-0 w-3.5 h-3.5 accent-torii"
                    />
                    <span
                      className={`transition-colors truncate font-sans font-medium ${
                        checked ? "text-torii font-bold" : "text-stone/72"
                      }`}
                    >
                      {option}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </motion.div>
      </AutoHeight>
    </div>
  );
}

// Animates its own height to fit its content as that content changes size,
// via a ResizeObserver on an inner wrapper (which sits at natural height,
// unaffected by the animated outer height thanks to overflow: hidden). This
// animates the real `height` property — unlike Framer's `layout` prop, which
// resizes with a transform scale that visibly distorts text/borders mid-tween.
function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      initial={false}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: "hidden" }}
      className={className}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

// Display preference (not a filter): reveal each shrine's festivals inside the
// marker-click popup. Rendered as a switch row nested inside FestivalsCard,
// below the season range control.
function ShowFestivalsRow({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
        checked ? "bg-torii/5 text-torii font-bold" : "bg-washi/40 text-stone/75 hover:bg-washi/70"
      }`}
    >
      <span className="font-sans">Show festivals in shrine popup</span>
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-torii" : "bg-moss/25"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-washi transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SEASON_PRESETS: { label: string; range: MonthRange }[] = [
  { label: "Spring", range: { from: 3, to: 5 } },
  { label: "Summer", range: { from: 6, to: 8 } },
  { label: "Autumn", range: { from: 9, to: 11 } },
  { label: "Winter", range: { from: 12, to: 2 } },
];

function rangesEqual(a: MonthRange | null, b: MonthRange | null): boolean {
  if (!a || !b) return a === b;
  return a.from === b.from && a.to === b.to;
}

// Groups the two festival-related controls under one card: a season range
// picker (preset chips + a 12-month bar with two-click range selection —
// click a start month, then an end; click order sets direction, so Dec→Feb
// yields a year-wrapping winter range) and, below it, the "show in popup"
// display toggle.
function FestivalsCard({
  value,
  onChange,
  showFestivals,
  onToggleShowFestivals,
}: {
  value: MonthRange | null;
  onChange: (range: MonthRange | null) => void;
  showFestivals: boolean;
  onToggleShowFestivals: () => void;
}) {
  const [anchor, setAnchor] = useState<number | null>(null);

  // Drop a pending start month if the range is cleared elsewhere (e.g. the
  // footer's "Clear all"), so the next click begins a fresh selection.
  useEffect(() => {
    if (value === null && anchor !== null) setAnchor(null);
  }, [value, anchor]);

  function pickMonth(m: number) {
    if (anchor === null) {
      setAnchor(m);
      onChange({ from: m, to: m });
    } else {
      onChange({ from: anchor, to: m });
      setAnchor(null);
    }
  }

  function applyPreset(range: MonthRange | null) {
    setAnchor(null);
    onChange(range);
  }

  const seasonLabel =
    value && value.from === value.to ? MONTH_NAMES[value.from - 1] : value ? `${MONTH_SHORT[value.from - 1]} – ${MONTH_SHORT[value.to - 1]}` : null;

  return (
    <div className="border border-moss/15 rounded-xl overflow-hidden">
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 text-xs ${
          value ? "bg-torii/5 text-torii font-bold" : "bg-washi/60 text-stone/75"
        }`}
      >
        <span className="flex items-center gap-1.5 font-sans">
          <PartyPopper size={13} className={value ? "text-torii" : "text-moss-light"} />
          Festivals
        </span>
        {value && (
          <button
            type="button"
            onClick={() => applyPreset(null)}
            className="text-[9px] font-mono uppercase tracking-widest text-[#9d4432] hover:text-torii font-black cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="border-t border-moss/10 bg-washi/40 px-3 py-3 space-y-3">
        {/* Season sub-label */}
        <p className="flex items-center gap-1.5 text-[9px] font-mono font-black uppercase tracking-widest text-moss-light/60">
          <CalendarRange size={11} className="text-moss-light/70" />
          Season
        </p>

        {/* Season presets */}
        <div className="flex flex-wrap gap-1.5">
          {[{ label: "Any", range: null as MonthRange | null }, ...SEASON_PRESETS].map(({ label, range }) => {
            const active = rangesEqual(value, range);
            return (
              <button
                key={label}
                type="button"
                onClick={() => applyPreset(range)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide border transition-colors cursor-pointer ${
                  active
                    ? "border-torii bg-torii/10 text-torii font-bold"
                    : "border-moss/15 bg-washi/80 text-stone/65 hover:border-moss/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Month bar */}
        <div className="flex gap-0.5">
          {MONTH_INITIALS.map((initial, i) => {
            const m = i + 1;
            const selected = value ? monthInRange(m, value) : false;
            const endpoint = value ? m === value.from || m === value.to : false;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pickMonth(m)}
                title={MONTH_NAMES[i]}
                aria-label={MONTH_NAMES[i]}
                className={`flex-1 min-w-0 py-1.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  endpoint
                    ? "bg-torii text-white"
                    : selected
                      ? "bg-torii/20 text-torii"
                      : "text-stone/55 hover:bg-bamboo-light"
                }`}
              >
                {initial}
              </button>
            );
          })}
        </div>

        {/* Caption / hint */}
        <p className="text-[10px] font-sans text-stone/60 leading-snug">
          {anchor !== null ? (
            <span className="text-torii font-semibold">Now pick the end month…</span>
          ) : seasonLabel ? (
            <>
              Shrines with a festival in <span className="text-torii font-semibold">{seasonLabel}</span>.
            </>
          ) : (
            <>Tap a start month, then an end — or pick a season above.</>
          )}
        </p>
      </div>

      <div className="border-t border-moss/10">
        <ShowFestivalsRow checked={showFestivals} onToggle={onToggleShowFestivals} />
      </div>
    </div>
  );
}
