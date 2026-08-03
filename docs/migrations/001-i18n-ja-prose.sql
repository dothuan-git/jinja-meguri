-- ============================================================
-- Migration 001 — Japanese (JA) prose columns for i18n
-- ============================================================
-- Additive-only and idempotent (ADD COLUMN IF NOT EXISTS): safe to apply while
-- the old (pre-i18n) code is still running. Adds a parallel nullable `*_ja`
-- column beside every English narrative/prose column. Empty (null) `_ja` falls
-- back to the English value at repo assembly time (see lib/db/repo.ts `loc`).
--
-- Proper-noun name pairs (name_en/name_ja) already existed and are NOT touched.
-- ============================================================

-- Shrines: city + address are free text, so localizable.
ALTER TABLE shrines
    ADD COLUMN IF NOT EXISTS city_ja    text,
    ADD COLUMN IF NOT EXISTS address_ja text;

-- Shrine detail prose (1:1).
ALTER TABLE shrine_details
    ADD COLUMN IF NOT EXISTS history_ja          text,
    ADD COLUMN IF NOT EXISTS description_ja       text,
    ADD COLUMN IF NOT EXISTS prayer_focus_ja      text,
    ADD COLUMN IF NOT EXISTS best_time_ja         text,
    ADD COLUMN IF NOT EXISTS quote_ja             text,
    ADD COLUMN IF NOT EXISTS geographic_notes_ja  text;

-- Shrine highlights (1:N).
ALTER TABLE shrine_highlights
    ADD COLUMN IF NOT EXISTS title_ja text,
    ADD COLUMN IF NOT EXISTS body_ja  text;

-- Festival prose.
ALTER TABLE festivals
    ADD COLUMN IF NOT EXISTS time_prose_ja    text,
    ADD COLUMN IF NOT EXISTS origin_ja         text,
    ADD COLUMN IF NOT EXISTS meaning_ja        text,
    ADD COLUMN IF NOT EXISTS ritual_ja         text,
    ADD COLUMN IF NOT EXISTS prayer_ja         text,
    ADD COLUMN IF NOT EXISTS visitor_notes_ja  text;

-- Deities: titles[] gets a whole-array JA sibling (element-wise fallback is
-- never done — an empty titles_ja falls back to the whole titles array).
ALTER TABLE deities
    ADD COLUMN IF NOT EXISTS titles_ja         text[],
    ADD COLUMN IF NOT EXISTS canonical_lore_ja  text,
    ADD COLUMN IF NOT EXISTS mythic_sphere_ja   text;

-- Shrine-specific deity overrides.
ALTER TABLE shrine_deities
    ADD COLUMN IF NOT EXISTS regional_lore_ja text,
    ADD COLUMN IF NOT EXISTS alter_titles_ja  text[];

-- Catalog description / grouping labels.
ALTER TABLE ranks
    ADD COLUMN IF NOT EXISTS description_ja text;

-- group_label doubles as the facet grouping KEY (grouped on the EN value) and a
-- display string; group_label_ja is display-only.
ALTER TABLE prayer_categories
    ADD COLUMN IF NOT EXISTS group_label_ja text;

-- Festival occurrence notes.
ALTER TABLE festival_occurrences
    ADD COLUMN IF NOT EXISTS notes_ja text;

-- Source titles.
ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS title_ja text;

-- ------------------------------------------------------------
-- Catalog backfills (keyed on name_en). These are the seed-defined catalogs, so
-- their JA labels ship with the migration rather than being authored per-record.
-- Idempotent: re-running overwrites with the same values.
-- ------------------------------------------------------------
UPDATE ranks r SET description_ja = v.description_ja
FROM (VALUES
    ('Honso',             '全神社の総本宗'),
    ('Sohonsha',          '神社網の総本社'),
    ('Chokusaisha',       '勅使参向の神社'),
    ('Ichinomiya',        '国内最高位の神社'),
    ('Myojin-Taisha',     '名神大社'),
    ('Shikinai-sha',      '式内社'),
    ('Kanpei-Taisha',     '官幣大社'),
    ('Kokuhei-Taisha',    '国幣大社'),
    ('Kanpei-Chusha',     '官幣中社'),
    ('Kokuhei-Chusha',    '国幣中社'),
    ('Kanpei-Shosha',     '官幣小社'),
    ('Kokuhei-Shosha',    '国幣小社'),
    ('Bekkaku-Kanpeisha', '別格官幣社'),
    ('Fu-Ken-sha',        '府県社'),
    ('Gosha',             '郷社'),
    ('Sonsha',            '村社'),
    ('Beppyo-sha',        '別表神社')
) AS v(name_en, description_ja)
WHERE r.name_en = v.name_en;

UPDATE prayer_categories p SET group_label_ja = v.group_label_ja
FROM (VALUES
    ('Fortune & Success',   '開運・成功'),
    ('Love & Family',       '縁結び・家庭'),
    ('Health',              '健康'),
    ('Prosperity',          '商売繁盛'),
    ('Protection & Safety', '厄除け・安全'),
    ('Scholarship',         '学業'),
    ('Nation',              '国家')
) AS v(group_label, group_label_ja)
WHERE p.group_label = v.group_label;
