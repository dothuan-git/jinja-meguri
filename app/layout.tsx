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
      <head>
        {/* Warm the font origins, then fetch the face CSS in parallel with the
            app stylesheet (React 19 hoists these to <head>). display=swap keeps
            text visible while the CJK faces stream in. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Serif+JP:wght@200;300;400;500;600;700;900&display=swap"
        />
      </head>
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
