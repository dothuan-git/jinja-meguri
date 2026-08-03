import { describe, expect, it } from "vitest";
import { namePair } from "./names";

const full = { name_en: "Fushimi Inari Grand Shrine", name_ja: "伏見稲荷大社", name_romaji: "Fushimi Inari Taisha" };

describe("namePair", () => {
  it("EN: english main, kanji sub", () => {
    expect(namePair("en", full)).toEqual({
      main: "Fushimi Inari Grand Shrine",
      sub: "伏見稲荷大社",
      mainIsJa: false,
      subIsJa: true,
    });
  });

  it("EN: no kanji → no sub", () => {
    expect(namePair("en", { name_en: "X Shrine" }).sub).toBeNull();
  });

  it("JA: kanji main, romaji sub", () => {
    expect(namePair("ja", full)).toEqual({
      main: "伏見稲荷大社",
      sub: "Fushimi Inari Taisha",
      mainIsJa: true,
      subIsJa: false,
    });
  });

  it("JA: missing romaji falls back to name_en as sub", () => {
    expect(namePair("ja", { name_en: "Ise Grand Shrine", name_ja: "伊勢神宮" })).toEqual({
      main: "伊勢神宮",
      sub: "Ise Grand Shrine",
      mainIsJa: true,
      subIsJa: false,
    });
  });

  it("JA: missing kanji → name_en main, sub suppressed when duplicate", () => {
    expect(namePair("ja", { name_en: "X Shrine" })).toEqual({
      main: "X Shrine",
      sub: null,
      mainIsJa: false,
      subIsJa: false,
    });
  });

  it("JA: missing kanji but distinct romaji still shows romaji sub", () => {
    expect(namePair("ja", { name_en: "Grand Festival", name_romaji: "Reitaisai" })).toEqual({
      main: "Grand Festival",
      sub: "Reitaisai",
      mainIsJa: false,
      subIsJa: false,
    });
  });
});
