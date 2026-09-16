import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Grid } from "@formwright/grid-core";
import type { GridSchema, Row } from "@formwright/grid-schema";
import { GRID_DEFAULT_CSS } from "./default-grid-styles.js";
import { mount } from "./index.js";

const schema: GridSchema = {
  id: "layout",
  rowHeight: 40,
  columns: [
    { field: "id", width: 100 },
    { field: "name", flex: 1 },
    { field: "email", flex: 1 },
  ],
};

const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({
  id: String(i),
  name: `n${i}`,
  email: `e${i}`,
}));

const widthOf = (host: Element, selector: string) =>
  [...host.querySelectorAll<HTMLElement>(selector)].map((el) => el.style.width);

// jsdom does not lay out, so give every element a fixed box.
const restore: Array<() => void> = [];
function stubBox(width: number, height: number): void {
  for (const [prop, value] of [
    ["clientWidth", width],
    ["clientHeight", height],
  ] as const) {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => value });
    restore.push(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, prop, original);
    });
  }
}

beforeEach(() => stubBox(600, 400));
afterEach(() => {
  while (restore.length) restore.pop()!();
});

describe("flex columns fill the grid", () => {
  it("in the virtualized renderer", () => {
    const host = document.createElement("div");
    mount(new Grid(schema, rows), host);

    // 600px viewport − 100px fixed column = 250px per flex column.
    expect(widthOf(host, ".gw-header .gw-hcell")).toEqual(["100px", "250px", "250px"]);
    const firstRow = host.querySelector<HTMLElement>(".gw-row[data-row-id]")!;
    expect([...firstRow.children].map((c) => (c as HTMLElement).style.width)).toEqual([
      "100px",
      "250px",
      "250px",
    ]);
    expect(firstRow.style.width).toBe("600px");
  });

  it("in the flow renderer, beside the selection column", () => {
    const host = document.createElement("div");
    mount(new Grid(schema, rows, { selection: "multi" }), host);

    // 600px − 44px checkbox column − 100px fixed column = 456px → 228px each.
    const row = host.querySelector<HTMLElement>(".gw-flowrow")!;
    const cells = [...row.querySelectorAll<HTMLElement>(".gw-cell:not(.gw-lead)")];
    expect(cells.map((c) => c.style.width)).toEqual(["100px", "228px", "228px"]);
    expect(row.style.width).toBe("600px");
  });
});

describe("default styles", () => {
  it("take virtualized rows out of flow so translateY is their only offset", () => {
    expect(GRID_DEFAULT_CSS).toMatch(/\.gw-canvas\s*\{[^}]*position:\s*relative/);
    expect(GRID_DEFAULT_CSS).toMatch(/\.gw-canvas > \.gw-row\s*\{[^}]*position:\s*absolute/);
  });

  it("style every row the flow renderer emits", () => {
    for (const cls of ["gw-flowrow", "gw-grouprow", "gw-grandtotal", "gw-detail", "gw-selected"]) {
      expect(GRID_DEFAULT_CSS, cls).toContain(`.${cls}`);
    }
  });
});

describe("alignment", () => {
  it("right-aligns number columns in header and body (cells are flex containers)", () => {
    const host = document.createElement("div");
    mount(
      new Grid({ id: "align", columns: [{ field: "name" }, { field: "age", type: "number" }] }, [
        { id: "1", name: "a", age: 3 },
      ]),
      host,
    );

    const [nameHeader, ageHeader] = host.querySelectorAll<HTMLElement>(".gw-header .gw-hcell");
    const [nameCell, ageCell] = host.querySelector<HTMLElement>(".gw-row[data-row-id]")!
      .children as HTMLCollectionOf<HTMLElement>;
    expect(ageHeader!.style.justifyContent).toBe("flex-end");
    expect(ageCell!.style.justifyContent).toBe("flex-end");
    expect(nameHeader!.style.justifyContent).toBe("flex-start");
    expect(nameCell!.style.justifyContent).toBe("flex-start");
  });
});
