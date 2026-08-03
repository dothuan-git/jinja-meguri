import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import { namePair } from "@/lib/names";
import type { ShrineCard as Card } from "@/lib/types";
import Chip from "@/components/ui/Chip";
import PinHint from "@/components/ui/PinHint";

export default function ShrineCard({ card }: { card: Card }) {
  const t = useTranslations("ShrineCard");
  const locale = useLocale() as Locale;
  const shrineName = namePair(locale, card);
  const deityName = card.primary_deity ? namePair(locale, card.primary_deity) : null;
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
          {namePair(locale, card.highest_rank).main}
        </span>
      )}

      <h3 className={`font-display text-2xl font-semibold leading-tight text-sumi${shrineName.mainIsJa ? " jp" : ""}`}>
        {shrineName.main}
      </h3>
      {shrineName.sub && (
        <p className={`mt-0.5 text-base text-sumi-soft${shrineName.subIsJa ? " jp" : ""}`}>{shrineName.sub}</p>
      )}

      {deityName && (
        <p className="mt-3 text-sm text-sumi-soft">
          <span className="text-sumi-soft/70">{t("enshrines")} </span>
          <span className={deityName.mainIsJa ? "jp text-sumi" : "italic text-sumi"}>{deityName.main}</span>
          {deityName.sub && (
            <span className={`ml-1 text-sumi-soft${deityName.subIsJa ? " jp" : ""}`}>{deityName.sub}</span>
          )}
        </p>
      )}

      {card.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.categories.slice(0, 3).map((c) => {
            const n = namePair(locale, c);
            return <Chip key={c.name_en} label={n.main} sub={n.sub} subIsJa={n.subIsJa} tone="accent" />;
          })}
          {extraCats > 0 && (
            <span className="self-center text-xs text-sumi-soft/70">{t("more", { count: extraCats })}</span>
          )}
        </div>
      )}

      <div className="mt-5 border-t hairline pt-3">
        <PinHint city={card.city} prefecture={card.prefecture} />
      </div>
    </Link>
  );
}
