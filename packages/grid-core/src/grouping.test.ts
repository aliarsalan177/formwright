import { describe, expect, it } from "vitest";
import { Grid } from "./index.js";
import type { GridSchema, Row } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "sales",
  groupBy: ["region"],
  columns: [
    { field: "region" },
    { field: "rep" },
    { field: "amount", type: "number", aggFunc: "sum" },
    { field: "deals", type: "number", aggFunc: "count" },
  ],
};

const rows: Row[] = [
  { id: "1", region: "West", rep: "Ava", amount: 100, deals: 1 },
  { id: "2", region: "West", rep: "Liam", amount: 200, deals: 1 },
  { id: "3", region: "East", rep: "Noah", amount: 50, deals: 1 },
];

const kinds = (g: Grid) => g.displayRows.get().map((r) => r.kind);

describe("grouping + aggregation", () => {
  it("builds group rows with aggregates and leaf rows underneath", () => {
    const g = new Grid(schema, rows);
    const list = g.displayRows.get();
    // Two groups (West, East), expanded → group + its leaves.
    const groups = list.filter((r) => r.kind === "group");
    expect(groups).toHaveLength(2);
    const west = groups.find((r) => r.kind === "group" && r.value === "West")!;
    expect(west.kind === "group" && west.count).toBe(2);
    expect(west.kind === "group" && west.aggregates.amount).toBe(300); // 100 + 200
    expect(west.kind === "group" && west.aggregates.deals).toBe(2); // count
    expect(kinds(g)).toEqual(["group", "leaf", "leaf", "group", "leaf"]);
  });

  it("collapsing a group hides its leaves", () => {
    const g = new Grid(schema, rows);
    const west = g.displayRows.get().find((r) => r.kind === "group" && r.value === "West")!;
    g.toggleGroup((west as { key: string }).key);
    expect(kinds(g)).toEqual(["group", "group", "leaf"]); // West collapsed
    expect(g.isGroupExpanded((west as { key: string }).key)).toBe(false);
  });

  it("computes grand totals across the whole view", () => {
    const g = new Grid(schema, rows);
    expect(g.grandTotals().amount).toBe(350);
    expect(g.grandTotals().deals).toBe(3);
  });

  it("nested grouping flattens depth-first", () => {
    const g = new Grid({ ...schema, groupBy: ["region", "rep"] }, rows);
    // West → Ava (leaf), Liam (leaf); East → Noah (leaf)
    const list = g.displayRows.get();
    expect(list.filter((r) => r.kind === "group")).toHaveLength(2 + 3); // 2 regions + 3 reps
  });
});
