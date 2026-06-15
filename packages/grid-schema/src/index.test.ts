import { describe, expect, it } from "vitest";
import { validateSchema } from "./index.js";

describe("validateSchema", () => {
  it("accepts a minimal valid schema", () => {
    const r = validateSchema({ id: "g", columns: [{ field: "name" }] });
    expect(r.valid).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("requires a non-empty columns array", () => {
    const r = validateSchema({ id: "g", columns: [] });
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.path === "columns")).toBe(true);
  });

  it("flags duplicate column fields", () => {
    const r = validateSchema({
      id: "g",
      columns: [{ field: "a" }, { field: "a" }],
    });
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  it("rejects bad widths", () => {
    const r = validateSchema({ id: "g", columns: [{ field: "a", width: -5 }] });
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.path === "columns[0].width")).toBe(true);
  });
});
