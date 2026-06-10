"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface BackgroundAmbientProps {
  mode: "landing" | "listing" | "calendar";
}

export default function BackgroundAmbient({ mode }: BackgroundAmbientProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    // Generate soft drifting particles (mist or tiny petals)
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage x
      y: Math.random() * 100, // percentage y
      delay: Math.random() * -20, // offset to start immediately
      duration: 25 + Math.random() * 20, // slow movement
      size: 4 + Math.random() * 8, // size in px
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-sand washi-paper">

      {/* 2. Soft Modern Sanctuary Gradients (Warm Shoji and Fresh Bamboo Mist) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sand via-white to-bamboo-light/60 opacity-95" />

      {/* 3. Faded Sophisticated Sun Motif (Japanese vermilion morning sun) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "min(65vw, 65vh)",
          height: "min(65vw, 65vh)",
          background: "radial-gradient(circle, #c94b32 0%, #e6806e 40%, rgba(230,128,110,0) 80%)",
          filter: "blur(24px)",
        }}
        animate={{
          x: mode === "landing" ? "50%" : "85%",
          y: mode === "landing" ? "40%" : "15%",
          scale: mode === "landing" ? 1.0 : 0.65,
          opacity: mode === "landing" ? 0.08 : 0.03,
        }}
        initial={{
          x: "50%",
          y: "40%",
          scale: 1.0,
          opacity: 0,
        }}
        transition={{
          duration: 3.5,
          ease: [0.16, 1, 0.3, 1], // Restrained cubic-bezier
        }}
      />

      {/* Second outer ring of the sun with warm energy */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "min(85vw, 85vh)",
          height: "min(85vw, 85vh)",
          background: "radial-gradient(circle, #fbdcd6 0%, rgba(251,220,214,0.02) 70%, rgba(251,220,214,0) 100%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: mode === "landing" ? "40%" : "80%",
          y: mode === "landing" ? "35%" : "10%",
          scale: mode === "landing" ? 1.0 : 0.7,
          opacity: mode === "landing" ? 0.05 : 0.02,
        }}
        initial={{
          x: "40%",
          y: "35%",
          scale: 1.0,
          opacity: 0,
        }}
        transition={{
          duration: 4.0,
          ease: [0.16, 1, 0.3, 1],
        }}
      />

      {/* 4. Subtle Hand-drawn Torii Gate Silhouette (tinted in matching vermilion) */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl flex justify-center text-torii"
        animate={{
          opacity: mode === "landing" ? 0.07 : 0.02,
          scale: mode === "landing" ? 1.0 : 0.9,
          y: mode === "landing" ? "5%" : "10%",
        }}
        initial={{
          opacity: 0,
          scale: 0.95,
          y: "10%",
        }}
        transition={{
          duration: 3.0,
          delay: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <svg
          viewBox="0 0 800 500"
          className="w-[85%] max-h-[40vh] fill-current opacity-70"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kasagi - Top curve beam */}
          <path d="M 50,70 Q 400,105 750,70 L 760,110 Q 400,150 40,110 Z" />
          {/* Shimaki - Second horizontal beam */}
          <rect x="110" y="145" width="580" height="28" rx="4" />
          {/* Nuki - Third horizontal beam that penetrates the pillars */}
          <rect x="50" y="215" width="700" height="20" />
          {/* Left Pillar (Hashira) - tapered and slightly slanted inward */}
          <path d="M 195,145 L 215,145 L 235,480 L 180,480 Z" />
          {/* Right Pillar (Hashira) */}
          <path d="M 605,145 L 585,145 L 565,480 L 620,480 Z" />
          {/* Gakuzuka - Vertical center piece between Shimaki and Nuki */}
          <rect x="388" y="145" width="24" height="90" />
          {/* Subtle ground grass silhouette */}
          <path d="M 0,480 Q 200,470 400,478 Q 600,470 800,480 L 800,500 L 0,500 Z" opacity="0.4" />
        </svg>
      </motion.div>

      {/* 5. Clean crystalline modern particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full border border-bamboo/20 bg-bamboo-light/40 backdrop-blur-[0.5px]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: ["-40px", "40px"],
              x: ["-20px", "20px"],
              opacity: [0.1, 0.35, 0.1],
              rotate: [0, 180],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Vertical Japanese Seal Stamp in top right boundary in beautiful vermilion format */}
      <motion.div
        className="absolute top-8 right-8 writing-mode-vertical select-none font-sans tracking-widest text-[10px] text-moss border-r border-t border-moss/10 p-2 uppercase"
        animate={{
          opacity: mode === "landing" ? 0.7 : 0.2,
        }}
        transition={{ duration: 1.5 }}
      >
        <span className="block font-sans text-[13px] font-bold text-torii font-serif">神</span>
        <span className="block mt-1">社</span>
        <span className="block">巡</span>
        <span className="block">り</span>
      </motion.div>
    </div>
  );
}
