"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { getRankColor } from "@/lib/facetColors";
import { namePair } from "@/lib/names";
import type { Locale } from "@/lib/i18n";

const CHIP = "text-[8.5px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md border";

interface Props {
  rank: { name_en: string; name_ja: string | null; description: string | null };
  locale: Locale;
}

export default function RankTag({ rank, locale }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  const description = rank.description;
  const label = namePair(locale, rank).main;

  return (
    <>
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`${CHIP} ${getRankColor(rank.name_en)} cursor-default`}
      >
        {label}
      </span>

      {pos && description &&
        createPortal(
          <span
            className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: pos.x, top: pos.y - 6 }}
          >
            <span className="block whitespace-nowrap rounded-md bg-stone px-2.5 py-1.5 text-[10px] font-sans font-medium text-sand shadow-lg">
              {description}
            </span>
            <span className="block w-0 h-0 mx-auto border-x-4 border-x-transparent border-t-4 border-t-stone" />
          </span>,
          document.body,
        )
      }
    </>
  );
}
