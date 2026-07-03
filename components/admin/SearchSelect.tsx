"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export interface SearchSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Type-to-filter combobox over a small in-memory option list (shrines, festivals).
 * Controlled like a native <select> (`value`/`onChange`), but with a text query
 * that substring-filters `label`/`sublabel` while open. No dependency — just a
 * positioned popover + outside-click/Escape handling.
 */
export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Search…",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
      )
    : options;

  const inputBase =
    "w-full rounded-sm border border-dashed border-torii/30 bg-torii/[0.04] px-2 py-1.5 text-xs font-mono text-stone/80 outline-none placeholder:text-stone/30 focus:border-torii transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative flex items-center">
        <Search size={11} className="absolute left-2 text-stone/35 pointer-events-none" />
        <input
          type="text"
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={selected ? selected.label : placeholder}
          disabled={disabled}
          className={`${inputBase} pl-6 pr-6`}
        />
        {selected && !open ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange("")}
            disabled={disabled}
            className="absolute right-1.5 text-stone/35 hover:text-torii transition-colors p-0.5 disabled:opacity-50"
          >
            <X size={11} />
          </button>
        ) : (
          <ChevronDown size={11} className="absolute right-2 text-stone/35 pointer-events-none" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto rounded-sm border border-torii/25 bg-washi shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] font-mono text-stone/40 select-none">
              No matches
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`block w-full text-left px-2.5 py-1.5 text-xs font-sans hover:bg-torii/[0.06] transition-colors ${
                  o.value === value ? "bg-torii/[0.05] text-torii-dark font-bold" : "text-stone/85"
                }`}
              >
                <span className="block truncate">{o.label}</span>
                {o.sublabel && (
                  <span className="block truncate text-[10px] text-stone/45 font-mono">{o.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
