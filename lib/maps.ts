import type { Coordinates } from "@/lib/types";

// Keyless Google Maps embed. Undocumented endpoint; isolated here so swapping to
// the keyed Maps Embed API later is a one-file change.
export function buildEmbedUrl(input: {
  coordinates: Coordinates | null;
  name: string;
  city: string | null;
}): string {
  const base = "https://www.google.com/maps";
  if (input.coordinates) {
    const { lat, lng } = input.coordinates;
    return `${base}?q=${lat},${lng}&z=16&output=embed`;
  }
  const q = [input.name, input.city].filter(Boolean).join(" ");
  return `${base}?q=${encodeURIComponent(q)}&z=16&output=embed`;
}
