"use client";

import { Heart, Stamp } from "lucide-react";

/**
 * Floating personal-collection filter pill on the shrine listing, shown to
 * signed-in non-admin users. Toggles the URL-synced "saved" / "collected"
 * filters owned by ShrineListing (admins get the Admin Controls pill instead).
 */
export default function UserControls({
  showSaved,
  showCollected,
  onToggleSaved,
  onToggleCollected,
}: {
  showSaved: boolean;
  showCollected: boolean;
  onToggleSaved: () => void;
  onToggleCollected: () => void;
}) {
  const base =
    "group flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer";
  const on = "border-torii bg-torii/10 text-torii";
  const off = "border-moss/30 text-moss hover:border-moss hover:bg-moss/10";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-moss select-none">
          My Collection
        </span>
        <span className="text-stone/25 font-mono select-none text-xs">|</span>
        <button onClick={onToggleSaved} aria-pressed={showSaved} className={`${base} ${showSaved ? on : off}`}>
          <Heart size={12} className={showSaved ? "fill-torii" : ""} />
          <span>Saved</span>
        </button>
        <button
          onClick={onToggleCollected}
          aria-pressed={showCollected}
          className={`${base} ${showCollected ? on : off}`}
        >
          <Stamp size={12} />
          <span>Collected</span>
        </button>
      </div>
    </div>
  );
}
