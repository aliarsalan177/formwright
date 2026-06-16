import { describe, expect, it } from "vitest";
import { getByPath, normalizeWidgetValue, shapeWidgetValue } from "./widget-normalize.js";

describe("widget-normalize", () => {
  it("walks dot-paths on events", () => {
    const ev = { detail: { value: { payload: { code: "us" } } } };
    expect(getByPath(ev, "detail.value.payload.code")).toBe("us");
  });

  it("extracts single and multi object payloads", () => {
    expect(normalizeWidgetValue({ code: "us", name: "US" }, "code", "single")).toBe("us");
    expect(
      normalizeWidgetValue(
        [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
        "id",
        "multi",
      ),
    ).toEqual(["a", "b"]);
  });

  it("shapes values for component write-back", () => {
    expect(shapeWidgetValue("us", "code", "object")).toEqual({ code: "us" });
    expect(shapeWidgetValue(["a", "b"], "id", "object[]")).toEqual([{ id: "a" }, { id: "b" }]);
  });
});
