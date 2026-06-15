import { describe, expect, it, beforeEach } from "vitest";
import { Grid } from "@formwright/grid-core";
import type { GridSchema, Row } from "@formwright/grid-schema";
import { mount } from "./index.js";

const schema: GridSchema = {
  id: "g",
  rowHeight: 40,
  columns: [
    { field: "id" },
    { field: "name", type: "text", editable: true },
    { field: "age", type: "number" },
  ],
};

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), name: `n${i}`, age: i }));
}

// jsdom doesn't lay out, so drive the viewport height explicitly.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 400;
    },
  });
});

describe("grid renderer", () => {
  it("renders a header per column with sort indicators", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(5));
    mount(grid, host);
    expect(host.querySelectorAll(".gw-hcell").length).toBe(3);

    const ageHeader = [...host.querySelectorAll(".gw-hcell")].find((h) =>
      h.textContent?.startsWith("Age"),
    ) as HTMLElement;
    ageHeader.click();
    expect(ageHeader.textContent).toContain("▲"); // the clicked column shows asc
  });

  it("virtualizes — only a window of rows is in the DOM for 10k rows", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(10_000));
    grid.setViewportHeight(400); // 10 rows tall
    mount(grid, host);
    const visible = [...host.querySelectorAll<HTMLElement>(".gw-row")].filter(
      (r) => r.style.display !== "none",
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(40); // not all 10k
    expect(grid.totalHeight()).toBe(400_000);
  });

  it("updates a single cell surgically without re-creating rows", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(5));
    grid.setViewportHeight(400);
    mount(grid, host);

    const firstRow = host.querySelector(".gw-row") as HTMLElement;
    const ageCell = firstRow.children[2] as HTMLElement;
    expect(ageCell.textContent).toBe("0");

    grid.updateCell("0", "age", 42);
    expect(ageCell.textContent).toBe("42");
    // Same DOM node — not replaced.
    expect(host.querySelector(".gw-row")).toBe(firstRow);
  });

  it("reflects sort order in the rendered rows", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, [
      { id: "a", name: "Zed", age: 3 },
      { id: "b", name: "Amy", age: 1 },
    ]);
    grid.setViewportHeight(400);
    mount(grid, host);
    grid.toggleSort("name"); // asc → Amy first

    const firstVisible = [...host.querySelectorAll<HTMLElement>(".gw-row")]
      .filter((r) => r.style.display !== "none")
      .sort(
        (x, y) =>
          parseFloat(x.style.transform.replace(/\D+/g, "")) -
          parseFloat(y.style.transform.replace(/\D+/g, "")),
      )[0]!;
    expect(firstVisible.children[1]?.textContent).toBe("Amy");
  });
});
