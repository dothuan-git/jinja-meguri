"use client";

import { memo } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Favorite ("want to visit") toggle rendered on every shrine row and card.
 * `saved` is passed in as a boolean rather than read from the marks hook so a
 * toggle re-renders only the affected row.
 */
function ShrineHeart({
  slug,
  name,
  className,
  saved,
  pending,
  onToggle,
}: {
  slug: string;
  name: string;
  className: string;
  saved: boolean;
  pending: boolean;
  onToggle: (slug: string, name: string) => void;
}) {
  const tCommon = useTranslations("Common");
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(slug, name);
      }}
      disabled={pending}
      aria-pressed={saved}
      title={saved ? tCommon("removeSaved") : tCommon("saveToList")}
      className={className}
    >
      <Heart size={15} className={saved ? "fill-torii text-torii" : "text-stone/35 hover:text-torii"} />
    </button>
  );
}

export default memo(ShrineHeart);
