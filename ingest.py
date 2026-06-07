#!/usr/bin/env python3
"""Shinto shrine ingest — local JSON backend.

Loads contract-shaped shrine JSON (see docs/shrine_ingest_contract.jsonc) into a
local "database" of 14 normalized JSON files under ./db (one file per table),
seeded first by seed_catalogs.py. Stdlib only — no external dependencies.

This is a deliberately swappable design: the same contract, validation, and
normalized row shapes a Postgres sink would use. To move to Supabase later,
replace the read/write-store layer; the validation and row-building logic stay.

Usage:
    python ingest.py path/to/shrine.json [more.json ...]
    python ingest.py path/to/dir/        # every *.json in the directory
    python ingest.py --refresh-only      # just regenerate db/shrine_search.json
    python ingest.py --db PATH ...       # point at a different db dir (default ./db)

Each shrine is applied atomically: on validation failure or an unmatched deity,
that shrine is rolled back (the in-memory store is restored) and skipped; the
batch continues. The store is written to disk once after the batch, then
shrine_search.json is regenerated (the REFRESH MATERIALIZED VIEW analog).
"""
import argparse
import copy
import json
import sys
from pathlib import Path

# ---- enums (mirror the schema CHECK constraints / contract) -----------------
DEITY_TYPES = {"origin", "deified human", "syncretic", "imported"}
ACCESS_TYPES = {"public_witness", "pilgrimage_experience"}
SOURCE_TYPES = {"official", "wikipedia_ja", "tourism", "academic"}
MAX_PILGRIMAGE_EVENTS = 2

CATALOG_TABLES = ["regions", "prefectures", "ranks", "prayer_categories"]
DATA_TABLES = [
    "deities", "shrines", "shrine_details", "shrine_deities", "shrine_ranks",
    "shrine_prayer_categories", "events", "event_deities", "event_occurrences",
    "sources",
]
ALL_TABLES = CATALOG_TABLES + DATA_TABLES
# Tables that carry their own surrogate id (max+1 on insert).
ID_TABLES = {
    "regions", "prefectures", "ranks", "prayer_categories",
    "deities", "shrines", "events", "event_occurrences", "sources",
}


class ShrineSkip(Exception):
    """Raised to abort a single shrine with a human-readable reason."""


# ---------------------------------------------------------------------------
# JSON store (read/write layer — the only Postgres-specific seam)
# ---------------------------------------------------------------------------
def load_store(db: Path) -> dict:
    if not (db / "regions.json").exists():
        sys.exit(f"ERROR: {db}/ not seeded. Run: python seed_catalogs.py --db {db}")
    store = {}
    for table in ALL_TABLES:
        fp = db / f"{table}.json"
        store[table] = json.loads(fp.read_text(encoding="utf-8")) if fp.exists() else []
    return store


def save_store(db: Path, store: dict) -> None:
    for table in ALL_TABLES:
        (db / f"{table}.json").write_text(
            json.dumps(store[table], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def next_id(store: dict, table: str) -> int:
    return max((row["id"] for row in store[table]), default=0) + 1


def load_catalogs(store: dict) -> dict:
    return {
        "ranks": {r["code"]: r["id"] for r in store["ranks"]},
        "categories": {r["code"]: r["id"] for r in store["prayer_categories"]},
        "regions": {r["name_en"]: r["id"] for r in store["regions"]},
        "prefectures": {r["name_en"]: (r["id"], r["region_id"]) for r in store["prefectures"]},
    }


# ---------------------------------------------------------------------------
# Validation (unchanged rules from the contract)
# ---------------------------------------------------------------------------
def validate_shrine(data: dict, catalogs: dict) -> list[str]:
    errors: list[str] = []

    def req(field: str, value) -> None:
        if value is None or (isinstance(value, str) and not value.strip()):
            errors.append(f"missing required field '{field}'")

    req("slug", data.get("slug"))
    req("name_en", data.get("name_en"))
    req("region", data.get("region"))
    req("prefecture", data.get("prefecture"))

    coords = data.get("coordinates") or {}
    if coords.get("lat") is None:
        errors.append("missing required field 'coordinates.lat'")
    if coords.get("lng") is None:
        errors.append("missing required field 'coordinates.lng'")

    deities = data.get("deities") or []
    if not deities:
        errors.append("at least one deity is required")
    if not any(d.get("is_primary") for d in deities):
        errors.append("at least one deity must have is_primary: true")
    for i, d in enumerate(deities):
        if not (d.get("name_kanji") or "").strip():
            errors.append(f"deity[{i}] missing required 'name_kanji'")
        if not (d.get("name_romaji") or "").strip():
            errors.append(f"deity[{i}] missing required 'name_romaji'")
        canon = d.get("canonical")
        if canon is not None and canon.get("deity_type") not in DEITY_TYPES:
            errors.append(
                f"deity[{i}] canonical.deity_type '{canon.get('deity_type')}' "
                f"not in {sorted(DEITY_TYPES)}"
            )

    for code in data.get("ranks") or []:
        if code not in catalogs["ranks"]:
            errors.append(f"unknown rank code '{code}'")
    for code in data.get("prayer_categories") or []:
        if code not in catalogs["categories"]:
            errors.append(f"unknown prayer_category code '{code}'")
    if data.get("region") and data["region"] not in catalogs["regions"]:
        errors.append(f"unknown region '{data['region']}'")
    if data.get("prefecture") and data["prefecture"] not in catalogs["prefectures"]:
        errors.append(f"unknown prefecture '{data['prefecture']}'")

    pilgrimage = 0
    for j, ev in enumerate(data.get("events") or []):
        at = ev.get("access_type")
        if at is not None and at not in ACCESS_TYPES:
            errors.append(f"event[{j}] access_type '{at}' not in {sorted(ACCESS_TYPES)}")
        if at == "pilgrimage_experience":
            pilgrimage += 1
        for k, occ in enumerate(ev.get("occurrences") or []):
            sd, ed = occ.get("start_date"), occ.get("end_date")
            if not sd or not ed:
                errors.append(f"event[{j}] occurrence[{k}] missing start_date/end_date")
            elif ed < sd:  # ISO yyyy-mm-dd compares lexicographically
                errors.append(f"event[{j}] occurrence[{k}] end_date {ed} < start_date {sd}")
    if pilgrimage > MAX_PILGRIMAGE_EVENTS:
        errors.append(
            f"{pilgrimage} events flagged pilgrimage_experience (max {MAX_PILGRIMAGE_EVENTS})"
        )

    for n, src in enumerate(data.get("sources") or []):
        st = src.get("source_type")
        if st is not None and st not in SOURCE_TYPES:
            errors.append(f"source[{n}] source_type '{st}' not in {sorted(SOURCE_TYPES)}")
        if not (src.get("url") or "").strip():
            errors.append(f"source[{n}] missing required 'url'")

    return errors


# ---------------------------------------------------------------------------
# Deity resolution (dedup on name_kanji; global/canonical, never per-shrine)
# ---------------------------------------------------------------------------
def resolve_deity(store: dict, entry: dict) -> int:
    name_kanji = entry["name_kanji"]
    for d in store["deities"]:
        if d["name_kanji"] == name_kanji:
            return d["id"]  # existing canonical kami; ignore any canonical{} block

    canon = entry.get("canonical")
    if not canon:
        raise ShrineSkip(
            f"unmatched deity '{entry.get('name_romaji')}' ({name_kanji}) - not in DB "
            f"and no canonical block in any input file. Add canonical lore to the JSON, "
            f"then re-run. (unmatched-deity pause point)"
        )

    new_id = next_id(store, "deities")
    store["deities"].append({
        "id": new_id,
        "name_romaji": entry["name_romaji"],
        "name_kanji": name_kanji,
        "domain": canon.get("domain"),
        "title": canon.get("title"),
        "deity_type": canon["deity_type"],
        "canonical_lore": canon.get("canonical_lore"),
    })
    return new_id


def preload_deities(store: dict, datas: list[dict]) -> int:
    """Insert every canonical-bearing deity across the whole batch up front, so a
    shrine that references a kami introduced in a *different* file resolves
    regardless of filename order. Existing kami (matched on name_kanji) are left
    untouched. Returns the number of new deities inserted."""
    before = len(store["deities"])
    for data in datas:
        entries = list(data.get("deities") or [])
        for ev in data.get("events") or []:
            entries += ev.get("deities") or []
        for e in entries:
            if e.get("name_kanji") and e.get("canonical"):
                resolve_deity(store, e)  # inserts if new, else returns existing id
    return len(store["deities"]) - before


# ---------------------------------------------------------------------------
# Idempotency: delete an existing shrine and all its child rows (cascade)
# ---------------------------------------------------------------------------
def delete_shrine_cascade(store: dict, shrine_id: int) -> None:
    event_ids = {e["id"] for e in store["events"] if e["shrine_id"] == shrine_id}
    store["event_deities"] = [r for r in store["event_deities"] if r["event_id"] not in event_ids]
    store["event_occurrences"] = [r for r in store["event_occurrences"] if r["shrine_id"] != shrine_id]
    store["events"] = [e for e in store["events"] if e["shrine_id"] != shrine_id]
    for t in ("shrine_details", "shrine_deities", "shrine_ranks",
              "shrine_prayer_categories", "sources"):
        store[t] = [r for r in store[t] if r["shrine_id"] != shrine_id]
    store["shrines"] = [s for s in store["shrines"] if s["id"] != shrine_id]
    # deities are global — never deleted here.


# ---------------------------------------------------------------------------
# Per-shrine ingest
# ---------------------------------------------------------------------------
def ingest_shrine(store: dict, data: dict, catalogs: dict) -> dict:
    slug = data["slug"]
    counts = {"ranks": 0, "cats": 0, "deities": 0, "events": 0, "occ": 0, "sources": 0}

    existing = next((s for s in store["shrines"] if s["slug"] == slug), None)
    if existing:
        delete_shrine_cascade(store, existing["id"])

    # Deities first; build name_kanji -> id map for junction rows.
    deity_ids: dict[str, int] = {}
    for entry in data["deities"]:
        deity_ids[entry["name_kanji"]] = resolve_deity(store, entry)

    pref_id, pref_region_id = catalogs["prefectures"][data["prefecture"]]
    region_id = catalogs["regions"][data["region"]]
    if pref_region_id != region_id:
        print(
            f"  WARN {slug}: stated region '{data['region']}' != prefecture "
            f"'{data['prefecture']}' region; using stated region.",
            file=sys.stderr,
        )

    coords = data["coordinates"]
    shrine_id = next_id(store, "shrines")
    store["shrines"].append({
        "id": shrine_id,
        "slug": slug,
        "name_en": data["name_en"],
        "name_ja": data.get("name_ja"),
        "prefecture_id": pref_id,
        "region_id": region_id,
        "city": data.get("city"),
        "address": data.get("address"),
        # JSON representation of the geography(Point,4326) column. A Postgres sink
        # would convert this to ST_MakePoint(lng, lat)::geography.
        "coordinates": {"lat": coords["lat"], "lng": coords["lng"]},
        "notes": data.get("notes"),
    })

    details = data.get("details") or {}
    store["shrine_details"].append({
        "shrine_id": shrine_id,
        "history": details.get("history"),
        "why_visit": details.get("why_visit"),
        "prayer_focus": details.get("prayer_focus"),
        "best_season": details.get("best_season"),
    })

    for code in data.get("ranks") or []:
        store["shrine_ranks"].append({"shrine_id": shrine_id, "rank_id": catalogs["ranks"][code]})
        counts["ranks"] += 1

    for code in data.get("prayer_categories") or []:
        store["shrine_prayer_categories"].append(
            {"shrine_id": shrine_id, "category_id": catalogs["categories"][code]}
        )
        counts["cats"] += 1

    for sort_default, entry in enumerate(data["deities"], start=1):
        store["shrine_deities"].append({
            "shrine_id": shrine_id,
            "deity_id": deity_ids[entry["name_kanji"]],
            "is_primary": bool(entry.get("is_primary", False)),
            "sort_order": entry.get("sort_order", sort_default),
            "role": entry.get("role"),
            "regional_lore": entry.get("regional_lore"),
        })
        counts["deities"] += 1

    for ev in data.get("events") or []:
        event_id = next_id(store, "events")
        store["events"].append({
            "id": event_id,
            "shrine_id": shrine_id,
            "name_en": ev["name_en"],
            "name_ja": ev.get("name_ja"),
            "time_prose": ev.get("time_prose"),
            "origin": ev.get("origin"),
            "meaning": ev.get("meaning"),
            "ritual": ev.get("ritual"),
            "prayer": ev.get("prayer"),
            "access_type": ev.get("access_type"),
            "visitor_notes": ev.get("visitor_notes"),
        })
        counts["events"] += 1

        for ed in ev.get("deities") or []:
            kanji = ed["name_kanji"]
            did = deity_ids.get(kanji)
            if did is None:
                did = resolve_deity(store, ed)  # event-only deity (needs canonical)
                deity_ids[kanji] = did
            store["event_deities"].append({"event_id": event_id, "deity_id": did, "role": ed.get("role")})

        for occ in ev.get("occurrences") or []:
            store["event_occurrences"].append({
                "id": next_id(store, "event_occurrences"),
                "event_id": event_id,
                "shrine_id": shrine_id,
                "start_date": occ["start_date"],
                "end_date": occ["end_date"],
            })
            counts["occ"] += 1

    for src in data.get("sources") or []:
        store["sources"].append({
            "id": next_id(store, "sources"),
            "shrine_id": shrine_id,
            "url": src["url"],
            "title": src.get("title"),
            "source_type": src.get("source_type"),
            "note": src.get("note"),
        })
        counts["sources"] += 1

    return counts


# ---------------------------------------------------------------------------
# Derived search index (analog of the shrine_search materialized view)
# ---------------------------------------------------------------------------
def build_search(store: dict) -> list[dict]:
    deity_by_id = {d["id"]: d for d in store["deities"]}
    cat_by_id = {c["id"]: c for c in store["prayer_categories"]}

    rows = []
    for s in store["shrines"]:
        sid = s["id"]
        deities = [deity_by_id[r["deity_id"]] for r in store["shrine_deities"] if r["shrine_id"] == sid]
        cats = [cat_by_id[r["category_id"]] for r in store["shrine_prayer_categories"] if r["shrine_id"] == sid]
        events = [e for e in store["events"] if e["shrine_id"] == sid]
        terms = [s.get("name_en"), s.get("name_ja"), s.get("city")]
        terms += [d.get("name_romaji") for d in deities]
        terms += [d.get("name_kanji") for d in deities]
        terms += [c.get("name_en") for c in cats]
        terms += [e.get("name_en") for e in events]
        terms += [e.get("name_ja") for e in events]
        rows.append({
            "shrine_id": sid,
            "slug": s["slug"],
            "name_en": s.get("name_en"),
            "name_ja": s.get("name_ja"),
            "city": s.get("city"),
            "search_blob": " ".join(t for t in terms if t),
        })
    return rows


def refresh_search(db: Path, store: dict) -> None:
    rows = build_search(store)
    (db / "shrine_search.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Refreshed db/shrine_search.json ({len(rows)} rows).")


# ---------------------------------------------------------------------------
# Batch driver
# ---------------------------------------------------------------------------
def collect_json_files(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            files.extend(sorted(path.glob("*.json")))
        elif path.is_file():
            files.append(path)
        else:
            print(f"WARN: path not found, skipping: {p}", file=sys.stderr)
    seen, unique = set(), []
    for f in files:
        rp = f.resolve()
        if rp not in seen:
            seen.add(rp)
            unique.append(f)
    return unique


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest contract-shaped shrine JSON into the local JSON store.")
    parser.add_argument("paths", nargs="*", help="JSON files or directories.")
    parser.add_argument("--db", default="db", help="JSON store directory (default: ./db)")
    parser.add_argument("--refresh-only", action="store_true",
                        help="Only regenerate db/shrine_search.json, then exit.")
    args = parser.parse_args()

    # Windows consoles default to cp1252 and crash on Japanese text; force UTF-8.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    db = Path(args.db)
    store = load_store(db)

    if args.refresh_only:
        refresh_search(db, store)
        return 0

    if not args.paths:
        parser.error("provide at least one JSON file/directory, or --refresh-only")

    files = collect_json_files(args.paths)
    if not files:
        print("No JSON files to ingest.")
        return 1

    catalogs = load_catalogs(store)
    skipped: list[tuple[str, str]] = []

    # Pass 1: parse + validate; keep the valid ones for ingest.
    valid: list[tuple[str, dict]] = []
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            skipped.append((f.name, f"invalid JSON: {e}"))
            print(f"[SKIP] {f.name}: invalid JSON: {e}", file=sys.stderr)
            continue

        slug = data.get("slug") or f.stem
        errs = validate_shrine(data, catalogs)
        if errs:
            reason = "; ".join(errs)
            skipped.append((slug, reason))
            print(f"[SKIP] {slug}: {reason}", file=sys.stderr)
            continue
        valid.append((slug, data))

    # Pass 2: insert all canonical-bearing deities first (order-independent refs).
    new_deities = preload_deities(store, [d for _, d in valid])
    if new_deities:
        print(f"Preloaded {new_deities} new canonical deity row(s).")

    # Pass 3: ingest each shrine atomically.
    ingested = 0
    for slug, data in valid:
        snapshot = copy.deepcopy(store)  # atomic per-shrine: restore on failure
        try:
            counts = ingest_shrine(store, data, catalogs)
        except ShrineSkip as e:
            store.clear(); store.update(snapshot)
            skipped.append((slug, str(e)))
            print(f"\n[STOP] {slug}: {e}\n", file=sys.stderr)
            continue
        except Exception as e:  # noqa: BLE001 — report & skip, keep batch alive
            store.clear(); store.update(snapshot)
            skipped.append((slug, f"{type(e).__name__}: {e}"))
            print(f"[SKIP] {slug}: {type(e).__name__}: {e}", file=sys.stderr)
            continue

        ingested += 1
        print(
            f"[OK] {slug}: shrine_details=1 ranks={counts['ranks']} cats={counts['cats']} "
            f"deities={counts['deities']} events={counts['events']} "
            f"occ={counts['occ']} sources={counts['sources']}"
        )

    if ingested:
        save_store(db, store)
        refresh_search(db, store)

    print(f"\nDone. Ingested {ingested} shrine(s); skipped {len(skipped)}.")
    if skipped:
        print("Skipped:")
        for slug, reason in skipped:
            print(f"  - {slug}: {reason}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
