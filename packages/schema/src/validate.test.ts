import { describe, expect, it } from "vitest";
import { fieldIds, parseSchema, validateSchema } from "./index.js";
import type { FormSchema } from "./index.js";

const valid: FormSchema = {
  id: "signup",
  version: "1.0",
  fields: [
    { id: "email", type: "email", validation: { kind: "string", required: true } },
    { id: "country", type: "select", options: [{ label: "US", value: "US" }] },
  ],
};

describe("validateSchema", () => {
  it("accepts a well-formed schema", () => {
    const r = validateSchema(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe("signup");
  });

  it("rejects a non-object", () => {
    const r = validateSchema(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.path).toBe("$");
  });

  it("requires id and version", () => {
    const r = validateSchema({ fields: [{ id: "a", type: "text" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paths = r.issues.map((i) => i.path);
      expect(paths).toContain("id");
      expect(paths).toContain("version");
    }
  });

  it("requires at least one field", () => {
    const r = validateSchema({ id: "x", version: "1", fields: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.path).toBe("fields");
  });

  it("flags duplicate field ids", () => {
    const r = validateSchema({
      id: "x",
      version: "1",
      fields: [
        { id: "dup", type: "text" },
        { id: "dup", type: "text" },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.message.includes("duplicate"))).toBe(true);
  });

  it("flags select without options", () => {
    const r = validateSchema({
      id: "x",
      version: "1",
      fields: [{ id: "s", type: "select" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => i.path === "fields[0].options")).toBe(true);
  });

  it("allows custom (unknown) field types", () => {
    const r = validateSchema({
      id: "x",
      version: "1",
      fields: [{ id: "rating", type: "star-rating" }],
    });
    expect(r.ok).toBe(true);
  });

  it("requires step children inside a steps container", () => {
    const r = validateSchema({
      id: "x",
      version: "1",
      fields: [
        {
          id: "wizard",
          type: "steps",
          fields: [{ id: "bad", type: "group", fields: [{ id: "a", type: "text" }] }],
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.message.includes('"step"'))).toBe(true);
    }
  });

  it("accepts a well-formed steps wizard", () => {
    const r = validateSchema({
      id: "x",
      version: "1",
      fields: [
        {
          id: "wizard",
          type: "steps",
          fields: [
            {
              id: "one",
              type: "step",
              label: "One",
              fields: [{ id: "name", type: "text" }],
            },
            {
              id: "two",
              type: "step",
              label: "Two",
              fields: [{ id: "email", type: "email" }],
            },
          ],
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("parseSchema", () => {
  it("returns the typed schema", () => {
    expect(parseSchema(valid).fields).toHaveLength(2);
  });

  it("throws SchemaValidationError with issues", () => {
    expect(() => parseSchema({})).toThrowError(/Invalid Formwright schema/);
  });
});

describe("fieldIds", () => {
  it("lists field ids in order", () => {
    expect(fieldIds(valid)).toEqual(["email", "country"]);
  });
});
