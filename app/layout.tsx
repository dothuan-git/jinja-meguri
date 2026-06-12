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
        </div>
        {modal}
      </body>
    </html>
  );
}
