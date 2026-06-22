"use client";

import { useCallback, useState, useTransition } from "react";
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
 */
export function useShrineMarks(initial: { saved?: string[]; stamped?: string[] } = {}) {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initial.saved ?? []));
  const [stamped, setStamped] = useState<Set<string>>(() => new Set(initial.stamped ?? []));
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = useCallback(
    (kind: Kind, slug: string, name?: string) => {
      const setState = kind === "save" ? setSaved : setStamped;
      const current = kind === "save" ? saved : stamped;
      const next = !current.has(slug);

      // Optimistic.
      setState((prev) => withSlug(prev, slug, next));

      const action = kind === "save" ? toggleSaveAction : toggleStampAction;
      startTransition(async () => {
        const res = await action(slug, next);
        if (res.error || !res.state) {
          setState((prev) => withSlug(prev, slug, !next)); // revert
          toast.error(res.error ?? "Couldn't save your change. Please try again.");
          return;
        }
        // Reconcile both columns to the authoritative row state.
        setSaved((prev) => withSlug(prev, slug, res.state!.saved));
        setStamped((prev) => withSlug(prev, slug, res.state!.stamped));
        if (kind === "stamp" && next) {
          toast.success(name ? `Goshuin collected — ${name}.` : "Goshuin collected.");
        }
      });
    },
    [saved, stamped, toast],
  );

  return {
    pending,
    isSaved: (slug: string) => saved.has(slug),
    isStamped: (slug: string) => stamped.has(slug),
    toggleSave: (slug: string, name?: string) => run("save", slug, name),
    toggleStamp: (slug: string, name?: string) => run("stamp", slug, name),
  };
}
