"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Music, Flower, Sun, Leaf, Snowflake } from "lucide-react";
import { motion } from "motion/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { shintoSynth } from "@/lib/audioSynthesizer";

const MotionLink = motion.create(Link);

type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_GRADIENTS: Record<Season, string> = {
  spring: "radial-gradient(ellipse at 50% 50%, #fff2f5 0%, #faf6f0 100%)",
  summer: "radial-gradient(ellipse at 50% 50%, #111a33 0%, #070b18 100%)",
  autumn: "radial-gradient(ellipse at 50% 50%, #fff7e6 0%, #faf3e0 100%)",
  winter: "radial-gradient(ellipse at 50% 50%, #0d1b2a 0%, #050a12 100%)",
};

// Solid base colours (gradient edge values) — fills any 1-px compositing gap
// so the body's bg-sand never bleeds through during GPU layer transitions.
const SEASON_BG_BASE: Record<Season, string> = {
  spring: "#faf6f0",
  summer: "#070b18",
  autumn: "#faf3e0",
  winter: "#050a12",
};

export default function LandingPageClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSeason, setCurrentSeason] = useState<Season>(() => {
    const month = new Date().getMonth() + 1; // 1–12
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  });
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [showAudioTip, setShowAudioTip] = useState<boolean>(true);

  // Synchronise sound synthesizer with react states
  const handleSeasonChange = (season: Season) => {
    setCurrentSeason(season);
    shintoSynth.setSeason(season);
    
    // Animate transition of active tags smoothly
    gsap.fromTo(".season-badge-glow", 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" }
    );
  };

  const handleAudioToggle = () => {
    const playState = shintoSynth.toggle();
    setIsAudioPlaying(playState);
    setShowAudioTip(false);
  };

  // Run the beautiful, snappy, responsive GSAP entry sequence
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Initial silent atmosphere build
    tl.fromTo(".bg-sun", { opacity: 0, scale: 0.8 }, { opacity: 0.22, scale: 1, duration: 2.5, ease: "power2.out" })
      .fromTo(".char-1", { opacity: 0, y: -45, rotate: -8 }, { opacity: 0.025, y: 0, rotate: 0, duration: 1.8, ease: "power2.out" }, 0.1)
      .fromTo(".char-2", { opacity: 0, y: -45, rotate: 6 }, { opacity: 0.025, y: 0, rotate: 0, duration: 1.8, ease: "power2.out" }, 0.3)
      .fromTo(".char-3", { opacity: 0, y: -45, rotate: -5 }, { opacity: 0.025, y: 0, rotate: 0, duration: 1.8, ease: "power2.out" }, 0.5)
      .fromTo(".char-4", { opacity: 0, y: -45, rotate: 8 }, { opacity: 0.025, y: 0, rotate: 0, duration: 1.8, ease: "power2.out" }, 0.7)
      
      // Right-to-Left slide stream of main elements
      .fromTo(".tategaki-title", { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, 0.6)
      .fromTo(".hanko-stamps", { opacity: 0, scale: 1.5 }, { opacity: 0.95, scale: 1, duration: 0.8, ease: "back.out(2)" }, 1.0)
      .fromTo(".hanko-blessing", { opacity: 0, scale: 1.5, rotate: -10 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "back.out(1.8)" }, 1.15)
      
      // Prose columns fading right to left
      .fromTo(".prose-col-1", { opacity: 0, y: 20 }, { opacity: 0.8, y: 0, duration: 1.2 }, 1.2)
      .fromTo(".prose-col-2", { opacity: 0, y: 20 }, { opacity: 0.8, y: 0, duration: 1.2 }, 1.4)
      .fromTo(".prose-col-3", { opacity: 0, y: 20 }, { opacity: 0.8, y: 0, duration: 1.2 }, 1.6)
      .fromTo(".divider-line", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 1.2, ease: "power2.out" }, 1.7)
      .fromTo(".prose-col-eng", { opacity: 0, x: -15 }, { opacity: 0.6, x: 0, duration: 1.5 }, 1.9)
      
      // Swing Entrance for the Wooden Hanging Plaques (Ofuda)
      .fromTo(".talisman-btn-1", 
        { opacity: 0, y: -40, rotate: -15 }, 
        { opacity: 1, y: 0, rotate: 0, duration: 1.8, ease: "elastic.out(0.8, 0.45)" }, 
        2.0
      )
      .fromTo(".talisman-btn-2", 
        { opacity: 0, y: -40, rotate: 15 }, 
        { opacity: 1, y: 0, rotate: 0, duration: 1.8, ease: "elastic.out(0.8, 0.45)" }, 
        2.2
      )
      
      // Ambient guides and credits
      .fromTo(".header-guide", { opacity: 0, y: -10 }, { opacity: 0.5, y: 0, duration: 1 }, 2.5)
      .fromTo(".footer-guide", { opacity: 0, y: 10 }, { opacity: 0.5, y: 0, duration: 1 }, 2.5);

    // Continuous celestial breathing for the Hinomaru solar shadow
    gsap.to(".bg-sun", {
      scale: 1.05,
      opacity: 0.32,
      duration: 10,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

  }, { scope: containerRef });

  // Floating seasonal particle physics engine inside HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    // Dynamic state mapping depending on selected seasonal criteria
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
      wiggle: number;
      wiggleSpeed: number;
      color: string;
    }

    const particles: Particle[] = [];
    const maxParticles = 35;

    const createParticle = (initRandomY: boolean): Particle => {
      let speedY = 0.4 + Math.random() * 0.9;
      let speedX = (Math.random() - 0.5) * 0.8;
      let size = 2 + Math.random() * 6;
      let opacity = 0.2 + Math.random() * 0.6;
      
      // Tailor speed & layout according to seasons
      if (currentSeason === "winter") {
        speedY = 0.8 + Math.random() * 1.5; // Snow falls faster
        size = 1.5 + Math.random() * 4.5;
        opacity = 0.4 + Math.random() * 0.5;
      } else if (currentSeason === "summer") {
        speedY = (Math.random() - 0.5) * 0.4; // Fireflies drift up & down
        speedX = (Math.random() - 0.5) * 0.8;
        size = 2 + Math.random() * 4;
      } else if (currentSeason === "spring") {
        speedX = 0.4 + Math.random() * 0.85; // Sakura drift horizontally too
        speedY = 0.6 + Math.random() * 0.9;
      }

      return {
        x: Math.random() * width,
        y: initRandomY ? Math.random() * height : -10,
        size,
        speedY,
        speedX,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        opacity,
        wiggle: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.01 + Math.random() * 0.02,
        color: "", // Dynamically evaluated during draw
      };
    };

    // Prepopulate
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(true));
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Physics update
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.wiggle) * 0.25;
        p.wiggle += p.wiggleSpeed;
        p.rotation += p.rotationSpeed;

        // Reset boundaries
        if (p.y > height + 15 || p.y < -15 || p.x > width + 15 || p.x < -15) {
          particles[i] = createParticle(false);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (currentSeason === "spring") {
          // Delicate pink cherry blossom/sakura petal
          ctx.fillStyle = `rgba(255, 192, 203, ${p.opacity * 0.85})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.4, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Subtle vein line
          ctx.strokeStyle = `rgba(255, 140, 165, ${p.opacity * 0.35})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(-p.size * 1.4, 0);
          ctx.lineTo(p.size * 1.4, 0);
          ctx.stroke();
        } 
        else if (currentSeason === "summer") {
          // Sharp luminous fireflies (distinct inner core + hotaru green-yellow outer glow)
          // 1. Soft atmospheric outer glow
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 4.5);
          grad.addColorStop(0, `rgba(185, 251, 30, ${p.opacity * 0.7})`);
          grad.addColorStop(0.4, `rgba(185, 251, 30, ${p.opacity * 0.25})`);
          grad.addColorStop(1, "rgba(185, 251, 30, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 4.5, 0, Math.PI * 2);
          ctx.fill();

          // 2. High-contrast intense sharp core
          ctx.fillStyle = `rgba(255, 254, 210, ${p.opacity * 0.95})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.85, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (currentSeason === "autumn") {
          // Maple (Momiji) warm hand-drawn star shape
          ctx.fillStyle = p.size > 5 
            ? `rgba(215, 85, 45, ${p.opacity * 0.9})` // deep red momiji
            : `rgba(235, 145, 30, ${p.opacity * 0.9})`; // orange maple
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4);
          ctx.lineTo(p.size * 0.8, -p.size * 0.3);
          ctx.lineTo(p.size * 1.5, -p.size * 0.7);
          ctx.lineTo(p.size * 0.8, 0.1);
          ctx.lineTo(p.size * 1.3, p.size * 0.8);
          ctx.lineTo(0, p.size * 0.3);
          ctx.lineTo(-p.size * 1.3, p.size * 0.8);
          ctx.lineTo(-p.size * 0.8, 0.1);
          ctx.lineTo(-p.size * 1.5, -p.size * 0.7);
          ctx.lineTo(-p.size * 0.8, -p.size * 0.3);
          ctx.closePath();
          ctx.fill();
        } 
        else if (currentSeason === "winter") {
          // Pure soft powdery snow
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          grad.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrame);
    };
  }, [currentSeason]);

  // Specific themes styling parameters for premium Shinto transitions
  const seasonStyles = {
    spring: {
      bgGradient: "radial-gradient(ellipse at 50% 50%, #fff2f5 0%, #faf6f0 100%)",
      accentText: "text-[#d17088]",
      accentBorder: "border-[#eec2cb]/60",
      sunBg: "bg-[#d17088]/30 shadow-[0_0_150px_rgba(209,112,136,0.35)]",
      isDaytime: true,
      moonGlow: "",
      moonColor: "",
      moonType: "",
      tagLabel: "春和景明 • VERBANT SPRING WIND CHIMES",
      textMain: "text-[#3c2a2f]",
      titleText: "text-[#5e192c] drop-shadow-[0_2px_8px_rgba(230,120,140,0.1)]",
      proseText: "text-[#4a353b]/90",
      engText: "text-[#6e535a]",
      iconBtn: "border-[#ebd3d8] bg-[#fcf8f2]/90 text-[#b57a87] hover:bg-[#fff9fa] hover:border-[#d17088] hover:text-[#d17088] " + (isAudioPlaying ? "text-[#d17088] border-[#d17088] bg-[#fff9fa] animate-pulse" : ""),
      tabBg: "border-[#ebd3d8] bg-[#fcf8f2]/70 backdrop-blur-xs",
      audioTip: "bg-[#fffbfb] border-[#ebd3d8] text-[#d17088]",
      dividerBg: "bg-[#ebd3d8]",
      charColor: "text-[#d17088]",
      charOpacity: "opacity-[0.06]",
      upperGuide: "text-[#b57a87]",
      talisman1: "bg-[#fcf8f2] hover:bg-[#fff9fa] text-[#4a353b] border-[#e7dfcf] hover:border-[#d17088]",
      talisman2: "bg-[#fcf8f2] hover:bg-[#fff9fa] text-[#4a353b] border-[#e7dfcf] hover:border-[#527d41]",
      talismanIcon1: "border-[#ebd3d8] bg-[#fff9fa] text-[#d17088] group-hover:bg-[#d17088] group-hover:text-white group-hover:border-[#d17088]",
      talismanIcon2: "border-[#ebd3d8] bg-[#fffdf5] text-[#527d41] group-hover:bg-[#527d41] group-hover:text-white group-hover:border-[#527d41]",
      talismanString: "bg-[#4a353b]/25",
      talismanFooterText: "text-[#b57a87]/40",
      hankoBg: "bg-white/95",
      activeTabBtn: "bg-[#d17088] text-white scale-110 font-bold shadow-md",
      inactiveTabBtn: "text-[#b57a87]/60 hover:text-[#3c2a2f] hover:bg-[#ebd3d8]/30"
    },
    summer: {
      bgGradient: "radial-gradient(ellipse at 50% 50%, #111a33 0%, #070b18 100%)",
      accentText: "text-[#ffda73]",
      accentBorder: "border-[#2b4275]",
      sunBg: "bg-[#ffd666]/15 shadow-[0_0_150px_rgba(255,214,102,0.2)]",
      isDaytime: false,
      moonGlow: "bg-[#ffda73]/25 shadow-[0_0_100px_rgba(255,214,102,0.3)]",
      moonColor: "text-[#ffda73]/65",
      moonType: "crescent",
      tagLabel: "螢火瑠璃 • TWILIGHT BLUE HOUR HOTARU SILENCE",
      textMain: "text-[#edf2f7]",
      titleText: "text-[#ffebad] drop-shadow-[0_2px_10px_rgba(255,235,173,0.15)]",
      proseText: "text-[#e2e8f0]/95",
      engText: "text-[#b4c3d6]",
      iconBtn: "border-[#2c406b] bg-[#121c3b]/55 text-[#8ca3cf] hover:bg-[#1a2d5e] hover:border-[#ffda73] hover:text-[#ffda73] " + (isAudioPlaying ? "text-[#ffda73] border-[#ffda73] bg-[#1a2d5e]/95 animate-pulse" : ""),
      tabBg: "border-[#2c406b] bg-[#121c3b]/70 backdrop-blur-xs",
      audioTip: "bg-[#162244]/95 border-[#2c406b] text-[#ffda73]",
      dividerBg: "bg-[#2b4275]",
      charColor: "text-[#ffda73]",
      charOpacity: "opacity-[0.04]",
      upperGuide: "text-[#8ca3cf]",
      talisman1: "bg-[#131d3a] hover:bg-[#1a274c] text-[#e2e8f0]/95 border-[#223363] hover:border-[#ffda73]",
      talisman2: "bg-[#131d3a] hover:bg-[#1a274c] text-[#e2e8f0]/95 border-[#223363] hover:border-[#ffda73]",
      talismanIcon1: "border-[#2b4275] bg-[#1a2d5e] text-[#ffda73] group-hover:bg-[#ffda73] group-hover:text-[#0b1124] group-hover:border-[#ffda73]",
      talismanIcon2: "border-[#2b4275] bg-[#1a2d5e] text-[#ffda73] group-hover:bg-[#ffda73] group-hover:text-[#0b1124] group-hover:border-[#ffda73]",
      talismanString: "bg-[#ffda73]/30",
      talismanFooterText: "text-[#8ca3cf]/40",
      hankoBg: "bg-white/95",
      activeTabBtn: "bg-[#ffda73] text-[#070b18] scale-110 shadow-md font-bold",
      inactiveTabBtn: "text-[#8ca3cf]/60 hover:text-[#edf2f7] hover:bg-[#1a2d5e]/30"
    },
    autumn: {
      bgGradient: "radial-gradient(ellipse at 50% 50%, #fff7e6 0%, #faf3e0 100%)",
      accentText: "text-[#b45309]",
      accentBorder: "border-[#f5d0a9]/60",
      sunBg: "bg-[#b45309]/30 shadow-[0_0_150px_rgba(180,83,9,0.35)]",
      isDaytime: true,
      moonGlow: "",
      moonColor: "",
      moonType: "",
      tagLabel: "秋風雁啼 • GOLDEN DAYTIME MOMIJI WINDS",
      textMain: "text-[#451a03]",
      titleText: "text-[#78350f] drop-shadow-[0_2px_8px_rgba(217,119,6,0.15)]",
      proseText: "text-[#7c2d12]/90",
      engText: "text-[#9a3412]",
      iconBtn: "border-[#f5d0a9] bg-[#fcf8f2]/90 text-[#b45309] hover:bg-[#fffdfa] hover:border-[#b45309] hover:text-[#b45309] " + (isAudioPlaying ? "text-[#b45309] border-[#b45309] bg-[#fffdfa] animate-pulse" : ""),
      tabBg: "border-[#f5d0a9] bg-[#fcf8f2]/70 backdrop-blur-xs",
      audioTip: "bg-[#fffdf9] border-[#f5d0a9] text-[#b45309]",
      dividerBg: "bg-[#f5d0a9]",
      charColor: "text-[#d97706]",
      charOpacity: "opacity-[0.065]",
      upperGuide: "text-[#9a3412]",
      talisman1: "bg-[#fcf8f2] hover:bg-[#fffdfa] text-[#451a03] border-[#f5d0a9] hover:border-[#b45309]",
      talisman2: "bg-[#fcf8f2] hover:bg-[#fffdfa] text-[#451a03] border-[#f5d0a9] hover:border-[#527d41]",
      talismanIcon1: "border-[#f5d0a9] bg-[#fffdfa] text-[#b45309] group-hover:bg-[#b45309] group-hover:text-white group-hover:border-[#b45309]",
      talismanIcon2: "border-[#ebd3d8] bg-[#fffdf5] text-[#527d41] group-hover:bg-[#527d41] group-hover:text-white group-hover:border-[#527d41]",
      talismanString: "bg-[#451a03]/25",
      talismanFooterText: "text-[#b45309]/40",
      hankoBg: "bg-white/95",
      activeTabBtn: "bg-[#b45309] text-white scale-110 font-bold shadow-md",
      inactiveTabBtn: "text-[#b45309]/60 hover:text-[#451a03] hover:bg-[#f5d0a9]/30"
    },
    winter: {
      bgGradient: "radial-gradient(ellipse at 50% 50%, #0d1b2a 0%, #050a12 100%)",
      accentText: "text-[#90e0ef]",
      accentBorder: "border-[#1e293b]",
      sunBg: "bg-[#90e0ef]/15 shadow-[0_0_150px_rgba(144,224,239,0.2)]",
      isDaytime: false,
      moonGlow: "bg-[#90e0ef]/25 shadow-[0_0_100px_rgba(144,224,239,0.3)]",
      moonColor: "text-[#90e0ef]/65",
      moonType: "full",
      tagLabel: "冬雪寂然 • SILENT SACRED FROZEN PEAK",
      textMain: "text-[#e2eafc]",
      titleText: "text-[#90e0ef] drop-shadow-[0_2px_10px_rgba(144,224,239,0.25)]",
      proseText: "text-[#c5d3e8]/95",
      engText: "text-[#a5b4fc]",
      iconBtn: "border-[#1e293b] bg-[#0b132b]/55 text-[#8da9c4] hover:bg-[#1c2541] hover:border-[#90e0ef] hover:text-[#90e0ef] " + (isAudioPlaying ? "text-[#90e0ef] border-[#90e0ef] bg-[#1c2541] animate-pulse" : ""),
      tabBg: "border-[#1e293b] bg-[#0b132b]/70 backdrop-blur-xs",
      audioTip: "bg-[#111c34]/95 border-[#212f45] text-[#90e0ef]",
      dividerBg: "bg-[#1e293b]",
      charColor: "text-[#90e0ef]",
      charOpacity: "opacity-[0.035]",
      upperGuide: "text-[#8da9c4]",
      talisman1: "bg-[#0b132b] hover:bg-[#1c2541] text-[#e2eafc]/95 border-[#1e293b] hover:border-[#90e0ef]",
      talisman2: "bg-[#0b132b] hover:bg-[#1c2541] text-[#e2eafc]/95 border-[#1e293b] hover:border-[#90e0ef]",
      talismanIcon1: "border-[#1e293b] bg-[#1c2541] text-[#90e0ef] group-hover:bg-[#90e0ef] group-hover:text-[#050a12] group-hover:border-[#90e0ef]",
      talismanIcon2: "border-[#1e293b] bg-[#1c2541] text-[#90e0ef] group-hover:bg-[#90e0ef] group-hover:text-[#050a12] group-hover:border-[#90e0ef]",
      talismanString: "bg-[#90e0ef]/30",
      talismanFooterText: "text-[#8da9c4]/40",
      hankoBg: "bg-white/95",
      activeTabBtn: "bg-[#90e0ef] text-[#050a12] scale-110 shadow-md font-bold",
      inactiveTabBtn: "text-[#8da9c4]/60 hover:text-[#e2eafc] hover:bg-[#1c2541]/30"
    }
  }[currentSeason];

  const emaSeasonStyles = {
    spring: {
      bg: "fill-[#fcf8f2] group-hover:fill-[#fff9fa]",
      stroke: "stroke-[#eec2cb]/70 group-hover:stroke-[#d17088]",
      innerStroke: "stroke-[#d17088]/20 group-hover:stroke-[#d17088]/45",
      text: "text-[#4a353b]",
      iconBg: "border-[#eec2cb] bg-[#fff9fa] text-[#d17088] group-hover:bg-[#d17088] group-hover:text-white",
      hole: "fill-[#4a353b]/10 stroke-[#4a353b]/20",
      string: "bg-[#d17088]/70 group-hover:bg-[#d17088]",
      roof: "fill-[#d17088]/20 group-hover:fill-[#d17088]/80",
      bgIconColor: "text-[#d17088]"
    },
    summer: {
      bg: "fill-[#131d3a] group-hover:fill-[#1a274c]",
      stroke: "stroke-[#223363] group-hover:stroke-[#ffda73]",
      innerStroke: "stroke-[#ffda73]/15 group-hover:stroke-[#ffda73]/40",
      text: "text-[#edf2f7]",
      iconBg: "border-[#2b4275] bg-[#1a2d5e] text-[#ffda73] group-hover:bg-[#ffda73] group-hover:text-[#0b1124]",
      hole: "fill-[#edf2f7]/10 stroke-[#edf2f7]/20",
      string: "bg-[#ffda73]/70 group-hover:bg-[#ffda73]",
      roof: "fill-[#ffda73]/20 group-hover:fill-[#ffda73]/80",
      bgIconColor: "text-[#ffda73]"
    },
    autumn: {
      bg: "fill-[#fcf8f2] group-hover:fill-[#fffdfa]",
      stroke: "stroke-[#f5d0a9]/70 group-hover:stroke-[#b45309]",
      innerStroke: "stroke-[#b45309]/20 group-hover:stroke-[#b45309]/45",
      text: "text-[#451a03]",
      iconBg: "border-[#f5d0a9] bg-[#fffdfa] text-[#b45309] group-hover:bg-[#b45309] group-hover:text-white",
      hole: "fill-[#451a03]/10 stroke-[#451a03]/20",
      string: "bg-[#b45309]/70 group-hover:bg-[#b45309]",
      roof: "fill-[#b45309]/20 group-hover:fill-[#b45309]/80",
      bgIconColor: "text-[#b45309]"
    },
    winter: {
      bg: "fill-[#0b132b] group-hover:fill-[#1c2541]",
      stroke: "stroke-[#1e293b] group-hover:stroke-[#90e0ef]",
      innerStroke: "stroke-[#90e0ef]/15 group-hover:stroke-[#90e0ef]/40",
      text: "text-[#e2eafc]",
      iconBg: "border-[#1e293b] bg-[#1c2541] text-[#90e0ef] group-hover:bg-[#90e0ef] group-hover:text-[#050a12]",
      hole: "fill-[#e2eafc]/10 stroke-[#e2eafc]/20",
      string: "bg-[#90e0ef]/70 group-hover:bg-[#90e0ef]",
      roof: "fill-[#90e0ef]/20 group-hover:fill-[#90e0ef]/80",
      bgIconColor: "text-[#90e0ef]"
    }
  }[currentSeason];

  const renderEmaBgIcon = () => {
    const iconClass = `w-14 h-14 sm:w-16 sm:h-16 opacity-[0.05] group-hover:opacity-[0.14] transition-all duration-700 ease-out ${emaSeasonStyles.bgIconColor}`;
    switch (currentSeason) {
      case "spring":
        return <Flower className={iconClass} strokeWidth={1} />;
      case "summer":
        return <Sun className={iconClass} strokeWidth={1} />;
      case "autumn":
        return <Leaf className={iconClass} strokeWidth={1} />;
      case "winter":
        return <Snowflake className={iconClass} strokeWidth={1} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-screen min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 md:p-8 z-10 overflow-hidden select-none transition-all duration-1000 ${seasonStyles.textMain}`}
      style={{ backgroundColor: SEASON_BG_BASE[currentSeason], transition: "background-color 1.2s ease-in-out" }}
    >
      {/* Smooth Background Transition Layer — all seasons always mounted so opacity always sums to 1, eliminating edge bleed */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {(Object.keys(SEASON_GRADIENTS) as Season[]).map((s) => (
          <motion.div
            key={s}
            initial={false}
            className="absolute inset-0"
            animate={{ opacity: currentSeason === s ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ backgroundImage: SEASON_GRADIENTS[s] }}
          />
        ))}
      </div>

      {/* HTML5 Canvas overlay for delicate, lightweight seasonal particles */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-[1] select-none opacity-80" 
      />

      {/* Red/Golden/Blue Sun/Moon Background Motif (Hinomaru/Crescent/Full abstraction shifting with season) */}
      <div 
        className="bg-sun absolute -left-12 -top-12 sm:left-1/4 sm:-top-24 w-60 h-60 sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none transition-all duration-1000 flex items-center justify-center opacity-30"
      >
        {/* Elegant Daytime Sun (pulsing full orb) */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-full transition-all duration-1000 ease-in-out ${
            seasonStyles.isDaytime ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          } ${seasonStyles.sunBg}`} 
        />

        {/* Elegant Nighttime Crescent Moon */}
        <div 
          className={`absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-1000 ease-in-out ${
            (!seasonStyles.isDaytime && seasonStyles.moonType === "crescent") ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none"
          }`}
        >
          {/* Soft backdrop glow of the moon */}
          <div className={`absolute inset-0 rounded-full filter blur-md transition-all duration-1000 ${seasonStyles.moonGlow}`} />
          <svg 
            className={`w-3/5 h-3/5 transition-colors duration-1000 rotate-[-15deg] ${seasonStyles.moonColor}`} 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </div>

        {/* Elegant Nighttime Full Moon */}
        <div 
          className={`absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-1000 ease-in-out ${
            (!seasonStyles.isDaytime && seasonStyles.moonType === "full") ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none"
          }`}
        >
          {/* Soft backdrop glow of the moon */}
          <div className={`absolute inset-0 rounded-full filter blur-md transition-all duration-1000 ${seasonStyles.moonGlow}`} />
          <svg 
            className={`w-3/5 h-3/5 transition-colors duration-1000 ${seasonStyles.moonColor}`} 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
      </div>

      {/* Massive Background Calligraphy (Shunyu style background atmosphere) */}
      <div className="bg-calligraphy absolute right-4 sm:right-12 md:right-24 top-[12%] bottom-[12%] pointer-events-none flex flex-col justify-center items-center gap-4 sm:gap-6 md:gap-10 select-none z-0">
        <span className={`char-1 font-display font-black text-[15vw] md:text-[11vw] ${seasonStyles.charColor} ${seasonStyles.charOpacity} transition-all duration-1000 leading-none select-none filter blur-[0.5px]`}>神</span>
        <span className={`char-2 font-display font-black text-[15vw] md:text-[11vw] ${seasonStyles.charColor} ${seasonStyles.charOpacity} transition-all duration-1000 leading-none select-none filter blur-[0.5px]`}>社</span>
        <span className={`char-3 font-display font-black text-[15vw] md:text-[11vw] ${seasonStyles.charColor} ${seasonStyles.charOpacity} transition-all duration-1000 leading-none select-none filter blur-[0.5px]`}>巡</span>
        <span className={`char-4 font-display font-black text-[15vw] md:text-[11vw] ${seasonStyles.charColor} ${seasonStyles.charOpacity} transition-all duration-1000 leading-none select-none filter blur-[0.5px]`}>礼</span>
      </div>

      {/* Top Header Row for Atmosphere & Season/Sound Controllers */}
      <div className="header-guide w-full flex flex-row justify-between items-center z-10 shrink-0 gap-4">
        
        {/* Sacred pathways title */}
        <div className={`text-[9px] sm:text-xs font-mono tracking-[0.4em] uppercase font-semibold select-none transition-colors duration-1000 ${seasonStyles.upperGuide}`}>
          古今巡礼 <span className="mx-2 opacity-50">|</span> SACRED PATHWAYS
        </div>

        {/* Dynamic Season Selector and Voice controllers */}
        <div className="flex items-center gap-3 select-none pointer-events-auto">
          
          {/* Audio trigger */}
          <div className="relative flex items-center">
            {showAudioTip && (
              <span className={`absolute -left-32 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 border text-[8.5px] font-serif uppercase tracking-widest shadow-xs rounded-md select-none animate-bounce transition-all duration-1000 ${seasonStyles.audioTip}`}>
                <Music size={10} className="text-torii animate-spin" /> Click for Sound
              </span>
            )}
            
            <button
              onClick={handleAudioToggle}
              className={`flex items-center justify-center p-2 rounded-full border transition-all duration-300 cursor-pointer ${seasonStyles.iconBtn}`}
              title="Toggle Ambient Audio"
            >
              {isAudioPlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
          </div>

          {/* Shinto Shiki (Four Seasons) selector tab */}
          <div className={`flex items-center border rounded-full px-1.5 py-0.5 gap-1 transition-all duration-1000 ${seasonStyles.tabBg}`}>
            {(["spring", "summer", "autumn", "winter"] as const).map((s) => {
              const char = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" }[s];
              const title = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" }[s];
              const isActive = currentSeason === s;

              const activeClass = isActive 
                ? seasonStyles.activeTabBtn 
                : seasonStyles.inactiveTabBtn;

              return (
                <button
                  key={s}
                  onClick={() => handleSeasonChange(s)}
                  className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-serif font-black tracking-none cursor-pointer transition-all duration-300 ${activeClass}`}
                  title={title}
                >
                  {char}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* Main Structural Canvas: Flows traditional Right-to-Left on Desktop */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center justify-center gap-6 sm:gap-8 md:gap-12 lg:gap-16 xl:gap-20 z-10 my-auto py-4 overflow-hidden">
        
        {/* RIGHT ZONE: Divine Calligraphy Title & Vermilion Seal */}
        <div className="flex flex-row-reverse items-start gap-3 sm:gap-4 shrink-0">
          
          {/* Main Title written vertically */}
          <div 
            className={`tategaki-title font-serif select-none transition-colors duration-1000 ${seasonStyles.titleText}`}
            style={{ 
              writingMode: 'vertical-rl',
              textOrientation: 'upright'
            }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-[0.15em] leading-none mb-1">
              神社巡り
            </h1>
            <p className="text-torii text-[9px] sm:text-xs font-sans tracking-[0.35em] uppercase mt-2 text-center">
              JINJA MEGURI
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 shrink-0">
            {/* Real Crimson Hanko Seal */}
            <div className={`hanko-stamps hanko-seal text-[10px] sm:text-[11px] tracking-widest px-1.5 py-2.5 shadow-xs border-2 border-torii text-torii font-serif font-black flex flex-col items-center transition-all duration-1000 ${seasonStyles.hankoBg}`}>
              <span className="leading-tight">御</span>
              <span className="leading-tight">朱</span>
              <span className="leading-tight">印</span>
            </div>
            {/* Ancient blessing block */}
            <div className={`hanko-blessing bg-moss text-white text-[8px] font-serif font-medium tracking-[0.25em] px-0.5 py-1.5 rounded-xs select-none uppercase w-5 text-center`}>
              神威
            </div>
          </div>

        </div>

        {/* MIDDLE ZONE: Elegant Vertical-RL Prose Columns */}
        <div className="flex flex-col lg:flex-row-reverse items-center lg:items-start gap-4 sm:gap-6 lg:gap-10 max-w-2xl px-2 text-left overflow-hidden">

          {/* Vertical-RL Japanese Poetry (desktop / iPad landscape only) */}
          <div
            className={`hidden lg:block font-serif text-sm lg:text-base tracking-[0.25em] leading-[2.4] shrink-0 transition-colors duration-1000 ${seasonStyles.proseText}`}
            style={{ 
              writingMode: 'vertical-rl',
              textOrientation: 'upright'
            }}
          >
            <p className="prose-col-1 block ml-4 lg:ml-6">
              一、 朱色の鳥居をくぐりて、悠久なる静寂の森へ。
            </p>
            <p className="prose-col-2 block ml-4 lg:ml-6">
              二、 苔むす古石、微かなる葉音に八百万の神が宿る。
            </p>
            <p className="prose-col-3 block">
              三、 境界を越え、澄み切る風に旅路の平安を祈る。
            </p>
          </div>

          {/* Horizontal italic prose for mobile + iPad portrait (vertical-RL gets cramped below lg) */}
          <div className={`block lg:hidden text-center space-y-1 sm:space-y-2 font-serif text-xs sm:text-sm md:text-base italic tracking-wide leading-relaxed transition-colors duration-1000 ${seasonStyles.proseText}`}>
            <p>"朱色の鳥居をくぐりて、悠久なる静寂の森へ。"</p>
            <p>"苔むす古石、微かなる葉音に八百万の神が宿る。"</p>
            <p>"境界を越え、澄み切る風に旅路の平安を祈る。"</p>
          </div>

          {/* Vertical Separator Line */}
          <div className={`divider-line hidden lg:block w-[1px] h-32 self-center shrink-0 origin-center transition-colors duration-1000 ${seasonStyles.dividerBg}`} />

          {/* English Narrative and Ema Plaques Column */}
          <div className="flex flex-col items-center lg:items-start gap-5 md:gap-7 select-none shrink-0 max-w-xs sm:max-w-sm lg:max-w-md my-auto py-2">

            {/* English Narrative in modern thin typography */}
            <div className={`prose-col-eng max-w-xs md:max-w-sm space-y-3 text-center lg:text-left text-[11px] sm:text-xs md:text-sm font-display italic leading-relaxed transition-colors duration-1000 ${seasonStyles.engText}`}>
              <p className="border-l-2 lg:border-l-0 lg:border-r-2 border-torii px-3 lg:px-0 lg:pr-3">
                "Ma (間) specifies that beauty remains in empty space while light dances. 
                Step beyond the vermilion gateway, where centuries of silence, moss garden spirits, 
                and traditional ritual fires breathe."
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-2.5 opacity-45">
                <span className="w-1 h-1 rounded-full bg-torii" />
                <span className="w-1.2 h-1.2 rounded-full bg-moss opacity-80" />
                <span className="w-1 h-1 rounded-full bg-torii" />
              </div>
            </div>

            {/* EMA PLAQUES ZONE (Side-by-side Wooden Plaques) */}
            <div className="flex flex-row gap-5 sm:gap-6 md:gap-8 items-center justify-center lg:justify-start w-full pt-2">
              
              {/* Ema 1 (Explore Button) */}
              <MotionLink
                href="/shrines"
                className="talisman-btn-1 group relative w-[clamp(6rem,27vw,11rem)] aspect-[9/7] cursor-pointer flex flex-col items-center justify-between p-3"
                style={{ transformOrigin: "center top" }}
                animate={{
                  rotate: [-1.2, 1.2, -1.2],
                  y: [0, -1.5, 0],
                }}
                transition={{
                  duration: 5.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* SVG Ema shape with full vector crisp borders */}
                <div className="absolute inset-0 w-full h-full -z-10 transition-all duration-500">
                  <svg className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.07)] group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-all duration-500" viewBox="0 0 200 150" preserveAspectRatio="none">
                    <path 
                      d="M 100 12 L 190 46 L 190 142 L 10 142 L 10 46 Z" 
                      className={`${emaSeasonStyles.bg} ${emaSeasonStyles.stroke} transition-all duration-1000`}
                      strokeWidth="3.2"
                    />
                    <path 
                      d="M 100 24 L 180 54 L 180 132 L 20 132 L 20 54 Z" 
                      fill="none"
                      className={`${emaSeasonStyles.innerStroke} transition-all duration-1000`}
                      strokeWidth="1.2"
                      strokeDasharray="4,4"
                    />
                    <path 
                      d="M 6 46 L 100 11 L 194 46 L 184 52 L 100 20 L 16 52 Z" 
                      className={`${emaSeasonStyles.roof} transition-all duration-1000`}
                    />
                    <circle cx="100" cy="29" r="4.5" className={`${emaSeasonStyles.hole} transition-all duration-1000`} strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Hanging ribbon thread */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1 h-5 sm:h-6 -mt-3.5 sm:-mt-4.5 rounded-full transition-all duration-1000 ${emaSeasonStyles.string}`} />

                {/* Seasonal Background Icon with low opacity */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                  {renderEmaBgIcon()}
                </div>

                {/* Texts in structured flow */}
                <div className="flex-1 flex flex-col items-center justify-center gap-1 w-full pt-6 pb-2 z-10">
                  <span className={`text-[11px] sm:text-xs md:text-[13px] font-serif font-bold tracking-[0.2em] transition-colors duration-1000 ${emaSeasonStyles.text}`}>
                    縁起を巡る
                  </span>
                  <span className={`text-[7px] sm:text-[8px] font-sans tracking-[0.12em] font-semibold mt-1 transition-colors duration-1000 ${seasonStyles.accentText}`}>
                    ENTER PRECINCTS
                  </span>
                </div>
              </MotionLink>

              {/* Ema 2 (Calendar Button) */}
              <MotionLink
                href="/calendar"
                className="talisman-btn-2 group relative w-[clamp(6rem,27vw,11rem)] aspect-[9/7] cursor-pointer flex flex-col items-center justify-between p-3"
                style={{ transformOrigin: "center top" }}
                animate={{
                  rotate: [1.2, -1.2, 1.2],
                  y: [-1.5, 0, -1.5],
                }}
                transition={{
                  duration: 6.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 0.4,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* SVG Ema shape with full vector crisp borders */}
                <div className="absolute inset-0 w-full h-full -z-10 transition-all duration-500">
                  <svg className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.07)] group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-all duration-500" viewBox="0 0 200 150" preserveAspectRatio="none">
                    <path 
                      d="M 100 12 L 190 46 L 190 142 L 10 142 L 10 46 Z" 
                      className={`${emaSeasonStyles.bg} ${emaSeasonStyles.stroke} transition-all duration-1000`}
                      strokeWidth="3.2"
                    />
                    <path 
                      d="M 100 24 L 180 54 L 180 132 L 20 132 L 20 54 Z" 
                      fill="none"
                      className={`${emaSeasonStyles.innerStroke} transition-all duration-1000`}
                      strokeWidth="1.2"
                      strokeDasharray="4,4"
                    />
                    <path 
                      d="M 6 46 L 100 11 L 194 46 L 184 52 L 100 20 L 16 52 Z" 
                      className={`${emaSeasonStyles.roof} transition-all duration-1000`}
                    />
                    <circle cx="100" cy="29" r="4.5" className={`${emaSeasonStyles.hole} transition-all duration-1000`} strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Hanging ribbon thread */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1 h-5 sm:h-6 -mt-3.5 sm:-mt-4.5 rounded-full transition-all duration-1000 ${emaSeasonStyles.string}`} />

                {/* Seasonal Background Icon with low opacity */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                  {renderEmaBgIcon()}
                </div>

                {/* Texts in structured flow */}
                <div className="flex-1 flex flex-col items-center justify-center gap-1 w-full pt-6 pb-2 z-10">
                  <span className={`text-[11px] sm:text-xs md:text-[13px] font-serif font-bold tracking-[0.2em] transition-colors duration-1000 ${emaSeasonStyles.text}`}>
                    神事歳時記
                  </span>
                  <span className={`text-[7px] sm:text-[8px] font-sans tracking-[0.12em] font-semibold mt-1 transition-colors duration-1000 ${seasonStyles.accentText}`}>
                    FESTIVAL LISTS
                  </span>
                </div>
              </MotionLink>

            </div>

          </div>

        </div>

      </div>

      {/* Atmospheric Footer displaying seasonal information */}
      <div className="footer-guide w-full flex flex-col sm:flex-row gap-2 justify-between items-center sm:items-end z-10 text-center sm:text-left mt-4 shrink-0 transition-all duration-1000">
        <div className={`text-[8px] sm:text-[9px] tracking-[0.4em] font-mono uppercase transition-all duration-1000 ${seasonStyles.accentText}`}>
          {seasonStyles.tagLabel}
        </div>
        <div className="text-[8px] sm:text-[9px] text-[#3c4239]/40 tracking-[0.4em] font-mono uppercase flex gap-2">
          <span>ISE</span> • <span>FUSHIMI INARI</span> • <span>ITSUKUSHIMA</span>
        </div>
      </div>
    </div>
  );
}
