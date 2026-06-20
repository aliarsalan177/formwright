import { describe, expect, it } from "vitest";
import { deserializeSchema, detectSchemaFormat, serializeSchema } from "./format.js";
import { parseSchemaText } from "./validate.js";

const sample = {
  id: "signup",
  version: "1.0",
  fields: [{ id: "email", type: "email", label: "Email" }],
};

describe("schema format", () => {
  it("round-trips JSON", () => {
    const text = serializeSchema(sample, "json");
    expect(detectSchemaFormat(text)).toBe("json");
    expect(deserializeSchema(text)).toEqual(sample);
  });

  it("round-trips TOON", () => {
    const text = serializeSchema(sample, "toon");
    expect(detectSchemaFormat(text)).toBe("toon");
    expect(deserializeSchema(text)).toEqual(sample);
  });

  it("parseSchemaText accepts both formats", () => {
    const json = serializeSchema(sample, "json");
    const toon = serializeSchema(sample, "toon");
    expect(parseSchemaText(json).id).toBe("signup");
    expect(parseSchemaText(toon).id).toBe("signup");
  });
});
