-- ============================================================
-- SHINTO SHRINE DATABASE — RELATIONAL DATA MODEL (v2 naming)
-- PostgreSQL (Neon)
-- ============================================================
-- Naming rule:
--   catalog table   = bare plural noun        (ranks, prayer_categories, deities)
--   junction table  = shrine_<catalog>        (shrine_ranks, shrine_prayer_categories, shrine_deities)
-- ============================================================

-- ------------------------------------------------------------
-- REFERENCE / CONTROLLED VOCABULARY
-- ------------------------------------------------------------
CREATE TABLE regions (
    id        smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name_en   text NOT NULL UNIQUE,
    name_ja   text
);

CREATE TABLE prefectures (
    id        smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name_en   text NOT NULL UNIQUE,
    name_ja   text,
    region_id smallint NOT NULL REFERENCES regions(id)
);

-- Shrine rank hierarchy (Honsha … Sonsha + Templeshrine).
CREATE TABLE ranks (
    id          smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code        text NOT NULL UNIQUE,    -- 'Honsha','Ichinomiya','Beppyo-sha'...
    name_en     text NOT NULL,
    name_ja     text,
    rank_order  smallint NOT NULL        -- 1 = highest (Honsha)
);

-- Prayer categories ("strong for"). Powers the listing facet filter.
CREATE TABLE prayer_categories (
    id        smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code      text NOT NULL UNIQUE,      -- 'Victory','Love','Seafaring'...
    name_en   text NOT NULL,
    name_ja   text
);

-- ------------------------------------------------------------
-- DEITIES (canonical — one row per kami)
-- ------------------------------------------------------------
CREATE TABLE deities (
    id             integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name_romaji    text NOT NULL,
    name_kanji     text UNIQUE,          -- dedup key on ingest
    domain         text,                 -- divine portfolio ONLY
    title          text,                 -- human identity; NULL for primordial
    deity_type     text NOT NULL
        CHECK (deity_type IN ('origin','deified human','syncretic','imported')),
    canonical_lore text                  -- Kojiki/Nihon Shoki fallback narrative
);

-- ------------------------------------------------------------
-- SHRINES (core entity)
-- ------------------------------------------------------------
CREATE TABLE shrines (
    id            integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    slug          text NOT NULL UNIQUE,                -- URL key for detail-page routing
    name_en       text NOT NULL,
    name_ja       text,
    prefecture_id smallint NOT NULL REFERENCES prefectures(id),
    region_id     smallint NOT NULL REFERENCES regions(id),   -- denormalized for cheap region filter
    city          text,
    address       text,
    lat           double precision,                     -- WGS-84 latitude  (nullable; used for map markers)
    lng           double precision,                     -- WGS-84 longitude
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shrines_prefecture ON shrines(prefecture_id);
CREATE INDEX idx_shrines_region     ON shrines(region_id);

-- ------------------------------------------------------------
-- SHRINE ↔ DEITY (junction; carries shrine-specific deity data)
-- ------------------------------------------------------------
CREATE TABLE shrine_deities (
    shrine_id    integer NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    deity_id     integer NOT NULL REFERENCES deities(id),
    is_primary   boolean NOT NULL DEFAULT false,
    sort_order   smallint NOT NULL DEFAULT 0,
    role         text,                   -- shrine-specific role
    regional_lore text,                  -- preferred over deities.canonical_lore at read time
    PRIMARY KEY (shrine_id, deity_id)
);

CREATE INDEX idx_shrine_deities_deity ON shrine_deities(deity_id);

-- ------------------------------------------------------------
-- SHRINE ↔ RANK (junction; all ranks as rows)
-- ------------------------------------------------------------
CREATE TABLE shrine_ranks (
    shrine_id integer  NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    rank_id   smallint NOT NULL REFERENCES ranks(id),
    PRIMARY KEY (shrine_id, rank_id)
);
-- "Highest rank" = MIN(rank_order) joined to ranks at query time.

-- ------------------------------------------------------------
-- SHRINE ↔ PRAYER CATEGORY (junction; powers "strong for" filter)
-- ------------------------------------------------------------
CREATE TABLE shrine_prayer_categories (
    shrine_id   integer  NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    category_id smallint NOT NULL REFERENCES prayer_categories(id),
    PRIMARY KEY (shrine_id, category_id)
);

CREATE INDEX idx_shrine_prayer_categories_cat ON shrine_prayer_categories(category_id);

-- ------------------------------------------------------------
-- SHRINE DETAILS (1:1 topical prose)
-- ------------------------------------------------------------
CREATE TABLE shrine_details (
    shrine_id    integer PRIMARY KEY REFERENCES shrines(id) ON DELETE CASCADE,
    history      text,    -- founding, legendary events, syncretic layers
    why_visit    text,    -- significance + visitor experience
    prayer_focus text,    -- prayer purposes w/ JP terms
    best_season  text     -- nature / atmosphere / timing
    -- NO festival field — derive from event_occurrences
);

-- ------------------------------------------------------------
-- EVENTS (festival definition)
-- ------------------------------------------------------------
CREATE TABLE events (
    id            integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    shrine_id     integer NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    name_en       text NOT NULL,
    name_ja       text,
    time_prose    text,    -- DISPLAY ONLY: 'dawn, 2nd Sunday of May', lunar...
    origin        text,
    meaning       text,
    ritual        text,
    prayer        text,
    access_type   text CHECK (access_type IN ('public_witness','pilgrimage_experience')),
    visitor_notes text
);

CREATE INDEX idx_events_shrine ON events(shrine_id);

-- ------------------------------------------------------------
-- EVENT ↔ DEITY (junction; event-specific role)
-- ------------------------------------------------------------
CREATE TABLE event_deities (
    event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    deity_id integer NOT NULL REFERENCES deities(id),
    role     text,
    PRIMARY KEY (event_id, deity_id)
);

-- ------------------------------------------------------------
-- EVENT OCCURRENCES (concrete dated rows — what the calendar queries)
-- ------------------------------------------------------------
CREATE TABLE event_occurrences (
    id         integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event_id   integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    shrine_id  integer NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,  -- denorm: calendar hot path
    start_date date NOT NULL,
    end_date   date NOT NULL,
    CHECK (end_date >= start_date)
);

-- Range-overlap query: start_date <= :range_end AND end_date >= :range_start
CREATE INDEX idx_occurrences_dates  ON event_occurrences(start_date, end_date);
CREATE INDEX idx_occurrences_shrine ON event_occurrences(shrine_id);

-- ------------------------------------------------------------
-- SOURCES (provenance)
-- ------------------------------------------------------------
CREATE TABLE sources (
    id          integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    shrine_id   integer NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    url         text NOT NULL,
    title       text,
    source_type text,    -- 'official','wikipedia_ja','tourism','academic'
    note        text
);

CREATE INDEX idx_sources_shrine ON sources(shrine_id);

-- ------------------------------------------------------------
-- LORE-PRIORITY VIEW (regional preferred over canonical)
-- ------------------------------------------------------------
CREATE VIEW shrine_deity_lore AS
SELECT sd.shrine_id, sd.deity_id, d.name_romaji, d.name_kanji,
       COALESCE(sd.regional_lore, d.canonical_lore) AS lore,
       (sd.regional_lore IS NOT NULL)               AS is_regional
FROM shrine_deities sd
JOIN deities d ON d.id = sd.deity_id;

-- ============================================================
-- SEARCH LAYER
-- ============================================================
-- English prose + names  -> full-text (tsvector)
-- Japanese terms / typos  -> trigram (pg_trgm)
-- One row per shrine aggregating its deities, categories, events.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE MATERIALIZED VIEW shrine_search AS
SELECT
    s.id        AS shrine_id,
    s.slug,
    s.name_en,
    s.name_ja,
    s.city,
    -- raw blob for trigram (handles Japanese + fuzzy)
    concat_ws(' ',
        s.name_en, s.name_ja, s.city,
        string_agg(DISTINCT d.name_romaji, ' '),
        string_agg(DISTINCT d.name_kanji,  ' '),
        string_agg(DISTINCT pc.name_en,    ' '),
        string_agg(DISTINCT e.name_en,     ' '),
        string_agg(DISTINCT e.name_ja,     ' ')
    ) AS search_blob,
    -- weighted tsvector for ranked English search
    setweight(to_tsvector('english', coalesce(s.name_en,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(string_agg(DISTINCT d.name_romaji,' '),'')), 'B') ||
    setweight(to_tsvector('english', coalesce(string_agg(DISTINCT pc.name_en,' '),'')), 'B') ||
    setweight(to_tsvector('english', coalesce(string_agg(DISTINCT e.name_en,' '),'')), 'C')
        AS search_tsv
FROM shrines s
LEFT JOIN shrine_deities sd            ON sd.shrine_id = s.id
LEFT JOIN deities d                    ON d.id = sd.deity_id
LEFT JOIN shrine_prayer_categories spc ON spc.shrine_id = s.id
LEFT JOIN prayer_categories pc         ON pc.id = spc.category_id
LEFT JOIN events e                     ON e.shrine_id = s.id
GROUP BY s.id;

CREATE INDEX idx_shrine_search_tsv  ON shrine_search USING GIN (search_tsv);
CREATE INDEX idx_shrine_search_trgm ON shrine_search USING GIN (search_blob gin_trgm_ops);
-- Refresh after ingest:  REFRESH MATERIALIZED VIEW shrine_search;
