"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { namePair } from "@/lib/names";
import { getCategoryColor } from "@/lib/facetColors";
import ShrineHeart from "@/components/shrineList/ShrineHeart";
import { CHIP, staggerDelay } from "@/components/shrineList/styles";
import type { ShrineRowProps } from "@/components/shrineList/ShrineTableRow";

type Props = ShrineRowProps & {
  isExpanded: boolean;
  onToggleExpand: (slug: string) => void;
};

/** Compact row used on mobile/tablet in table mode. Memoized. */
function ShrineListRow({
  card,
  locale,
  idx,
  isSignedIn,
  saved,
  pending,
  isExpanded,
  onToggleExpand,
  onToggleSave,
}: Props) {
  const t = useTranslations("ShrineListing");
  const name = namePair(locale, card);
  return (
    <motion.div
      data-testid="shrine-list-row"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: staggerDelay(idx, 0.025) }}
      onClick={() => onToggleExpand(card.slug)}
      className="wabi-sabi-card bg-washi/85 rounded-xl p-3 cursor-pointer hover:border-torii/40 hover:bg-white transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-black text-stone text-[15px] leading-snug">{name.main}</span>
            <span
              className="text-[10.5px] text-torii font-display tracking-widest shrink-0"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {name.sub ?? ""}
            </span>
          </div>
          <div className="text-[11px] text-stone/55 font-mono tracking-wide mt-0.5">
            {card.primary_deity ? `${namePair(locale, card.primary_deity).main} · ` : ""}
            {card.city ?? ""}, {namePair(locale, card.prefecture).main}
          </div>
          {card.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.categories.map((c) => (
                <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                  {namePair(locale, c).main}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isSignedIn && (
            <ShrineHeart
              slug={card.slug}
              name={card.name_en}
              saved={saved}
              pending={pending}
              onToggle={onToggleSave}
              className="cursor-pointer disabled:cursor-wait mt-0.5"
            />
          )}
          <span aria-hidden className="mt-0.5 p-0.5 rounded-full text-stone/30">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {/* Expandable: Prayer Focus + Best Time + detail link */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-3 mt-2 border-t border-moss/10 space-y-3">
              {card.prayer_focus && (
                <div>
                  <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black mb-1">
                    {t("prayerFocus")}
                  </span>
                  <p className="text-[11.5px] text-stone/70 leading-relaxed font-sans tracking-wide">
                    {card.prayer_focus}
                  </p>
                </div>
              )}
              {card.best_time && (
                <div>
                  <span className="block text-[9px] font-mono tracking-widest text-[#5c685f]/50 uppercase font-black mb-1">
                    {t("bestTime")}
                  </span>
                  <p className="text-[11px] text-stone/65 font-sans leading-relaxed tracking-wide">{card.best_time}</p>
                </div>
              )}
              <a
                href={`/shrines/${card.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-torii px-4 py-2.5 text-[11px] font-mono font-bold uppercase tracking-widest text-washi hover:bg-torii-dark transition-colors"
              >
                {t("viewShrine")}
                <Compass size={13} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(ShrineListRow);
