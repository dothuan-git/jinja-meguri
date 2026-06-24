"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <motion.footer
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full py-8 pb-28 md:pb-12 px-6 flex flex-col items-center text-center gap-2 select-none"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="w-6 h-[1px] bg-torii/20 mb-1 origin-center"
      />
      <div className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-stone/40">
        Jinja Meguri — 神社巡り
      </div>
      <p className="max-w-lg text-[10px] font-display italic text-stone/40 leading-relaxed">
        AI-assisted research project. Information may contain inaccuracies; verify with official sanctuary channels before visiting.
      </p>
      <div className="text-[9px] font-mono tracking-tight text-stone/30">
        &copy; {new Date().getFullYear()} — Dedicated to the preservation of sacred lore.
      </div>
    </motion.footer>
  );
}
