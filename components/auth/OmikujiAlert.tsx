"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

interface OmikujiAlertProps {
  type: "error" | "success";
  message: string;
}

export default function OmikujiAlert({ type, message }: OmikujiAlertProps) {
  const t = useTranslations("Auth");
  const isError = type === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`relative rounded-xl border px-5 py-3.5 text-sm overflow-hidden flex items-start gap-3.5 shadow-xs ${
        isError
          ? "border-torii/30 bg-torii/[0.03] text-torii-dark"
          : "border-bamboo/30 bg-bamboo-light/40 text-moss"
      }`}
    >
      {/* Decorative vertical border simulating a paper scroll/slip side */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isError ? "bg-torii" : "bg-bamboo"
        }`}
      />

      {/* Hanko-style status indicator */}
      <div
        className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-xs border-2 text-xs font-black select-none ${
          isError
            ? "border-torii text-torii rotate-[-6deg]"
            : "border-bamboo text-bamboo rotate-[6deg]"
        }`}
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        {isError ? "凶" : "吉"}
      </div>

      <div className="flex-1 space-y-1 pr-1">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
          {isError ? t("omikujiBad") : t("omikujiGood")}
        </div>
        <p className="font-sans leading-relaxed text-xs font-medium">{message}</p>
      </div>
    </motion.div>
  );
}
