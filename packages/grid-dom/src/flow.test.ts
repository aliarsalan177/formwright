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

describe("dynamic columns (resize / reorder / hide / pin)", () => {
  it("reflects column resize, reorder, hide, and pin in the rendered header", () => {
    const host = document.createElement("div");
    const grid = new Grid(schema, makeRows(3), { pagination: { pageSize: 5 } });
    mount(grid, host);

    const headerFields = () =>
      [...host.querySelectorAll<HTMLElement>(".gw-header .gw-hcell:not(.gw-lead) .gw-hlabel")].map(
        (l) => l.textContent,
      );
    expect(headerFields()).toEqual(["Id", "Name", "Age"]);

    grid.moveColumn("age", 0);
    expect(headerFields()).toEqual(["Age", "Id", "Name"]);

    grid.setColumnHidden("id", true);
    expect(headerFields()).toEqual(["Age", "Name"]);

    const nameCellNow = () =>
      [...host.querySelectorAll<HTMLElement>(".gw-header .gw-hcell")].find((c) =>
        c.textContent?.startsWith("Name"),
      )!;
    grid.setColumnWidth("name", 300);
    expect(nameCellNow().style.width).toBe("300px");

    grid.setColumnPin("name", "left"); // rebuilds the header → re-query
    const pinned = nameCellNow();
    expect(pinned.classList.contains("gw-pinned-left")).toBe(true);
    expect(pinned.style.position).toBe("sticky");
  });
});

describe("grouping + aggregation rendering", () => {
  const groupSchema: GridSchema = {
    id: "s",
    groupBy: ["team"],
    columns: [
      { field: "team" },
      { field: "name" },
      { field: "score", type: "number", aggFunc: "sum" },
    ],
  };
  const groupRows: Row[] = [
    { id: "1", team: "A", name: "x", score: 10 },
    { id: "2", team: "A", name: "y", score: 20 },
    { id: "3", team: "B", name: "z", score: 5 },
  ];

  it("renders group header rows, leaves, a grand total, and collapses", () => {
    const host = document.createElement("div");
    const grid = new Grid(groupSchema, groupRows);
    mount(grid, host);
    expect(host.querySelectorAll(".gw-grouprow").length).toBe(2); // teams A, B
    expect(host.querySelectorAll(".gw-flowrow").length).toBe(3); // 3 leaves (expanded)
    // Grand total footer shows sum of scores = 35.
    expect(host.querySelector(".gw-grandtotal .gw-agg")?.textContent).toBe("35");

    // Collapse team A via its toggle.
    const firstToggle = host.querySelector(".gw-grouprow .gw-expand") as HTMLElement;
    firstToggle.click();
    expect(host.querySelectorAll(".gw-flowrow").length).toBe(1); // only team B's leaf remains
  });
});

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
