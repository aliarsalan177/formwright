import { describe, expect, it } from "vitest";
import { Grid } from "./index.js";
import type { GridSchema, Row } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "g",
  columns: [
    { field: "a", width: 100 },
    { field: "b", width: 150, minWidth: 80 },
    { field: "c", width: 120 },
  ],
};
const rows: Row[] = [{ id: "1", a: 1, b: 2, c: 3 }];

const fields = (g: Grid) => g.orderedColumns.get().map((c) => c.field);

describe("column model", () => {
  it("resize clamps to minWidth and updates total", () => {
    const g = new Grid(schema, rows);
    expect(g.totalColumnsWidth()).toBe(370);
    g.setColumnWidth("b", 200);
    expect(g.columnWidth("b")).toBe(200);
    g.setColumnWidth("b", 10); // below minWidth 80
    expect(g.columnWidth("b")).toBe(80);
  });

  it("reorder moves a field to a new index", () => {
    const g = new Grid(schema, rows);
    expect(fields(g)).toEqual(["a", "b", "c"]);
    g.moveColumn("c", 0);
    expect(fields(g)).toEqual(["c", "a", "b"]);
  });

  it("hiding a column drops it from orderedColumns", () => {
    const g = new Grid(schema, rows);
    g.setColumnHidden("b", true);
    expect(fields(g)).toEqual(["a", "c"]);
    g.setColumnHidden("b", false);
    expect(fields(g)).toEqual(["a", "b", "c"]);
  });

  it("pinning reorders into left / center / right and computes sticky offsets", () => {
    const g = new Grid(schema, rows);
    g.setColumnPin("c", "left");
    g.setColumnPin("a", "right");
    expect(fields(g)).toEqual(["c", "b", "a"]); // left, center, right
    expect(g.pinnedOffset("c")).toBe(0);
    expect(g.pinnedOffset("a")).toBe(0); // only right-pinned column
    // pin b left too — left group keeps field order (b before c)
    g.setColumnPin("b", "left");
    expect(fields(g)).toEqual(["b", "c", "a"]);
    expect(g.pinnedOffset("b")).toBe(0);
    expect(g.pinnedOffset("c")).toBe(g.columnWidth("b")); // after b
  });
});
