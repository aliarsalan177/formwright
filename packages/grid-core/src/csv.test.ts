import { describe, expect, it } from "vitest";
import { Grid, toCsv } from "./index.js";
import type { GridSchema, Row } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "g",
  columns: [
    { field: "name", header: "Name" },
    { field: "note", header: "Note" },
  ],
};

const rows: Row[] = [
  { id: "1", name: "Alice", note: "plain" },
  { id: "2", name: "Bob", note: 'has, comma and "quote"' },
];

describe("toCsv", () => {
  it("emits a header row and escapes commas/quotes", () => {
    const csv = toCsv(new Grid(schema, rows));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Name,Note");
    expect(lines[1]).toBe("Alice,plain");
    expect(lines[2]).toBe('Bob,"has, comma and ""quote"""');
  });

  it("exports the filtered view, not hidden rows", () => {
    const g = new Grid(schema, rows);
    g.setQuickFilter("alice");
    const lines = toCsv(g).split("\r\n");
    expect(lines).toHaveLength(2); // header + 1 matching row
  });
});
