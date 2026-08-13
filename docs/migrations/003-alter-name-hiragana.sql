-- ============================================================
-- Migration 003 — Hiragana reading for shrine-specific deity alter names
-- ============================================================
-- Additive-only and idempotent. Adds a nullable `alter_name_hiragana` beside
-- the existing alter_name_en/alter_name_ja pair on shrine_deities, giving a
-- kana reading for a shrine's enshrined (alternate) deity name — closes the
-- same gap migration 002 closed for shrines/deities/festivals, but for this
-- junction table's shrine-specific override.
--
-- Display rule (see lib/names.ts `namePair`, components/ShrineDetailView.tsx
-- `deityPair`):
--   EN locale: main = alter_name_en ?? name_en,          sub = alter_name_ja ?? name_ja
--   JA locale: main = alter_name_ja ?? name_ja ?? name_en, sub = alter_name_hiragana ?? name_hiragana
-- ============================================================

ALTER TABLE shrine_deities ADD COLUMN IF NOT EXISTS alter_name_hiragana text;
