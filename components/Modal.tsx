"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shrine detail">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => router.back()}
        className="scrim-in absolute inset-0 cursor-default bg-sumi/45 backdrop-blur-[2px]"
      />
      <div className="panel-in absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-washi shadow-[-20px_0_60px_-30px_rgba(33,28,22,0.7)]">
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.back()}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border hairline bg-washi/80 text-sumi-soft transition-colors hover:border-vermilion hover:text-vermilion-deep"
        >
          ✕
        </button>
        <div className="overflow-y-auto px-6 py-10 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
