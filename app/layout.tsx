import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jinja Meguri — 神社巡り",
  description: "Discover and learn about Shinto shrines across Japan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
