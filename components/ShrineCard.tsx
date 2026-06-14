import Link from "next/link";
import type { ShrineCard as Card } from "@/lib/types";
import Chip from "@/components/ui/Chip";
import PinHint from "@/components/ui/PinHint";

export default function ShrineCard({ card }: { card: Card }) {
  const extraCats = Math.max(0, card.categories.length - 3);
  return (
    <Link
      href={`/shrines/${card.slug}`}
      data-testid="shrine-card"
      className="group relative flex flex-col overflow-hidden rounded-md border hairline bg-washi-deep/60 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-washi-deep hover:shadow-[0_12px_30px_-18px_rgba(33,28,22,0.5)]"
    >
      {/* vermilion edge accent on hover */}
      <span className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-vermilion transition-transform duration-300 group-hover:scale-y-100" />

      {card.highest_rank && (
        <span className="kicker mb-2 inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-vermilion" />
          {card.highest_rank.name_en}
        </span>
      )}

      <h3 className="font-display text-2xl font-semibold leading-tight text-sumi">
        {card.name_en}
      </h3>
      {card.name_ja && <p className="jp mt-0.5 text-base text-sumi-soft">{card.name_ja}</p>}

      {card.primary_deity && (
        <p className="mt-3 text-sm text-sumi-soft">
          <span className="text-sumi-soft/70">Enshrines </span>
          <span className="italic text-sumi">{card.primary_deity.name_en}</span>
          {card.primary_deity.name_ja && (
            <span className="jp ml-1 text-sumi-soft">{card.primary_deity.name_ja}</span>
          )}
        </p>
      )}

      {card.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.categories.slice(0, 3).map((c) => (
            <Chip key={c.name_en} label={c.name_en} sub={c.name_ja} tone="accent" />
          ))}
          {extraCats > 0 && (
            <span className="self-center text-xs text-sumi-soft/70">+{extraCats} more</span>
          )}
        </div>
      )}

      <div className="mt-5 border-t hairline pt-3">
        <PinHint city={card.city} prefecture={card.prefecture} />
      </div>
    </Link>
  );
}
