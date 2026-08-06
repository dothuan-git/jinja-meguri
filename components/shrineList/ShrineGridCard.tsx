"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { namePair } from "@/lib/names";
import { getCategoryColor } from "@/lib/facetColors";
import ShrineImage from "@/components/ShrineImage";
import ShrineHeart from "@/components/shrineList/ShrineHeart";
import { CHIP, staggerDelay } from "@/components/shrineList/styles";
import type { ShrineRowProps } from "@/components/shrineList/ShrineTableRow";

type Props = ShrineRowProps & {
  isExpanded: boolean;
  onToggleExpand: (slug: string) => void;
};

/** Card-grid tile. Memoized — the heaviest of the three row renderers. */
function ShrineGridCard({
  card,
  locale,
  idx,
  isSignedIn,
  saved,
  pending,
  isExpanded,
  onOpen,
  onToggleExpand,
  onToggleSave,
}: Props) {
  const t = useTranslations("ShrineListing");
  const prefecture = namePair(locale, card.prefecture).main;
  const deity = card.primary_deity ? namePair(locale, card.primary_deity) : null;
  const hasDetails = card.primary_deity_titles.length > 0 || !!card.prayer_focus || !!card.best_time;

  return (
    <motion.div
      data-testid="shrine-card"
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: staggerDelay(idx, 0.03) }}
      onClick={() => onOpen(card.slug)}
      className="group flex flex-col wabi-sabi-card hover:border-torii/40 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:bg-white transition-all duration-300 bg-washi/85"
    >
      {/* Image header */}
      <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-sand shrink-0 border-b border-moss/10">
        <ShrineImage
          alt={card.name_en}
          shrineId={card.slug}
          prefecture={prefecture}
          nameJa={card.name_ja ?? undefined}
          compact
        />

        {isSignedIn && (
          <ShrineHeart
            slug={card.slug}
            name={card.name_en}
            saved={saved}
            pending={pending}
            onToggle={onToggleSave}
            className="absolute top-2 right-2 z-10 rounded-full bg-washi/85 backdrop-blur p-1.5 shadow-2xs transition-transform hover:scale-110 cursor-pointer disabled:cursor-wait"
          />
        )}

        {/* Traditional paper/wood placard (Ofuda badge) */}
        <div
          className="absolute bottom-3 right-3 bg-washi border border-torii/25 px-2.5 py-1.5 rounded shadow-2xs font-display text-[10px] text-torii tracking-widest font-medium leading-none select-none z-10"
          style={{ fontFamily: "'Noto Serif JP', serif" }}
        >
          {card.name_ja ?? ""}
        </div>
      </div>

      {/* Card content — essentials always visible */}
      <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3.5 flex-1">
        {/* Header: title + ranks + location */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base sm:text-lg font-display font-black text-stone group-hover:text-torii tracking-wide transition-colors leading-snug">
              {namePair(locale, card).main}
            </h4>
            {card.ranks.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1 shrink-0">
                {card.ranks.map((rank) => (
                  <span
                    key={rank.name_en}
                    className="text-[8.5px] bg-stone text-sand/90 border border-stone/15 px-2 py-0.5 rounded-md font-sans font-bold tracking-wider uppercase shadow-3xs"
                  >
                    {namePair(locale, rank).main}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-[11px] text-[#5c685f]/70 tracking-wide font-semibold mt-1 uppercase font-mono">
            {card.city ?? ""}, {prefecture}
          </div>
        </div>

        {/* Main Deity */}
        <div className="space-y-1 pt-1.5 border-t border-moss/5">
          <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">
            {t("mainDeity")}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold text-stone tracking-wide">{deity?.main ?? ""}</span>
            <span
              className="text-[10.5px] text-torii font-display font-semibold tracking-wider"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {deity?.sub ?? ""}
            </span>
          </div>
        </div>

        {/* Category chips */}
        {card.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.categories.map((c) => (
              <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                {namePair(locale, c).main}
              </span>
            ))}
          </div>
        )}

        {/* Expandable details: deity titles + prayer focus + best time */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 sm:gap-3.5">
                {card.primary_deity_titles.length > 0 && (
                  <div className="text-[10.5px] text-stone/60 leading-normal space-y-0.5 font-sans">
                    {card.primary_deity_titles.map((title, tIdx) => (
                      <div key={tIdx} className="leading-snug">
                        {title}
                      </div>
                    ))}
                  </div>
                )}
                {card.prayer_focus && (
                  <div className="space-y-1.5 pt-1.5 border-t border-moss/5">
                    <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">
                      {t("prayerFocus")}
                    </span>
                    <p className="text-stone/70 text-[11px] leading-relaxed font-sans">{card.prayer_focus}</p>
                  </div>
                )}
                {card.best_time && (
                  <div className="space-y-0.5 pt-1.5 border-t border-moss/5">
                    <span className="text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black block">
                      {t("bestTimeToVisit")}
                    </span>
                    <p className="text-[11px] text-stone/60 leading-relaxed font-sans">{card.best_time}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Show more / collapse */}
      {hasDetails && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(card.slug);
          }}
          className="flex items-center justify-center gap-1 border-t border-moss/10 py-2.5 text-[10px] font-mono tracking-widest text-[#5c685f]/50 uppercase hover:text-torii transition-colors duration-200 w-full"
        >
          {isExpanded ? t("collapse") : t("showMore")}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </motion.div>
  );
}

export default memo(ShrineGridCard);
