"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return; // ignore garbage — locale stays as-is
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
