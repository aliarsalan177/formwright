import { describe, expect, it } from "vitest";
import { Grid } from "./index.js";
import type { GridSchema, Row } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "g",
  columns: [{ field: "id" }, { field: "name" }, { field: "qty", type: "number" }],
};
const rows: Row[] = [
  { id: "1", name: "A", qty: 1 },
  { id: "2", name: "B", qty: 2 },
];

describe("stateless subscriptions", () => {
  it("subscribe pushes current rows immediately and on any cell change", () => {
    const g = new Grid(schema, rows);
    const seen: number[] = [];
    const off = g.subscribe((data) => seen.push(data.length));
    expect(seen).toEqual([2]); // immediate
    g.updateCell("1", "qty", 99);
    expect(seen).toEqual([2, 2]); // fired again with latest
    expect(g.getData().find((r) => r.id === "1")?.qty).toBe(99);
    off();
    g.addRow({ id: "3", name: "C", qty: 3 });
    expect(seen).toEqual([2, 2]); // unsubscribed
  });

  it("onSelectionChange pushes selected rows", () => {
    const g = new Grid(schema, rows, { selection: "multi" });
    const seen: string[][] = [];
    g.onSelectionChange((sel) => seen.push(sel.map((r) => String(r.id))));
    expect(seen).toEqual([[]]); // immediate, nothing selected
    g.toggleSelect("2");
    expect(seen[seen.length - 1]).toEqual(["2"]);
  });

  it("onStateChange fires on sort / filter / page", () => {
    const g = new Grid(schema, rows, { pagination: { pageSize: 1 } });
    let n = 0;
    g.onStateChange(() => n++);
    expect(n).toBe(1); // immediate
    g.toggleSort("qty");
    g.setQuickFilter("a");
    expect(n).toBeGreaterThan(1);
  });
});
