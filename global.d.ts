import type en from "./messages/en.json";
import type { Locale } from "./lib/i18n";

// Compile-time message-key safety: wrong/missing keys fail `npm run typecheck`.
// en.json is the source of truth; ja.json must mirror its shape.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
