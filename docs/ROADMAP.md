# Roadmap / deferred features

Planned work not yet implemented. Ask Claude to "implement <feature> from docs/ROADMAP.md".

---

## Festival occurrences: importer + date resolution

**Why:** Festival `start_date`/`end_date` are intentionally left `null` at shrine-research time
(see `DATA_MODEL.md` §10, "Authoring order & deferred fields"). Concrete per-year dates are meant to
be added separately each year into the `festival_occurrences` table. Two pieces are still missing.

### 1. `festival_occurrences` importer (admin)
A way to upload yearly festival dates the same way shrines/deities are imported (JSON paste / form),
so dates don't have to be edited row-by-row.

- New admin page under `/admin` (e.g. `/admin/occurrences` or a tab on the festival/shrine editor).
- Input identifies the target festival — likely `shrine_slug` + `festival_name_en` (or a festival id),
  plus an array of `{ year, start_date, end_date?, notes? }`.
- Reuse the existing pipeline: Zod contract (new schema in `lib/admin/`), key-completeness check
  (`lib/admin/keyCompleteness.ts` already has an `occurrence` key set), and a transactional upsert in
  `lib/db/mutations.ts` (upsert on the `(festival_id, year)` UNIQUE constraint — insert or update).
- Add a research/instructions prompt + example under `docs/ai-research/` if useful.
- Keep `DATA_MODEL.md` §10 in sync.

### 2. Effective festival date resolution (read path)
- **Current** (`lib/calendar.ts`, `entriesForMonth`): for the *queried* year, an occurrence's dates win
  over the festival's own `start_date`/`end_date`; `is_fallback` when neither exists.
- **Intended:** a festival's effective display dates resolve from the **latest** `festival_occurrences`
  row, **falling back to the previous year's** occurrence when the current year is skipped (i.e. if I
  forget to upload a given year's dates, the festival keeps showing the most recent known dates).
- Touch points: `lib/calendar.ts` and the repo view-model builders in `lib/db/repo.ts`
  (`getFestivalYear` / shrine-detail festival assembly). Add unit tests in `lib/calendar.test.ts` and
  `lib/db/repo.test.ts` covering: current-year present, current-year missing → previous-year fallback,
  no occurrences at all → `is_fallback`.

**Note:** the `festivals.start_date`/`end_date` columns and their Zod contract fields stay — they remain
valid on import even though the shrine research flow no longer gathers them.
