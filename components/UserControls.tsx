"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Stamp, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("UserControls");
  const [expanded, setExpanded] = useState(false);

  const base =
    "group flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer";
  const on = "border-torii bg-torii/10 text-torii";
  const off = "border-moss/30 text-moss hover:border-moss hover:bg-moss/10";
  const isAnyActive = showSaved || showCollected;
  const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 md:pb-5 pointer-events-none">
      {/* Mobile: pill that expands to icon-only buttons */}
      <motion.div
        layout
        transition={spring}
        className="md:hidden pointer-events-auto inline-flex rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md shadow-lg overflow-hidden"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {expanded ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-2 px-3 py-2.5 whitespace-nowrap"
            >
              <button
                onClick={onToggleSaved}
                aria-pressed={showSaved}
                aria-label={t("savedShrines")}
                className={`flex items-center justify-center p-2 rounded-full border transition-colors cursor-pointer ${
                  showSaved
                    ? "border-torii bg-torii/10 text-torii"
                    : "border-moss/30 text-moss/70 hover:border-moss hover:bg-moss/10"
                }`}
              >
                <Heart size={13} className={showSaved ? "fill-torii" : ""} />
              </button>
              <button
                onClick={onToggleCollected}
                aria-pressed={showCollected}
                aria-label={t("collectedShrines")}
                className={`flex items-center justify-center p-2 rounded-full border transition-colors cursor-pointer ${
                  showCollected
                    ? "border-torii bg-torii/10 text-torii"
                    : "border-moss/30 text-moss/70 hover:border-moss hover:bg-moss/10"
                }`}
              >
                <Stamp size={13} />
              </button>
              <button
                onClick={() => setExpanded(false)}
                aria-label={t("collapse")}
                className="ml-0.5 p-1.5 rounded-full text-stone/35 hover:text-stone/70 transition-colors cursor-pointer"
              >
                <X size={11} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="pill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setExpanded(true)}
              aria-label={t("myCollection")}
              className="relative flex items-center px-4 py-2.5 cursor-pointer"
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-moss whitespace-nowrap">
                {t("myCollection")}
              </span>
              {isAnyActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-torii border-2 border-washi" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Desktop: always full bar with text labels */}
      <div className="hidden md:flex pointer-events-auto items-center gap-3 rounded-full border border-moss/15 bg-washi/75 backdrop-blur-md px-4 py-2.5 shadow-lg">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-moss select-none">
          {t("myCollection")}
        </span>
        <span className="text-stone/25 font-mono select-none text-xs">|</span>
        <button onClick={onToggleSaved} aria-pressed={showSaved} className={`${base} ${showSaved ? on : off}`}>
          <Heart size={12} className={showSaved ? "fill-torii" : ""} />
          <span>{t("saved")}</span>
        </button>
        <button onClick={onToggleCollected} aria-pressed={showCollected} className={`${base} ${showCollected ? on : off}`}>
          <Stamp size={12} />
          <span>{t("collected")}</span>
        </button>
      </div>
    </div>
  );
}
