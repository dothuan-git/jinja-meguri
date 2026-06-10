import { describe, it, expect } from "vitest";
import { buildStore } from "@/lib/db/store";

describe("buildStore", () => {
  it("defaults missing tables to empty arrays", () => {
    const s = buildStore({ shrines: [{ id: 1 }] });
    expect(s.shrines).toHaveLength(1);
    expect(s.festivals).toEqual([]);
  });
});
