"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type RevealVariant =
  | "fade-up"
  | "fade-up-blur"
  | "rise"
  | "slide-left"
  | "slide-right"
  | "stamp";

interface VariantConfig {
  from: gsap.TweenVars;
  duration: number;
  ease: string;
}

const VARIANTS: Record<RevealVariant, VariantConfig> = {
  "fade-up": {
    from: { opacity: 0, y: 24 },
    duration: 0.7,
    ease: "power3.out",
  },
  "fade-up-blur": {
    from: { opacity: 0, y: 24, filter: "blur(8px)" },
    duration: 0.8,
    ease: "power3.out",
  },
  "rise": {
    from: { opacity: 0, y: 36 },
    duration: 0.9,
    ease: "power2.out",
  },
  "slide-left": {
    from: { opacity: 0, x: -28 },
    duration: 0.7,
    ease: "power3.out",
  },
  "slide-right": {
    from: { opacity: 0, x: 28 },
    duration: 0.7,
    ease: "power3.out",
  },
  "stamp": {
    from: { opacity: 0, scale: 1.4 },
    duration: 0.7,
    ease: "back.out(1.8)",
  },
};

// Staggered per-section page entrance using GSAP, matching the landing page vocabulary.
// Elements tagged data-reveal="<variant>" inside the scope ref animate in DOM order
// with a 0.12s cascade. After each tween clearProps:"transform,filter" removes any
// lingering transform/filter that would create a containing block for position:fixed overlays.
export function useEntranceReveal(scopeRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = scopeRef.current;
        if (!scope) return;

        const els = Array.from(
          scope.querySelectorAll<HTMLElement>("[data-reveal]")
        );
        if (els.length === 0) return;

        const tl = gsap.timeline();

        els.forEach((el, i) => {
          const variant = (el.dataset.reveal as RevealVariant) ?? "fade-up";
          const cfg = VARIANTS[variant] ?? VARIANTS["fade-up"];

          tl.fromTo(
            el,
            cfg.from,
            {
              opacity: 1,
              y: 0,
              x: 0,
              scale: 1,
              filter: "none",
              duration: cfg.duration,
              ease: cfg.ease,
              onComplete: () => {
                // Prevent lingering transform/filter from becoming a containing block
                // for position:fixed children (calendar modal, mobile filter drawer).
                gsap.set(el, { clearProps: "transform,filter" });
              },
            },
            i === 0 ? 0 : "<+=0.12"
          );
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const scope = scopeRef.current;
        if (!scope) return;
        const els = scope.querySelectorAll<HTMLElement>("[data-reveal]");
        gsap.set(els, { opacity: 1 });
      });
    },
    { scope: scopeRef }
  );
}
