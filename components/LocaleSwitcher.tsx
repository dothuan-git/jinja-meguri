"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/i18n/actions";
import { LOCALES, type Locale } from "@/lib/i18n";

const LOCALE_LABEL: Record<Locale, string> = { en: "EN", ja: "日本語" };

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`flex items-center gap-0.5 rounded-full border border-moss/20 bg-washi/70 p-0.5 select-none ${className}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={pending}
          aria-pressed={l === locale}
          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest transition-colors cursor-pointer ${
            l === locale ? "bg-torii text-washi" : "text-moss-light hover:text-torii"
          } ${pending ? "opacity-60" : ""}`}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
