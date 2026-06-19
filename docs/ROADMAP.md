# Roadmap / deferred features

Planned work not yet implemented. Ask Claude to "implement <feature> from docs/ROADMAP.md".

---

## Festival occurrences: importer + date resolution — ✅ DONE

Implemented. Details in `DATA_MODEL.md` (§ `festivals` / `festival_occurrences` and §10). Summary:

- **Importer** (was at `/admin/occurrences/new`, JSON paste + structured form) — **the UI and its
  `saveOccurrencesAction` were since removed in the admin-route cleanup.** The data layer is retained:
  contract `lib/admin/occurrenceContract.ts`, mutation `upsertOccurrences` (`lib/db/mutations.ts`, upsert
  on `(festival_id, year)`), example `docs/ai-research/example-festival-occurrences.json`. A replacement
  uploader is now a deferred item (occurrences are seeded via the DB scripts / a direct `upsertOccurrences`
  call in the meantime).
- **Stable festival identity:** festivals are UNIQUE on `(shrine_id, name_en)` and `upsertShrine` upserts
  them by name instead of delete+reinsert, so occurrences survive shrine re-imports/inline edits.
- **Date resolution** (`resolveCalendarDates` in `lib/calendar.ts`, calendar only): current-year
  occurrence wins, else the default month-day is projected onto the current year, else `is_fallback`.
  This intentionally **diverges from the original sketch** below — there is no previous-year-occurrence
  fallback (simpler and keeps every shown date in the current year so the day grid pins it).

---

## Admin image upload & editor

**Why:** The inline shrine editor currently only stores images as pasted URL strings in
`image_urls[]`. Admins cannot upload files, reorder images, or remove stale URLs interactively.

### Feature scope

- **Upload:** File `<input>` or drag-and-drop zone in the inline editor. Accepted formats: JPEG,
  WebP, PNG. Files upload to object storage (Supabase Storage or S3-compatible); the resulting
  public URL is appended to `draft.image_urls`.
- **Reorder:** Current `image_urls` displayed as draggable thumbnail chips. First item = cover
  image (shown in listing cards and detail header). Drag to reorder; cover position visually
  distinguished.
- **Remove:** Each chip has an × button that splices the URL from the array.
- **Integration point:** New `EditableImages` component in `components/shrineEdit/` wrapping the
  existing image section, wiring into `edit.setValue("image_urls", [...])`. The mutation already
  persists the full array — no schema changes needed.
- **Storage action:** Upload server action in `app/admin/actions.ts` alongside `saveShrineAction`.
