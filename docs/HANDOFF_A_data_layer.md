# Handoff A — Data Layer

> **Goal:** a fully provisioned Supabase (PostgreSQL + PostGIS) database with all catalogs seeded, a standalone Python ingest script, and the existing shrines migrated in.
> **Definition of done:** `schema.sql` + `seed.sql` applied; `ingest.py` ingests a contract-shaped JSON file end-to-end and is re-runnable without duplicating; the ~10 legacy shrines are migrated and present; `shrine_search` is refreshed.

This is the **first** handoff. Do it before Handoff B — the frontend renders nothing useful against an empty database.

---

## Files in this bundle
| File | Role |
|------|------|
| `schema.sql` | Base DDL (14 tables + 1 view + 1 materialized view + indexes). **Apply first.** |
| `seed.sql` | Catalog seed data + 2 column additions (`ranks.description`, `prayer_categories.group_label`). **Apply second.** |
| `shrine_ingest_contract.jsonc` | The per-shrine JSON shape the ingest script consumes. Annotated reference. |
| `PROJECT_BRIEF.md` | Background / locked design decisions. Context only. |

---

## Prerequisites
1. A Supabase project (free tier is fine). Enable the `postgis` and `pg_trgm` extensions — `schema.sql` does this via `CREATE EXTENSION IF NOT EXISTS`.
2. A `DATABASE_URL` for the ingest script. **Use the Session pooler URI** from the Supabase dashboard (Connect → Session pooler), not the Direct connection (which is IPv6-only and often unreachable) and not the Transaction pooler (PgBouncer transaction mode breaks multi-statement transactions and prepared statements, which the ingest relies on). Provide it via a `.env` file or environment variable — never hardcode it.

---

## Task 1 — Apply schema + seed
Run `schema.sql`, then `seed.sql`, against the database (Supabase SQL Editor, or `psql "$DATABASE_URL" -f schema.sql` etc.).

**Acceptance:** after seeding, row counts are `regions`=8, `prefectures`=47, `ranks`=17, `prayer_categories`=25. Both `seed.sql` `ALTER` statements use `IF NOT EXISTS`, so the file is safe to re-run.

---

## Task 2 — Build `ingest.py` (single standalone file)
A **single self-contained Python file** with no coupling to any larger project (the owner may delete it after the data is loaded). Use `psycopg` (v3) and stdlib only (`json`, `argparse`, `pathlib`, `os`). Read `DATABASE_URL` from the environment.

### CLI
```
python ingest.py path/to/shrine.json [more.json ...]
python ingest.py path/to/dir/        # ingest every *.json in a directory
python ingest.py --refresh-only      # just REFRESH MATERIALIZED VIEW shrine_search
```
Input files are **plain `.json`** (the `.jsonc` in this bundle is only the annotated template; real data carries no comments).

### Per-shrine ingest order (each shrine wrapped in ONE transaction)
1. **Validate** the JSON against the rules below. On any failure, print a clear message naming the shrine + field and **skip that shrine** (do not partially write it). This is the validation-failure human pause point.
2. **Idempotent re-ingest by slug:** if a shrine with this `slug` already exists, `DELETE FROM shrines WHERE slug = ...` first. The `ON DELETE CASCADE` FKs clear `shrine_details`, `shrine_deities`, `shrine_ranks`, `shrine_prayer_categories`, `events`, `event_deities`, `event_occurrences`, and `sources` automatically. Then re-insert fresh. **Never delete `deities`** — they are global/canonical.
3. **Deities** (do this before inserting the shrine so junction rows can reference deity ids):
   - For each entry, look up `deities` by `name_kanji` (the dedup key).
   - **Found** → use the existing `id`; ignore any `canonical{}` block (canonical lore is authored once, never overwritten per-shrine).
   - **Not found + `canonical{}` present** → `INSERT` a new deity from the canonical block, return its `id`.
   - **Not found + no `canonical{}`** → STOP and prompt the operator (unmatched-deity pause point). Do not invent a deity.
4. **`shrines`**: resolve `prefecture` (name → `prefecture_id`) and `region` (name → `region_id`); warn if the prefecture's region disagrees with the stated region. Build the point as `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` from `coordinates`. Insert and capture `shrine_id`.
5. **`shrine_details`**: insert the `details{}` block (1:1).
6. **`shrine_ranks`**: resolve each `ranks[]` code → `ranks.id`; insert junction rows. Missing code → abort shrine with a clear message.
7. **`shrine_prayer_categories`**: resolve each `prayer_categories[]` code → id; insert junction rows. Missing code → abort with message.
8. **`shrine_deities`**: insert junction rows with `is_primary`, `sort_order`, `role`, `regional_lore`, using the deity ids from step 3.
9. **`events`** + **`event_deities`** + **`event_occurrences`**: for each event, insert the event row, then its `deities[]` (resolve by `name_kanji`), then its `occurrences[]` (may be empty — that is valid for lunar / Nth-weekday festivals awaiting the January upload).
10. **`sources`**: insert all rows.
11. Commit the transaction.

### After the batch
Run `REFRESH MATERIALIZED VIEW shrine_search;` once, after all shrines are ingested.

### Validation rules (enforce in step 1)
- **Required:** `slug`, `name_en`, `region`, `prefecture`, `coordinates.lat`, `coordinates.lng`, ≥1 deity, ≥1 deity with `is_primary: true`.
- **Unique:** `slug` (handled by the delete-then-insert idempotency).
- **Enums:** `deity_type ∈ {origin, deified human, syncretic, imported}`; `access_type ∈ {public_witness, pilgrimage_experience}`; `source_type ∈ {official, wikipedia_ja, tourism, academic}`.
- **Catalog match:** every `ranks[]` and `prayer_categories[]` code exists; `region`/`prefecture` names exist.
- **Dates:** every occurrence `end_date >= start_date`.
- **Limits:** at most **2** events with `access_type: "pilgrimage_experience"` per shrine.

### Output / logging
Per shrine, print a one-line summary (slug + row counts per table). At the end, print totals and any skipped shrines with reasons. Make unmatched-deity and validation failures impossible to miss.

**Acceptance:** ingesting the same file twice yields identical row counts (no duplicates); a file with a bad enum or missing catalog code is skipped with a clear message and leaves the DB unchanged.

---

## Task 3 — Migrate the ~10 legacy shrines
The owner will supply the legacy static-format shrine files (place them in `./legacy_data/`). For each:
1. Transform the old structure into the contract shape (`shrine_ingest_contract.jsonc`) — one `.json` per shrine. Map old fields to the new arrays (`ranks[]`, `prayer_categories[]`, `deities[]` with `regional_lore`, `events[]` + `occurrences[]`, `sources[]`).
2. Where the old data lacks a field the contract requires (e.g. `coordinates`, rank codes), flag it for the owner rather than guessing.
3. Run all transformed files through `ingest.py`.

**Acceptance:** the legacy shrines appear in `shrines` with populated details, deities (linked via `shrine_deities`), ranks, categories, events, and sources; `shrine_search` returns them.

---

## Optional Task 4 — Keep-alive (recommended)
The Supabase free tier pauses a project after **7 days of inactivity** (≈30s cold start to wake). Add a tiny GitHub Actions workflow that hits a ping (`SELECT 1` against a dedicated table, or a Supabase REST call) on a `cron: '0 0 * * 0,5'` schedule (twice weekly). This is independent of the app and costs nothing.

---

## Hand-off checklist
- [ ] `schema.sql` + `seed.sql` applied; catalog counts verified (8 / 47 / 17 / 25)
- [ ] `ingest.py` builds, ingests, and is idempotent
- [ ] ~10 legacy shrines migrated and present
- [ ] `shrine_search` refreshed
- [ ] (optional) keep-alive cron live
