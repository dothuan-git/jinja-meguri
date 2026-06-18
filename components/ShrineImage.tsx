"use client";

import { CSSProperties } from "react";

interface ShrineImageProps {
  src?: string;
  alt: string;
  className?: string; // Kept for compatibility with other components
  shrineId?: string;
  prefecture?: string;
  nameJa?: string; // Japanese name; its first character is used as the watermark kanji
  compact?: boolean; // Smaller kanji watermark for the listing card's short image header
}

interface PlaceholderConfig {
  pha: string; // Gradient start color
  phb: string; // Gradient end color
  mark: string; // Single kanji watermark
  pref: string; // Default prefecture / location tag
}

// Custom Japanese Shinto traditional palettes matched to each shrine's character
const PLACEHOLDER_MAP: Record<string, PlaceholderConfig> = {
  "ise-jingu": {
    pha: "#bcc3bb",
    phb: "#8c9a88",
    mark: "伊",
    pref: "Mie"
  },
  "fushimi-inari": {
    pha: "#d4897a",
    phb: "#b8533a",
    mark: "稲",
    pref: "Kyoto"
  },
  "itsukushima": {
    pha: "#87aab8",
    phb: "#4e7f90",
    mark: "厳",
    pref: "Hiroshima"
  },
  "meiji-jingu": {
    pha: "#b4bfb7",
    phb: "#7f9083",
    mark: "明",
    pref: "Tokyo"
  },
  "izumo-taisha": {
    pha: "#9ea8b8",
    phb: "#6a7a90",
    mark: "出",
    pref: "Shimane"
  },
  "yasaka-jinja": {
    pha: "#dcb480",
    phb: "#ad8652",
    mark: "八",
    pref: "Kyoto"
  },
  "tsurugaoka": {
    pha: "#cba29e",
    phb: "#936863",
    mark: "鶴",
    pref: "Kanagawa"
  },
  "kanda-myojin": {
    pha: "#cab87a",
    phb: "#9a8444",
    mark: "神",
    pref: "Tokyo"
  }
};

/**
 * ShrineImage Component.
 * Implements a premium, hand-carved CSS-based image placeholder system.
 * Layering:
 *  ① Tactile diagonal stripe pattern superimposed on a custom-designed gradient.
 *  ② Extremely faint traditional Japanese woodcut watermark kanji.
 *  ③ Sacred Torii Gate arch in structural vermilion.
 *  ④ Frosted washi-paper prefecture location tag in upper boundary.
 */
export default function ShrineImage({ src, alt, className = "", shrineId, prefecture, nameJa, compact = false }: ShrineImageProps) {
  // Extract custom configuration from shrineId, or match by alt keywords, or use default
  let config: PlaceholderConfig = {
    pha: "#bcc3bb",
    phb: "#8c9a88",
    mark: "社",
    pref: prefecture || "Japan"
  };

  const lookupKey = shrineId || alt.toLowerCase().replace(/[\s-]/g, "");
  
  if (shrineId && PLACEHOLDER_MAP[shrineId]) {
    config = PLACEHOLDER_MAP[shrineId];
  } else {
    // Try fuzzy match on alt text block
    const matchedId = Object.keys(PLACEHOLDER_MAP).find(
      key => alt.toLowerCase().includes(key.replace("-", "")) || lookupKey.includes(key.replace("-", ""))
    );
    if (matchedId) {
      config = PLACEHOLDER_MAP[matchedId];
    }
  }

  // Double check that we prioritize the passed prefecture if available to stay aligned with the data
  const finalPref = prefecture || config.pref;

  // Watermark kanji: first character of the Japanese name, falling back to the per-shrine mark
  const mark = nameJa?.trim().charAt(0) || config.mark;

  return (
    <div 
      className="shrine-img relative overflow-hidden w-full h-full bg-[#ece4d4] select-none rounded-xl isolate flex items-center justify-center border border-moss/5"
      style={{
        "--ph-a": config.pha,
        "--ph-b": config.phb
      } as CSSProperties}
    >
      {/* Dynamic gradient fill + tactile diagonal stripe texture overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0px, rgba(255, 255, 255, 0.04) 2px, transparent 2px, transparent 11px), linear-gradient(160deg, var(--ph-a), var(--ph-b))"
        }}
      />

      {/* Large scale ghosted Kanji Watermark (Woodcut stamp emulation) */}
      <div className="absolute inset-0 flex items-center justify-center z-1 overflow-hidden pointer-events-none">
        <span 
          className="kanji-mark font-serif font-black text-center select-none pointer-events-none tracking-widest text-[#1a201c]/10"
          style={{ 
            fontFamily: "'Noto Serif JP', serif",
            fontSize: compact ? "clamp(64px, 11vw, 104px)" : "clamp(100px, 16vw, 150px)",
            ...(compact && { lineHeight: 1 })
          }}
        >
          {mark}
        </span>
      </div>

      {/* Traditional Shinto Vermilion Torii Gate Arch (Crisp vector drawing) */}
      <svg 
        className="absolute left-1/2 bottom-3 -translate-x-1/2 opacity-70 z-10 text-torii" 
        width="38" 
        height="32" 
        viewBox="0 0 40 34" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.6"
      >
        {/* Top rail (kasagi) + inner rail (nuki) */}
        <path d="M3 8h34M6 13h28" strokeLinecap="round" />
        {/* Two vertical posts */}
        <path d="M11 13v18M29 13v18" strokeLinecap="round" />
        {/* Curved lintel (shimagi) */}
        <path d="M2 8c4-7 32-7 36 0" strokeLinecap="round" />
        {/* Post finials (kasagi caps) */}
        <path d="M8 8V5M32 8V5" strokeLinecap="round" />
      </svg>

      {/* Frosted Washi prefecture location chip */}
      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-washi/70 hover:bg-washi/85 transition-all duration-300 border border-[#1a201c]/5 backdrop-blur-[2.5px] font-serif text-[10px] tracking-[0.16em] uppercase text-stone/50 leading-normal font-semibold select-none z-10">
        {finalPref}
      </span>
    </div>
  );
}
