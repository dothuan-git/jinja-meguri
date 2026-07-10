// Locale constants shared by server, client, and the repo layer.
// Kept in lib/ (no server-only imports) so Vitest and pure modules can use it.

export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that persists the visitor's language choice (no locale in the URL). */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
