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

  it("rejects non-finite snap points and validates defaultSnap independently", () => {
    expect(paths({ id: "a", kind: "sheet", snapPoints: [0.5, Number.NaN, 1] })).toEqual([
      "snapPoints[1]",
    ]);
    expect(paths({ id: "a", kind: "sheet", snapPoints: [], defaultSnap: 0 })).toEqual([
      "snapPoints",
      "defaultSnap",
    ]);
    expect(paths({ id: "a", kind: "sheet", snapPoints: "full", defaultSnap: "0" })).toEqual([
      "snapPoints",
      "defaultSnap",
    ]);
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

  it("validates nested body block values", () => {
    expect(
      paths({
        id: "a",
        kind: "modal",
        body: [
          { type: "text", text: "Warning", tone: "loud" },
          { type: "list", items: ["valid", 2], ordered: "yes" },
          {
            type: "fields",
            items: [{ label: "Name", value: 42 }, null],
          },
          { type: "form", form: [], submitAction: "" },
        ],
      }),
    ).toEqual([
      "body[0].tone",
      "body[1].items[1]",
      "body[1].ordered",
      "body[2].items[0].value",
      "body[2].items[1]",
      "body[3].form",
      "body[3].submitAction",
    ]);
  });

  it("validates action objects and optional action fields", () => {
    expect(
      paths({
        id: "a",
        kind: "modal",
        actions: [
          null,
          {
            name: "save",
            label: 7,
            role: "primary",
            closeOnRun: "yes",
            disabled: 0,
          },
        ],
      }),
    ).toEqual([
      "actions[0]",
      "actions[1].label",
      "actions[1].role",
      "actions[1].closeOnRun",
      "actions[1].disabled",
    ]);
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
