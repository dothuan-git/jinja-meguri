import { describe, it, expect } from "vitest";
import { buildEmbedUrl } from "@/lib/maps";

describe("buildEmbedUrl", () => {
  it("builds a coordinate query when coordinates exist", () => {
    expect(buildEmbedUrl({ coordinates: { lat: 35.0036, lng: 135.7785 }, name: "Yasaka", city: "Kyoto" })).toBe(
      "https://www.google.com/maps?q=35.0036,135.7785&z=16&output=embed"
    );
  });
  it("falls back to name + city when coordinates are missing", () => {
    expect(buildEmbedUrl({ coordinates: null, name: "Yasaka Shrine", city: "Kyoto" })).toBe(
      "https://www.google.com/maps?q=Yasaka%20Shrine%20Kyoto&z=16&output=embed"
    );
  });
  it("uses name only when city is also missing", () => {
    expect(buildEmbedUrl({ coordinates: null, name: "Yasaka Shrine", city: null })).toBe(
      "https://www.google.com/maps?q=Yasaka%20Shrine&z=16&output=embed"
    );
  });
});
