"use client";

import { usePathname } from "next/navigation";
import BackgroundAmbient from "@/components/BackgroundAmbient";

export default function AmbientByRoute() {
  const pathname = usePathname();
  if (pathname === "/") return null; // landing renders its own atmosphere
  const mode = pathname.startsWith("/calendar") ? "calendar" : "listing";
  return <BackgroundAmbient mode={mode} />;
}
