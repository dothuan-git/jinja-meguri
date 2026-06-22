"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Calendar as CalendarIcon, Home, Sparkles, User, LogIn } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/server";

const NAV = [
  { href: "/shrines", label: "Shrines", match: ["/shrines"] },
  { href: "/deities", label: "Deities", match: ["/deities"] },
  { href: "/calendar", label: "Festivals", match: ["/calendar"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export default function SiteChrome({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  if (pathname === "/") return null; // home is full-bleed, no chrome

  return (
    <>
      {/* Desktop floating header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-[calc(100%-2.5rem)] max-w-7xl mx-5 mt-5 px-8 py-4.5 hidden md:flex items-center justify-between z-30 shrink-0 border border-moss/15 bg-washi/75 shadow-sm rounded-2xl backdrop-blur-md sticky top-5"
      >
        <Link href="/" className="flex items-center gap-3 cursor-pointer select-none group">
          <div className="w-7 h-7 hanko-seal text-[15px] p-0.5 rounded-xs flex items-center justify-center font-black transition-transform duration-300 group-hover:rotate-6">
            神
          </div>
          <div>
            <span className="font-display text-sm tracking-[0.25em] text-stone group-hover:text-torii transition-colors font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              神社巡り
            </span>
            <span className="text-[9px] font-mono tracking-widest text-moss-light uppercase block font-semibold">
              Jinja Meguri
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-8 select-none">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-widest uppercase py-1 transition-all duration-200 font-bold ${
                isActive(pathname, item.match)
                  ? "text-torii border-b-2 border-torii"
                  : "text-moss-light hover:text-torii"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <Link
            href={`/users/${user.id}`}
            aria-label={user.name || "Profile"}
            title={user.name || "Profile"}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              pathname.startsWith("/users/")
                ? "border-torii text-torii"
                : "border-moss/20 text-moss-light hover:border-torii hover:text-torii"
            }`}
          >
            <User size={16} />
          </Link>
        ) : (
            <Link
            href="/sign-in"
            className="text-xs tracking-widest uppercase py-1 font-mono font-bold text-moss-light transition-colors hover:text-torii"
          >
            Sign in
          </Link>
        )}
      </motion.header>

      {/* Mobile top banner */}
      <div className="md:hidden w-full flex items-center justify-center gap-2 py-4 bg-washi/85 backdrop-blur-sm border-b border-moss/10 z-20 shrink-0">
        <div className="w-5.5 h-5.5 hanko-seal text-[11px] p-0 flex items-center justify-center font-bold">神</div>
        <Link href="/" className="font-display text-sm tracking-[0.25em] text-stone pl-[0.25em] cursor-pointer font-bold" style={{ fontFamily: "'Noto Serif JP', serif" }}>
          神社巡り
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 h-16 bg-washi/95 border-t border-moss/15 flex items-center justify-around px-6 z-40 md:hidden backdrop-blur-lg select-none"
        >
          <Link href="/" className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
            <Home size={18} className={pathname === "/" ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${pathname === "/" ? "text-torii" : "text-moss-light"}`}>Home</span>
          </Link>
          <Link href="/shrines" className="flex flex-col items-center justify-center gap-1.5 w-20 h-12">
            <Compass size={18} className={isActive(pathname, ["/shrines"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/shrines"]) ? "text-torii" : "text-moss-light"}`}>Shrines</span>
          </Link>
          <Link href="/deities" className="flex flex-col items-center justify-center gap-1.5 w-18 h-12">
            <Sparkles size={18} className={isActive(pathname, ["/deities"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/deities"]) ? "text-torii" : "text-moss-light"}`}>Deities</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
            <CalendarIcon size={18} className={isActive(pathname, ["/calendar"]) ? "text-torii scale-110" : "text-moss-light"} />
            <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/calendar"]) ? "text-torii" : "text-moss-light"}`}>Festivals</span>
          </Link>
          {user ? (
            <Link href={`/users/${user.id}`} className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
              <User size={18} className={pathname.startsWith("/users/") ? "text-torii scale-110" : "text-moss-light"} />
              <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${pathname.startsWith("/users/") ? "text-torii" : "text-moss-light"}`}>Profile</span>
            </Link>
          ) : (
            <Link href="/sign-in" className="flex flex-col items-center justify-center gap-1.5 w-16 h-12">
              <LogIn size={18} className={isActive(pathname, ["/sign-in", "/sign-up"]) ? "text-torii scale-110" : "text-moss-light"} />
              <span className={`text-[9px] uppercase tracking-widest font-mono font-bold ${isActive(pathname, ["/sign-in", "/sign-up"]) ? "text-torii" : "text-moss-light"}`}>Sign in</span>
            </Link>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
