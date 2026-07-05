"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import type { ShrineFacetId, ShrineFilters } from "@/lib/shrineFilters";

export type FacetDropdown = { id: ShrineFacetId; label: string; options: string[] };

export default function ShrineMapFilters({
  open,
  onClose,
  filters,
  dropdowns,
  onToggleFacet,
  onClearAll,
  hasActiveFilters,
}: {
  open: boolean;
  onClose: () => void;
  filters: ShrineFilters;
  dropdowns: FacetDropdown[];
  onToggleFacet: (facet: ShrineFacetId, value: string) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [openFacet, setOpenFacet] = useState<ShrineFacetId | null>(null);
  // Per-facet option query for the searchable dropdowns; resets when a facet closes.
  const [optionQuery, setOptionQuery] = useState("");

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

            {/* Body — each facet is its own searchable dropdown */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {dropdowns.map((dropdown) => {
                const activeCount = filters[dropdown.id].length;
                const isOpen = openFacet === dropdown.id;
                const query = isOpen ? optionQuery.trim().toLowerCase() : "";
                const options = query
                  ? dropdown.options.filter((o) => o.toLowerCase().includes(query))
                  : dropdown.options;
                return (
                  <div key={dropdown.id} className="border border-moss/15 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFacet(isOpen ? null : dropdown.id);
                        setOptionQuery("");
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                        activeCount > 0 ? "bg-torii/5 text-torii font-bold" : "bg-washi/60 text-stone/75 hover:bg-washi"
                      }`}
                    >
                      <span className="font-sans">
                        {activeCount > 0 ? `${dropdown.label} (${activeCount})` : dropdown.label}
                      </span>
                      {isOpen ? (
                        <ChevronUp size={13} className="text-moss-light" />
                      ) : (
                        <ChevronDown size={13} className="text-moss-light" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden border-t border-moss/10"
                        >
                          {/* Option search */}
                          <div className="px-3 pt-3">
                            <div className="relative flex items-center bg-washi/90 border border-moss/15 rounded-lg focus-within:ring-1 focus-within:ring-torii/40 focus-within:border-torii/40 transition-all">
                              <Search className="absolute left-2.5 text-stone/40" size={12} />
                              <input
                                type="text"
                                autoFocus
                                placeholder={`Search ${dropdown.label.toLowerCase()}…`}
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
                          <div className="p-3 max-h-48 overflow-y-auto space-y-0.5">
                            {options.length === 0 ? (
                              <p className="px-1 py-2 text-[11px] font-sans italic text-stone/40">
                                No matches
                              </p>
                            ) : (
                              options.map((option) => {
                                const checked = filters[dropdown.id].includes(option);
                                return (
                                  <label
                                    key={option}
                                    className="flex items-center gap-2.5 text-xs text-stone cursor-pointer py-1.5 px-1 rounded-lg hover:bg-bamboo-light select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => onToggleFacet(dropdown.id, option)}
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
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
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
