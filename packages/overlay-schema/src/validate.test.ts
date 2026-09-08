import { describe, expect, it } from "vitest";
import { validateSchema } from "./validate.js";

const paths = (schema: unknown) => validateSchema(schema).issues.map((issue) => issue.path);

describe("validateSchema", () => {
  it("accepts a minimal modal", () => {
    expect(validateSchema({ id: "a", kind: "modal" }).valid).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(validateSchema(null).valid).toBe(false);
    expect(validateSchema("modal").valid).toBe(false);
  });

  it("requires an id and a known kind", () => {
    expect(paths({ kind: "lightbox" })).toEqual(["id", "kind"]);
  });

  it("rejects an alert with no way out", () => {
    // Escape and backdrop dismissal are disabled for alerts, so without
    // an action the dialog would be a trap.
    expect(paths({ id: "a", kind: "modal", dismiss: "alert" })).toEqual(["actions"]);
    expect(
      validateSchema({
        id: "a",
        kind: "modal",
        dismiss: "alert",
        actions: [{ name: "ok", label: "OK" }],
      }).valid,
    ).toBe(true);
  });

  it("catches duplicate action names", () => {
    expect(
      paths({
        id: "a",
        kind: "modal",
        actions: [
          { name: "ok", label: "OK" },
          { name: "ok", label: "Also OK" },
        ],
      }),
    ).toEqual(["actions[1].name"]);
  });

  it("requires snap points to ascend and stay within the viewport", () => {
    expect(paths({ id: "a", kind: "sheet", snapPoints: [0.6, 0.3] })).toEqual(["snapPoints[1]"]);
    expect(paths({ id: "a", kind: "sheet", snapPoints: [0, 1] })).toEqual(["snapPoints[0]"]);
    expect(paths({ id: "a", kind: "sheet", snapPoints: [0.5, 1.5] })).toEqual(["snapPoints[1]"]);
  });

  it("requires defaultSnap to index into snapPoints", () => {
    expect(paths({ id: "a", kind: "sheet", snapPoints: [0.5, 1], defaultSnap: 2 })).toEqual([
      "defaultSnap",
    ]);
    expect(paths({ id: "a", kind: "sheet", defaultSnap: 0 })).toEqual(["defaultSnap"]);
  });

  it("validates body blocks by type", () => {
    expect(
      paths({
        id: "a",
        kind: "modal",
        body: [
          { type: "text", text: "fine" },
          { type: "text" },
          { type: "marquee" },
          { type: "slot", name: "" },
          { type: "list", items: [] },
        ],
      }),
    ).toEqual(["body[1].text", "body[2].type", "body[3].name", "body[4].items"]);
  });

  it("accepts a form block without needing the form engine at runtime", () => {
    expect(
      validateSchema({
        id: "a",
        kind: "drawer",
        body: [{ type: "form", form: { id: "f", version: "1", fields: [] } }],
      }).valid,
    ).toBe(true);
  });
});
