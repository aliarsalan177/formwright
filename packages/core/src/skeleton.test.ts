import { describe, expect, it } from "vitest";
import { Form } from "./form.js";
import { buildSkeletonPlanFromForm, buildSkeletonPlanFromSchemas } from "./skeleton.js";

describe("buildSkeletonPlanFromSchemas", () => {
  it("maps common field types to skeleton variants", () => {
    const plan = buildSkeletonPlanFromSchemas([
      { id: "email", type: "email", colSpan: 6 },
      { id: "bio", type: "textarea", skeleton: { lines: 5 } },
      { id: "agree", type: "toggle", labelPosition: "start" },
      { id: "hr", type: "separator" },
    ]);
    expect(plan).toEqual([
      { kind: "field", variant: "text", colSpan: 6, lines: undefined },
      { kind: "field", variant: "textarea", lines: 5 },
      { kind: "field", variant: "toggle", lines: undefined },
      { kind: "field", variant: "separator", lines: undefined },
    ]);
  });

  it("nests group and collection children", () => {
    const plan = buildSkeletonPlanFromSchemas([
      {
        id: "contacts",
        type: "collection",
        minItems: 2,
        fields: [{ id: "name", type: "text" }],
      },
    ]);
    expect(plan[0]?.kind).toBe("collection");
    expect(plan[0]?.rows).toBe(2);
    expect(plan[0]?.children?.[0]).toEqual({ kind: "field", variant: "text", lines: undefined });
  });
});

describe("buildSkeletonPlanFromForm", () => {
  it("uses only the active wizard step fields", () => {
    const form = new Form({
      id: "w",
      version: "1.0",
      fields: [
        {
          id: "flow",
          type: "steps",
          fields: [
            { id: "s1", type: "step", fields: [{ id: "a", type: "text" }] },
            { id: "s2", type: "step", fields: [{ id: "b", type: "email" }] },
          ],
        },
      ],
    });
    expect(buildSkeletonPlanFromForm(form)).toEqual([
      { kind: "field", variant: "text", lines: undefined },
    ]);
    form.findSteps()!.next();
    expect(buildSkeletonPlanFromForm(form)).toEqual([
      { kind: "field", variant: "text", lines: undefined },
    ]);
  });
});
