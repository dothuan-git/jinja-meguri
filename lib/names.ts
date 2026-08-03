import type { Locale } from "@/lib/i18n";

export interface NameParts {
  name_en: string;
  name_ja?: string | null;
  name_hiragana?: string | null;
}

export interface NamePair {
  main: string;
  sub: string | null;
  // Whether each half is Japanese script — drives the `jp` font/styling class.
  mainIsJa: boolean;
  subIsJa: boolean;
}

/**
 * Locale-aware display order for a name pair.
 *   EN: main = name_en,            sub = name_ja (kanji)
 *   JA: main = name_ja ?? name_en, sub = name_hiragana ?? name_en
 * The sub is dropped when missing or when it would duplicate the main
 * (e.g. JA mode with no kanji: main already shows name_en).
 */
export function namePair(locale: Locale, n: NameParts): NamePair {
  if (locale === "ja") {
    const main = n.name_ja || n.name_en;
    const sub = n.name_hiragana || n.name_en;
    return {
      main,
      sub: sub && sub !== main ? sub : null,
      mainIsJa: Boolean(n.name_ja),
      subIsJa: Boolean(n.name_hiragana && sub !== n.name_en),
    };
  }
  return {
    main: n.name_en,
    sub: n.name_ja || null,
    mainIsJa: false,
    subIsJa: Boolean(n.name_ja),
  };
}
