import { describe, expect, it, vi } from "vitest";
import { effect } from "@formwright/reactive";
import { Grid } from "./index.js";
import type { GridSchema, Row } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "people",
  rowHeight: 40,
  columns: [{ field: "id" }, { field: "name", type: "text" }, { field: "age", type: "number" }],
};

const rows: Row[] = [
  { id: "1", name: "Carol", age: 30 },
  { id: "2", name: "Alice", age: 25 },
  { id: "3", name: "Bob", age: 40 },
];

describe("Grid column resolution", () => {
  it("resolves headers, alignment, and defaults from type", () => {
    const g = new Grid(schema, rows);
    const age = g.columns.find((c) => c.field === "age")!;
    expect(age.header).toBe("Age");
    expect(age.align).toBe("right"); // number → right
    expect(age.sortable).toBe(true);
    expect(g.columns.find((c) => c.field === "name")!.align).toBe("left");
  });
});

describe("sorting", () => {
  it("cycles none → asc → desc → none and orders rows", () => {
    const g = new Grid(schema, rows);
    expect(g.viewRowIds.get()).toEqual(["1", "2", "3"]); // raw order

    g.toggleSort("age"); // asc
    expect(g.viewRowIds.get()).toEqual(["2", "1", "3"]); // 25, 30, 40
    g.toggleSort("age"); // desc
    expect(g.viewRowIds.get()).toEqual(["3", "1", "2"]);
    g.toggleSort("age"); // none
    expect(g.sortState()).toBeNull();
    expect(g.viewRowIds.get()).toEqual(["1", "2", "3"]);
  });

  it("sorts text with locale compare", () => {
    const g = new Grid(schema, rows);
    g.toggleSort("name");
    expect(g.viewRowIds.get()).toEqual(["2", "3", "1"]); // Alice, Bob, Carol
  });
});

describe("multi-column sort", () => {
  const data: Row[] = [
    { id: "1", name: "Bob", age: 30 },
    { id: "2", name: "Bob", age: 20 },
    { id: "3", name: "Amy", age: 40 },
  ];

  it("shift-adds a secondary sort and chains comparators", () => {
    const g = new Grid(schema, data);
    g.toggleSort("name"); // asc: Amy, then Bob/Bob
    g.toggleSort("age", true); // add age asc → within Bob, 20 before 30
    expect(g.sortModel()).toEqual([
      { field: "name", dir: "asc" },
      { field: "age", dir: "asc" },
    ]);
    expect(g.viewRowIds.get()).toEqual(["3", "2", "1"]); // Amy/40, Bob/20, Bob/30
  });

  it("non-additive toggle replaces the model", () => {
    const g = new Grid(schema, data);
    g.toggleSort("name");
    g.toggleSort("age", true);
    g.toggleSort("name"); // plain click resets to single name asc
    expect(g.sortModel()).toEqual([{ field: "name", dir: "asc" }]);
  });
});

describe("filtering", () => {
  it("quick filter matches across columns", () => {
    const g = new Grid(schema, rows);
    g.setQuickFilter("ali");
    expect(g.viewRowIds.get()).toEqual(["2"]);
    g.setQuickFilter("");
    expect(g.rowCount()).toBe(3);
  });

  it("per-column filter narrows a single field", () => {
    const g = new Grid(schema, rows);
    g.setColumnFilter("name", "bo");
    expect(g.viewRowIds.get()).toEqual(["3"]);
  });
});

describe("surgical updates", () => {
  it("updating a cell re-runs only that row's binding, not others", () => {
    const g = new Grid(schema, rows);
    const spyA = vi.fn();
    const spyB = vi.fn();
    effect(() => {
      g.rowSignal("1").get();
      spyA();
    });
    effect(() => {
      g.rowSignal("2").get();
      spyB();
    });
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);

    g.updateCell("1", "age", 31);
    expect(spyA).toHaveBeenCalledTimes(2);
    expect(spyB).toHaveBeenCalledTimes(1); // untouched
    expect(g.getRow("1")).toMatchObject({ age: 31 });
  });

  it("a cell update does NOT resort the view (live ticks stay in place)", () => {
    const g = new Grid(schema, rows);
    g.toggleSort("age"); // asc: 2,1,3
    let recomputes = 0;
    effect(() => {
      g.viewRowIds.get();
      recomputes++;
    });
    expect(recomputes).toBe(1);
    g.updateCell("2", "age", 99); // would reorder if it resorted
    expect(recomputes).toBe(1); // view not recomputed
    expect(g.viewRowIds.get()).toEqual(["2", "1", "3"]);
  });
});

describe("pagination (client)", () => {
  const many: Row[] = Array.from({ length: 23 }, (_, i) => ({
    id: String(i),
    name: `n${i}`,
    age: i,
  }));

  it("slices the view into pages and reports state", () => {
    const g = new Grid(schema, many, { pagination: { pageSize: 10 } });
    expect(g.displayRowIds.get()).toHaveLength(10);
    let p = g.pagination();
    expect(p).toMatchObject({ page: 1, totalPages: 3, hasPrev: false, hasNext: true });

    g.nextPage();
    expect(g.displayRowIds.get()[0]).toBe("10");
    g.lastPage();
    p = g.pagination();
    expect(p.page).toBe(3);
    expect(g.displayRowIds.get()).toHaveLength(3); // 23 → last page has 3
    expect(p.hasNext).toBe(false);
  });

  it("clamps out-of-range pages and resets to page 1 on filter", () => {
    const g = new Grid(schema, many, { pagination: { pageSize: 10 } });
    g.setPage(99);
    expect(g.pagination().page).toBe(3);
    g.setQuickFilter("n1"); // matches n1, n10-n19 → 11 rows, 2 pages
    expect(g.pagination().page).toBe(1);
  });
});

describe("selection", () => {
  it("single mode keeps at most one selected", () => {
    const g = new Grid(schema, rows, { selection: "single" });
    g.toggleSelect("1");
    g.toggleSelect("2");
    expect(g.selectedIds()).toEqual(["2"]);
  });

  it("multi mode toggles and supports select-all on page + bulk read", () => {
    const g = new Grid(schema, rows, { selection: "multi" });
    g.selectAllOnPage(true);
    expect(g.selectionCount()).toBe(3);
    g.toggleSelect("2");
    expect(g.selectedIds().sort()).toEqual(["1", "3"]);
    expect(
      g
        .selectedRows()
        .map((r) => r.name)
        .sort(),
    ).toEqual(["Bob", "Carol"]);
    g.clearSelection();
    expect(g.selectionCount()).toBe(0);
  });
});

describe("master/detail expansion", () => {
  it("toggles expanded ids when enabled", () => {
    const g = new Grid(schema, rows, { masterDetail: true });
    expect(g.isExpanded("1")).toBe(false);
    g.toggleExpand("1");
    expect(g.isExpanded("1")).toBe(true);
    expect(g.expandedIds()).toEqual(["1"]);
    g.toggleExpand("1");
    expect(g.isExpanded("1")).toBe(false);
  });
});

describe("server mode", () => {
  it("fetches a page from the datasource and reports total/loading", async () => {
    const all: Row[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `n${i}`,
      age: i,
    }));
    const calls: number[] = [];
    const g = new Grid(schema, [], {
      datasource: async (req) => {
        calls.push(req.page);
        const start = (req.page - 1) * req.pageSize;
        return { rows: all.slice(start, start + req.pageSize), total: all.length };
      },
      pagination: { pageSize: 10 },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(g.displayRowIds.get()).toHaveLength(10);
    expect(g.getRow("0")).toMatchObject({ name: "n0" });
    expect(g.pagination().total).toBe(50);

    g.nextPage();
    await new Promise((r) => setTimeout(r, 0));
    expect(g.getRow("10")).toMatchObject({ name: "n10" });
    expect(calls).toEqual([1, 2]);
    g.destroy();
  });
});

describe("viewport windowing", () => {
  it("computes a visible range from scroll position and height", () => {
    const many: Row[] = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      name: `n${i}`,
      age: i,
    }));
    const g = new Grid(schema, many);
    g.setViewportHeight(400); // 10 rows at 40px
    g.setScrollTop(0);
    let r = g.visibleRange.get();
    expect(r.start).toBe(0);
    expect(r.end).toBeGreaterThanOrEqual(10);
    expect(r.end).toBeLessThan(40); // not the whole 1000

    g.setScrollTop(4000); // row 100
    r = g.visibleRange.get();
    expect(r.start).toBeLessThanOrEqual(100);
    expect(r.start).toBeGreaterThan(80);
    expect(g.totalHeight()).toBe(40000);
  });
});
