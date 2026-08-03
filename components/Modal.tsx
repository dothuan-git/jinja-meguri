"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations("Common");
  const close = () => router.back();

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-stone/70 backdrop-blur-xs cursor-pointer z-40"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 230 }}
          className="relative w-full md:w-[50vw] h-full bg-washi md:border-l border-moss/10 shadow-2xl flex flex-col z-50 overflow-hidden washi-paper sumi-shadow"
        >
          <div className="shrink-0 px-6 py-4 border-b border-moss/10 flex items-center justify-between bg-washi select-none">
            <div className="font-display text-xs font-bold uppercase tracking-widest text-moss/50">
              {t("quickPreview")}
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-full hover:bg-torii hover:text-white border border-moss/10 text-stone transition-all duration-300 cursor-pointer hover:-rotate-90"
              title={t("dismiss")}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
