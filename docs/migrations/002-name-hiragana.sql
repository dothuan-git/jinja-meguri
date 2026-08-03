-- ============================================================
-- Migration 002 — Hiragana name column for shrines / deities / festivals
-- ============================================================
-- Additive-only and idempotent. Adds a nullable `name_hiragana` beside the
-- existing name_en/name_ja pair on the three entities, giving a kana reading
-- for names whose kanji (name_ja) is not obvious to read (e.g. "伏見稲荷大社"
-- / "ふしみいなりたいしゃ"). Also drops the short-lived `name_romaji` column
-- from an earlier version of this migration (never shipped to main).
--
-- Display rule (see lib/names.ts `namePair`):
--   EN locale: main = name_en,              sub = name_ja (kanji)
--   JA locale: main = name_ja ?? name_en,   sub = name_hiragana ?? name_en
-- ============================================================

ALTER TABLE shrines   DROP COLUMN IF EXISTS name_romaji;
ALTER TABLE deities   DROP COLUMN IF EXISTS name_romaji;
ALTER TABLE festivals DROP COLUMN IF EXISTS name_romaji;

ALTER TABLE shrines   ADD COLUMN IF NOT EXISTS name_hiragana text;
ALTER TABLE deities   ADD COLUMN IF NOT EXISTS name_hiragana text;
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS name_hiragana text;
