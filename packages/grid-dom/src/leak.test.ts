// The grid is where disposal is hardest: rows are torn down and rebuilt
// on every page, sort and filter, each generation carrying width and
// pin bindings, cell effects and edit listeners. If anything survives a
// rebuild it survives all of them, once per interaction.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Grid } from "@formwright/grid-core";
import type { GridSchema, Row } from "@formwright/grid-schema";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import { mount, mountVirtual } from "./index.js";

const schema: GridSchema = {
  id: "leak",
  rowHeight: 40,
  columns: [
    { field: "id" },
    { field: "name", type: "text", editable: true, sortable: true },
    { field: "age", type: "number" },
  ],
};

const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: `n${i}`, age: i }));

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 400;
    },
  });
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function host(): HTMLElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

describe("grid disposal", () => {
  it("leaves nothing behind after a mount and dispose", () => {
    leaks = trackLeaks();
    const el = host();
    mount(new Grid(schema, rows(20)), el)();
    el.remove();
    leaks.assertClean("mount() → dispose() leaked");
  });

  it("leaves nothing behind after paging, which rebuilds every row", () => {
    leaks = trackLeaks();
    const el = host();
    const grid = new Grid(schema, rows(50), { pagination: { pageSize: 5 } });
    const dispose = mount(grid, el);
    grid.setPage(2);
    grid.setPage(3);
    grid.setPage(1);
    dispose();
    el.remove();
    leaks.assertClean("paging leaked");
  });

  it("leaves nothing behind after sorting, which also rebuilds rows", () => {
    leaks = trackLeaks();
    const el = host();
    const grid = new Grid(schema, rows(30));
    const dispose = mount(grid, el);
    grid.toggleSort("name");
    grid.toggleSort("name");
    dispose();
    el.remove();
    leaks.assertClean("sorting leaked");
  });

  it("leaves nothing behind in the virtual renderer", () => {
    leaks = trackLeaks();
    const el = host();
    mountVirtual(new Grid(schema, rows(500)), el)();
    el.remove();
    leaks.assertClean("mountVirtual() leaked");
  });

  it("rebuilds row bindings rather than leaving them disposed", () => {
    // The regression this guards: a Scope's dispose is final, so reusing
    // one across row generations meant every binding registered after the
    // first teardown was undone the instant it was created — the rows
    // rendered empty and nothing failed loudly.
    const el = host();
    const grid = new Grid(schema, rows(50), { pagination: { pageSize: 5 } });
    const dispose = mount(grid, el);
    grid.setPage(2);
    const cells = el.querySelectorAll(".gw-cell");
    expect(cells.length).toBeGreaterThan(0);
    expect([...cells].some((c) => (c.textContent ?? "") !== "")).toBe(true);
    dispose();
  });
});
