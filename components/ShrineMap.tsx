"use client";

import { useEffect, useRef } from "react";
import { buildEmbedUrl } from "@/lib/maps";
import type { Coordinates } from "@/lib/types";

export default function ShrineMap({
  coordinates,
  name,
  city,
}: {
  coordinates: Coordinates | null;
  name: string;
  city: string | null;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const url = buildEmbedUrl({ coordinates, name, city });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting && el.src.endsWith("about:blank")) el.src = url;
        }),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.src = "about:blank"; // unload on unmount (modal close / navigation)
    };
  }, [url]);

  return (
    <iframe
      ref={ref}
      src="about:blank"
      loading="lazy"
      className="aspect-video w-full rounded-md border hairline"
      title={`Map of ${name}`}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
