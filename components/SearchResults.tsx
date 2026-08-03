"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SearchDoc, ShrineCard as Card } from "@/lib/types";
import { makeSearcher } from "@/lib/search";
import ShrineCard from "@/components/ShrineCard";
import { useEntranceReveal } from "@/components/useEntranceReveal";

export default function SearchResults({ docs, cards }: { docs: SearchDoc[]; cards: Card[] }) {
  const t = useTranslations("Search");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = (sp.get("q") ?? "").trim();
  const [value, setValue] = useState(query);
  useEffect(() => setValue(sp.get("q") ?? ""), [sp]);

  const searcher = useMemo(() => makeSearcher(docs), [docs]);
  const cardBySlug = useMemo(() => new Map(cards.map((c) => [c.slug, c])), [cards]);
  const results = useMemo(() => (query ? searcher(query) : []), [searcher, query]);

  const submit = (v: string) => {
    const q = v.trim();
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  };

  const matched = results.map((r) => cardBySlug.get(r.slug)).filter((c): c is Card => !!c);

  const containerRef = useRef<HTMLElement>(null);
  useEntranceReveal(containerRef);

  return (
    <main ref={containerRef} className="mx-auto w-full md:w-[calc(100%-2.5rem)] max-w-7xl px-4 md:px-6 lg:px-8 pt-12 pb-16">
      <div data-reveal="fade-up">
        <p className="kicker">{t("kicker")}</p>
        <h1 className="mt-2 font-display text-5xl font-semibold">{t("title")}</h1>
      </div>

      <form
        data-reveal="fade-up"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="mt-6 flex items-center gap-3 border-b-2 border-[var(--hairline)] pb-2 focus-within:border-vermilion"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-sumi-soft" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            submit(e.target.value);
          }}
          placeholder={t("placeholder")}
          aria-label={t("searchQuery")}
          className="w-full bg-transparent text-lg placeholder:text-sumi-soft/60 focus:outline-none"
        />
      </form>

      <div data-reveal="rise" className="mt-8">
        {query === "" ? (
          <p className="text-sumi-soft">
            {t.rich("tryHint", {
              em: (chunks) => <em>{chunks}</em>,
              jp: (chunks) => <span className="jp">{chunks}</span>,
            })}
          </p>
        ) : matched.length === 0 ? (
          <p className="text-sumi-soft">
            {t.rich("noMatch", {
              query,
              q: (chunks) => <span className="text-sumi">{chunks}</span>,
            })}
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-sumi-soft">
              {t.rich("resultsFor", {
                count: matched.length,
                query,
                n: (chunks) => <span className="text-sumi">{chunks}</span>,
              })}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {matched.map((c) => (
                <ShrineCard key={c.slug} card={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
