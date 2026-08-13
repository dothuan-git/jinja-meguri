"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleSaveAction, toggleStampAction } from "@/app/users/actions";
import { useToast } from "@/components/ui/Toast";

type Kind = "save" | "stamp";

function withSlug(set: Set<string>, slug: string, present: boolean): Set<string> {
  const next = new Set(set);
  if (present) next.add(slug);
  else next.delete(slug);
  return next;
}

/**
 * Optimistic per-user collection toggles (favorites + goshuin stamps), tracked as
 * sets of shrine slugs so a single instance powers both the listing (many cards)
 * and a detail page (one shrine). Applies the change immediately, calls the
 * server action, reconciles to its authoritative MarkState, and reverts + toasts
 * on failure. Must be rendered under a ToastProvider (mounted in the root layout).
 *
 * The returned handlers are referentially stable across renders (current set
 * membership is read through refs rather than closed over), so they can be
 * passed as props to the memoized shrine rows without defeating the memo.
 */
export function useShrineMarks(initial: { saved?: string[]; stamped?: string[] } = {}) {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initial.saved ?? []));
  const [stamped, setStamped] = useState<Set<string>>(() => new Set(initial.stamped ?? []));
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const t = useTranslations("Toasts");

  const savedRef = useRef(saved);
  const stampedRef = useRef(stamped);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => {
    stampedRef.current = stamped;
  }, [stamped]);

  const run = useCallback(
    (kind: Kind, slug: string, name?: string) => {
      const setState = kind === "save" ? setSaved : setStamped;
      const current = kind === "save" ? savedRef.current : stampedRef.current;
      const next = !current.has(slug);

      // Optimistic.
      setState((prev) => withSlug(prev, slug, next));

      const action = kind === "save" ? toggleSaveAction : toggleStampAction;
      startTransition(async () => {
        const res = await action(slug, next);
        if (res.error || !res.state) {
          setState((prev) => withSlug(prev, slug, !next)); // revert
          toast.error(res.error ?? t("saveFailed"));
          return;
        }
        // Reconcile both columns to the authoritative row state.
        setSaved((prev) => withSlug(prev, slug, res.state!.saved));
        setStamped((prev) => withSlug(prev, slug, res.state!.stamped));
        if (kind === "stamp" && next) {
          toast.success(name ? t("goshuinCollectedNamed", { name }) : t("goshuinCollected"));
        }
      });
    },
    [toast, t],
  );

  const toggleSave = useCallback((slug: string, name?: string) => run("save", slug, name), [run]);
  const toggleStamp = useCallback((slug: string, name?: string) => run("stamp", slug, name), [run]);

  return useMemo(
    () => ({
      pending,
      // The raw sets are exposed as stable useMemo dependencies for callers that
      // filter by collection membership; the predicates stay for one-off reads.
      saved,
      stamped,
      isSaved: (slug: string) => saved.has(slug),
      isStamped: (slug: string) => stamped.has(slug),
      toggleSave,
      toggleStamp,
    }),
    [pending, saved, stamped, toggleSave, toggleStamp],
  );
}
