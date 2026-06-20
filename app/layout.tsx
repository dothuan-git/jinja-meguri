import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import SiteFooter from "@/components/SiteFooter";
import AmbientByRoute from "@/components/AmbientByRoute";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Jinja Meguri — 神社巡り",
  description:
    "A field guide to the shrines of Japan — their kami, lore, and festivals, surfaced in English with the original Japanese preserved.",
};

export default async function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-sand text-stone overflow-x-hidden">
        {/* Reveal hidden [data-reveal] elements for visitors without JS */}
        <noscript><style>{`[data-reveal]{opacity:1}`}</style></noscript>
        <AmbientByRoute />
        <div className="relative z-10 flex min-h-screen flex-col items-center">
          <SiteChrome user={user} />
          <div className="w-full flex-1">{children}</div>
          <SiteFooter />
        </div>
        {modal}
      </body>
    </html>
  );
}
