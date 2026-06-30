-- ============================================================
-- SHINTO SHRINE DATABASE — RELATIONAL DATA MODEL (v3)
-- PostgreSQL (Neon)
-- ============================================================
-- Naming conventions:
--   catalog table  = bare plural noun         (ranks, prayer_categories, deities)
--   junction table = shrine_<catalog>         (shrine_ranks, shrine_prayer_categories, shrine_deities)
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
    name_en     text NOT NULL UNIQUE,    -- romaji name: 'Ichinomiya', 'Sonsha'...
    description text,                    -- English translation label
    name_ja     text,
    rank_order  smallint NOT NULL        -- 1 = highest
);

-- Prayer categories ("strong for"). Powers the listing facet filter.
CREATE TABLE prayer_categories (
    id          smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name_en     text NOT NULL UNIQUE,
    name_ja     text,
    group_label text NOT NULL
);

-- ------------------------------------------------------------
-- DEITIES (canonical — one row per kami)
-- ------------------------------------------------------------
CREATE TABLE deities (
    id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en        text NOT NULL,                -- romaji / English name
    name_ja        text UNIQUE,                  -- kanji; dedup key on ingest
    titles         text[],                       -- domain/role epithets (sphere of patronage)
    deity_type     text NOT NULL
        CHECK (deity_type IN ('mythological','deified_human','syncretic')),
    canonical_lore text,                         -- Kojiki/Nihon Shoki fallback narrative
    mythic_sphere  text                          -- free-text domain label, e.g. "Agriculture & Commerce"
);

-- ------------------------------------------------------------
-- SHRINES (core entity)
-- ------------------------------------------------------------
CREATE TABLE shrines (
    id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          text NOT NULL UNIQUE,          -- URL key for detail-page routing
    name_en       text NOT NULL,
    name_ja       text,
    prefecture_id smallint NOT NULL REFERENCES prefectures(id),
    region_id     smallint NOT NULL REFERENCES regions(id),  -- denormalized for cheap region filter
    city          text,
    address       text,
    lat           double precision,              -- WGS-84 latitude
    lng           double precision,              -- WGS-84 longitude
    image_urls    text[],                        -- array of external image URLs
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shrines_prefecture ON shrines(prefecture_id);
CREATE INDEX idx_shrines_region     ON shrines(region_id);

-- ------------------------------------------------------------
-- SHRINE ↔ DEITY (junction; carries shrine-specific deity data)
-- ------------------------------------------------------------
CREATE TABLE shrine_deities (
    shrine_id     uuid     NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    deity_id      uuid     NOT NULL REFERENCES deities(id),
    is_primary    boolean  NOT NULL DEFAULT false,
    sort_order    smallint NOT NULL DEFAULT 0,
    regional_lore text,                          -- shrine-specific lore; null = use deities.canonical_lore
    PRIMARY KEY (shrine_id, deity_id)
);

CREATE INDEX idx_shrine_deities_deity ON shrine_deities(deity_id);

-- ------------------------------------------------------------
-- SHRINE ↔ RANK (junction; all ranks as rows)
-- ------------------------------------------------------------
CREATE TABLE shrine_ranks (
    shrine_id uuid     NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    rank_id   smallint NOT NULL REFERENCES ranks(id),
    PRIMARY KEY (shrine_id, rank_id)
);
-- "Highest rank" = MIN(rank_order) joined to ranks at query time.

-- ------------------------------------------------------------
-- SHRINE ↔ PRAYER CATEGORY (junction; powers "strong for" filter)
-- ------------------------------------------------------------
CREATE TABLE shrine_prayer_categories (
    shrine_id   uuid     NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    category_id smallint NOT NULL REFERENCES prayer_categories(id),
    PRIMARY KEY (shrine_id, category_id)
);

CREATE INDEX idx_shrine_prayer_categories_cat ON shrine_prayer_categories(category_id);

-- ------------------------------------------------------------
-- SHRINE DETAILS (1:1 topical prose)
-- ------------------------------------------------------------
CREATE TABLE shrine_details (
    shrine_id         uuid    PRIMARY KEY REFERENCES shrines(id) ON DELETE CASCADE,
    history           text,    -- founding, legendary events, syncretic layers
    description       text,    -- significance + visitor experience (why visit)
    prayer_focus      text,    -- prayer purposes w/ JP terms
    best_time         text,    -- nature / atmosphere / timing
    quote             text,    -- short 1-2 sentence quote about the shrine
    geographic_notes  text     -- natural setting, landscape, terrain, access notes
);

-- ------------------------------------------------------------
-- SHRINE HIGHLIGHTS (1:N "don't miss" points of interest)
-- ------------------------------------------------------------
CREATE TABLE shrine_highlights (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    shrine_id   uuid    NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    title       text    NOT NULL,   -- English first, kanji in parens: 'Ōmigokoro Poem-Slips (大御心)'
    body        text,               -- optional short gloss; null = title-only chip
    sort_order  int     NOT NULL DEFAULT 0
);

CREATE INDEX idx_shrine_highlights_shrine ON shrine_highlights(shrine_id, sort_order);

-- ------------------------------------------------------------
-- FESTIVALS (definition + optional dated occurrence)
-- ------------------------------------------------------------
CREATE TABLE festivals (
    id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    shrine_id     uuid    NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    name_en       text NOT NULL,
    name_ja       text,
    time_prose    text,            -- display label: 'dawn, 2nd Sunday of May', lunar...
    start_date    date,            -- structured start date; null if undated
    end_date      date,            -- structured end date; null if undated
    origin        text,
    meaning       text,
    ritual        text,
    prayer        text,
    festival_type text CHECK (festival_type IN ('spectacle','pilgrimage')),
    visitor_notes text,
    sort_order    int     NOT NULL DEFAULT 0,
    UNIQUE (shrine_id, name_en)  -- stable identity: re-importing a shrine upserts festivals by name
                                 -- (preserves festival_occurrences instead of cascade-deleting them)
);

CREATE INDEX idx_festivals_shrine ON festivals(shrine_id, sort_order);

-- ------------------------------------------------------------
-- SOURCES (provenance)
-- ------------------------------------------------------------
CREATE TABLE sources (
    id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    shrine_id uuid    NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    url       text NOT NULL,
    title     text
);

CREATE INDEX idx_sources_shrine ON sources(shrine_id);

-- ------------------------------------------------------------
-- FESTIVAL OCCURRENCES (yearly exact dates)
-- ------------------------------------------------------------
CREATE TABLE festival_occurrences (
    id          uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id uuid     NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    year        smallint NOT NULL,
    start_date  date     NOT NULL,
    end_date    date,
    notes       text,
    UNIQUE (festival_id, year)
);

CREATE INDEX idx_festival_occurrences_festival ON festival_occurrences(festival_id);
CREATE INDEX idx_festival_occurrences_year     ON festival_occurrences(year);

-- ------------------------------------------------------------
-- USER COLLECTIONS (per-account favorites + goshuin stamp book)
-- ------------------------------------------------------------
-- One row per (user_id, shrine_id). saved_at non-null => favorited ("want to
-- visit"); stamped_at non-null => goshuin collected ("visited"). A row whose
-- two timestamps are both null is meaningless and is deleted by the mutations.
-- user_id is the Neon Auth user id (neon_auth."user".id, a text id); there is no
-- cross-schema FK to it (Neon Auth owns that table). This table is per-user data
-- and lives OUTSIDE the cached global Store — see DATA_MODEL.md.
CREATE TABLE user_shrine_marks (
    user_id    text        NOT NULL,                                  -- neon_auth."user".id
    shrine_id  uuid        NOT NULL REFERENCES shrines(id) ON DELETE CASCADE,
    saved_at   timestamptz,                                           -- non-null => favorited
    stamped_at timestamptz,                                           -- non-null => goshuin collected
    PRIMARY KEY (user_id, shrine_id)
);

CREATE INDEX idx_user_shrine_marks_user ON user_shrine_marks(user_id);

-- ------------------------------------------------------------
-- USER PROFILE (per-account preferences)
-- ------------------------------------------------------------
-- One row per signed-in account holding profile preferences (currently the chosen
-- kamon crest / avatar). user_id is the Neon Auth user id (neon_auth."user".id); no
-- cross-schema FK (Neon Auth owns that table). Per-user data that lives OUTSIDE the
-- cached global Store — read fresh per request (userRepo), written via userMutations.
CREATE TABLE user_profile (
    user_id text PRIMARY KEY,                                           -- neon_auth."user".id
    crest   text NOT NULL DEFAULT 'tomoe'
);

-- ------------------------------------------------------------
-- AUTHORIZATION
-- ------------------------------------------------------------
-- There is no application-level auth table. Admin authorization is the Neon Auth
-- user role: neon_auth.user.role === 'admin' (the Better Auth admin plugin field),
-- read off the session. See DATA_MODEL.md §7 and ACCOUNTS.md.
