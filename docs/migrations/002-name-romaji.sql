-- ============================================================
-- Migration 002 — Romaji name column for shrines / deities / festivals
-- ============================================================
-- Additive-only and idempotent. Adds a nullable `name_romaji` beside the
-- existing name_en/name_ja pair on the three entities whose romaji reading can
-- differ from the English display name (e.g. "Fushimi Inari Grand Shrine" /
-- "Fushimi Inari Taisha" / 伏見稲荷大社).
--
-- Display rule (see lib/names.ts `namePair`):
--   EN locale: main = name_en,              sub = name_ja (kanji)
--   JA locale: main = name_ja ?? name_en,   sub = name_romaji ?? name_en
-- ============================================================

ALTER TABLE shrines   ADD COLUMN IF NOT EXISTS name_romaji text;
ALTER TABLE deities   ADD COLUMN IF NOT EXISTS name_romaji text;
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS name_romaji text;
