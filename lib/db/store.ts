import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Store } from "@/lib/types";

const TABLES: (keyof Store)[] = [
  "regions",
  "prefectures",
  "ranks",
  "prayer_categories",
  "deities",
  "shrines",
  "shrine_deities",
  "shrine_ranks",
  "shrine_prayer_categories",
  "shrine_details",
  "events",
  "event_deities",
  "event_occurrences",
  "sources",
  "shrine_search",
];

export function buildStore(raw: Record<string, unknown[]>): Store {
  const store = {} as Store;
  const target = store as unknown as Record<string, unknown[]>;
  for (const t of TABLES) target[t] = raw[t] ?? [];
  return store;
}

let cached: Store | null = null;

export function loadStore(): Store {
  if (cached) return cached;
  const dbDir = path.join(process.cwd(), "db");
  const raw: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const fp = path.join(dbDir, `${t}.json`);
    raw[t] = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf-8")) : [];
  }
  cached = buildStore(raw);
  return cached;
}
