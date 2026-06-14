import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import AmbientByRoute from "@/components/AmbientByRoute";

export const metadata: Metadata = {
  title: "Jinja Meguri — 神社巡り",
  description:
    "A field guide to the shrines of Japan — their kami, lore, and festivals, surfaced in English with the original Japanese preserved.",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-sand text-stone overflow-x-hidden">
        {/* Reveal hidden [data-reveal] elements for visitors without JS */}
        <noscript><style>{`[data-reveal]{opacity:1}`}</style></noscript>
        <AmbientByRoute />
        <div className="relative z-10 flex min-h-screen flex-col items-center">
          <SiteChrome />
          <div className="w-full flex-1">{children}</div>
          <footer className="w-full py-8 pb-28 md:pb-12 px-6 flex flex-col items-center text-center gap-2 select-none">
            <div className="w-6 h-[1px] bg-torii/20 mb-1" />
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-stone/40">
              Jinja Meguri — 神社巡り
            </div>
            <p className="max-w-lg text-[10px] font-serif italic text-stone/40 leading-relaxed">
              AI-assisted research project. Information may contain inaccuracies; verify with official sanctuary channels before visiting.
            </p>
            <div className="text-[9px] font-mono tracking-tight text-stone/30">
              &copy; {new Date().getFullYear()} — Dedicated to the preservation of sacred lore.
            </div>
          </footer>
        </div>
        {modal}
      </body>
    </html>
  );
}
