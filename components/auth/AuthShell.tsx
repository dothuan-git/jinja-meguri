"use client";

import Link from "next/link";
import { motion } from "motion/react";

/** Themed centered card wrapper shared by the sign-in / sign-up forms. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="wabi-sabi-card washi-paper sumi-shadow rounded-2xl px-8 py-10 backdrop-blur-md relative overflow-hidden"
      >
        {/* Japanese Shrine-inspired corner border decorations */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-torii/30 pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-torii/30 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-torii/30 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-torii/30 pointer-events-none" />

        <Link href="/" className="mb-6 flex items-center justify-center gap-2 select-none group">
          <motion.span
            initial={{ scale: 0.8, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="hanko-seal flex h-10 w-10 items-center justify-center rounded-xs p-1 text-xl font-black"
          >
            神
          </motion.span>
        </Link>
        
        <h1 className="text-center font-display-jp font-serif text-3xl font-bold tracking-wide text-stone">
          {title}
        </h1>
        
        {subtitle && (
          <p className="mt-3 text-center font-sans text-xs tracking-wider uppercase text-moss-light/80">
            {subtitle}
          </p>
        )}

        <div className="mt-8 relative z-10">{children}</div>
      </motion.div>
      
      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-6 text-center text-xs tracking-widest uppercase text-moss-light/80"
        >
          {footer}
        </motion.div>
      )}
    </div>
  );
}

