"use client";

import { memo } from "react";
import { motion } from "motion/react";
import type { ShrineCard } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";
import { getCategoryColor } from "@/lib/facetColors";
import RankTag from "@/components/RankTag";
import ShrineHeart from "@/components/shrineList/ShrineHeart";
import { CHIP, staggerDelay } from "@/components/shrineList/styles";

export type ShrineRowProps = {
  card: ShrineCard;
  locale: Locale;
  idx: number;
  isSignedIn: boolean;
  saved: boolean;
  pending: boolean;
  onOpen: (slug: string) => void;
  onToggleSave: (slug: string, name: string) => void;
};

/** Desktop table row (md+). Memoized so filtering re-renders only what changed. */
function ShrineTableRow({
  card,
  locale,
  idx,
  isSignedIn,
  saved,
  pending,
  onOpen,
  onToggleSave,
}: ShrineRowProps) {
  const name = namePair(locale, card);
  const deity = card.primary_deity ? namePair(locale, card.primary_deity) : null;
  return (
    <motion.tr
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: staggerDelay(idx, 0.025) }}
      onClick={() => onOpen(card.slug)}
      className="group hover:bg-white transition-colors duration-200 cursor-pointer text-stone font-medium"
    >
      {/* Column 1: Shrine Name & Location */}
      <td className="py-6 px-6 align-top">
        <div className="flex flex-col space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-display font-black text-[15px] text-stone group-hover:text-torii transition-colors leading-snug">
              {name.main}
            </div>
            {isSignedIn && (
              <ShrineHeart
                slug={card.slug}
                name={card.name_en}
                saved={saved}
                pending={pending}
                onToggle={onToggleSave}
                className="shrink-0 -mt-0.5 cursor-pointer disabled:cursor-wait"
              />
            )}
          </div>
          <div
            className="text-[11px] text-[#5c685f]/70 font-display tracking-widest block leading-none pt-0.5 group-hover:text-torii transition-colors duration-200"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {name.sub ?? ""}
          </div>
          <span className="text-[11px] text-stone/50 font-sans tracking-wide block pt-1.5">
            {card.city ?? ""}, {namePair(locale, card.prefecture).main}
          </span>
          {card.ranks.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {card.ranks.map((rank) => (
                <RankTag key={rank.name_en} rank={rank} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Column 2: Main Deity & Titles */}
      <td className="py-6 px-4 align-top">
        <div className="flex flex-col space-y-1">
          <span className="text-[13px] text-stone font-extrabold tracking-wide leading-tight">
            {deity?.main ?? ""}
          </span>
          <span
            className="text-[10.5px] text-[#8a7a5f] font-display font-semibold tracking-widest block leading-none pt-0.5"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {deity?.sub ?? ""}
          </span>
          <div className="flex flex-col gap-1 pt-2">
            {card.primary_deity_titles.map((title, tIdx) => (
              <p key={tIdx} className="text-[10.5px] text-stone/60 leading-normal font-sans font-medium">
                {title}
              </p>
            ))}
          </div>
        </div>
      </td>

      {/* Column 3: Prayer Focus */}
      <td className="py-6 px-4 align-top">
        <div className="flex flex-col space-y-3">
          <p className="text-[11.5px] text-stone/70 leading-relaxed font-sans tracking-wide">
            {card.prayer_focus ?? ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {card.categories.map((c) => (
              <span key={c.name_en} className={`${CHIP} ${getCategoryColor(c.name_en)}`}>
                {namePair(locale, c).main}
              </span>
            ))}
          </div>
        </div>
      </td>

      {/* Column 4: Best Time */}
      <td className="py-6 px-4 align-top">
        <p className="text-[11px] text-stone/65 font-sans leading-relaxed tracking-wide pt-0.5">
          {card.best_time ?? ""}
        </p>
      </td>
    </motion.tr>
  );
}

export default memo(ShrineTableRow);
