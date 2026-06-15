import { describe, expect, it } from "vitest";
import { Grid } from "@formwright/grid-core";
import type { GridSchema, Row } from "@formwright/grid-schema";
import { mount } from "./index.js";

const schema: GridSchema = {
  id: "g",
  columns: [
    { field: "id" },
    { field: "name", type: "text", editable: true },
    { field: "age", type: "number" },
  ],
};

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: `n${i}`, age: i }));

describe("flow renderer (pagination/selection/detail)", () => {
  it("renders only the current page and a working pager", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(23), { pagination: { pageSize: 10 } });
    mount(grid, host);
    expect(host.querySelectorAll(".gw-flowrow").length).toBe(10);
    expect(host.querySelector(".gw-pager-info")?.textContent).toContain("Page 1 of 3");

    (host.querySelector(".gw-pager-btn:nth-child(3)") as HTMLElement)?.click(); // info is 3rd; next is after
    const nextBtn = [...host.querySelectorAll<HTMLElement>(".gw-pager-btn")].find((b) =>
      b.textContent?.includes("Next"),
    )!;
    nextBtn.click();
    expect(host.querySelector(".gw-pager-info")?.textContent).toContain("Page 2 of 3");
  });

  it("renders selection checkboxes and reflects bulk select-all", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(5), { selection: "multi" });
    mount(grid, host);
    const headerCheck = host.querySelector(".gw-header .gw-check") as HTMLInputElement;
    headerCheck.checked = true;
    headerCheck.dispatchEvent(new Event("change"));
    expect(grid.selectionCount()).toBe(5);
    expect(host.querySelectorAll(".gw-flowrow.gw-selected").length).toBe(5);
  });

  it("expands a row and mounts its detail panel", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(3), { masterDetail: true });
    mount(grid, host, {
      detail: (row, panel) => {
        panel.textContent = `detail of ${row.name}`;
      },
    });
    expect(host.querySelector(".gw-detail")).toBeNull();
    const firstToggle = host.querySelector(".gw-expand") as HTMLElement;
    firstToggle.click();
    expect(host.querySelector(".gw-detail")?.textContent).toBe("detail of n0");
    firstToggle.click();
    expect(host.querySelector(".gw-detail")).toBeNull();
  });

  it("keeps live cell updates surgical in flow mode", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(5), { pagination: { pageSize: 10 } });
    mount(grid, host);
    const firstRow = host.querySelector(".gw-flowrow") as HTMLElement;
    const ageCell = firstRow.children[firstRow.children.length - 1] as HTMLElement;
    expect(ageCell.textContent).toBe("0");
    grid.updateCell("0", "age", 99);
    expect(ageCell.textContent).toBe("99");
    expect(host.querySelector(".gw-flowrow")).toBe(firstRow); // same node
  });
});
