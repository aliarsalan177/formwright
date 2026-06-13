import { describe, expect, it, vi } from "vitest";
import {
  generateSchema,
  defineProvider,
  SchemaGenerationError,
  openaiProvider,
  type ProposeInput,
} from "./index.js";

const validSchema = {
  id: "signup",
  version: "1.0",
  fields: [{ id: "email", type: "email", label: "Email" }],
};

describe("generateSchema (provider-agnostic core)", () => {
  it("returns a validated schema on the first try", async () => {
    const propose = vi.fn(async () => validSchema);
    const { schema, attempts } = await generateSchema("a signup form", {
      provider: defineProvider(propose),
    });
    expect(attempts).toBe(1);
    expect(schema.id).toBe("signup");
    expect(propose).toHaveBeenCalledOnce();
  });

  it("repairs an invalid schema by feeding issues back", async () => {
    const outputs: unknown[] = [{ id: "x", version: "1.0", fields: [] }, validSchema];
    let i = 0;
    const propose = vi.fn(async (_input: ProposeInput) => outputs[i++]);
    const { schema, attempts } = await generateSchema("a signup form", {
      provider: defineProvider(propose),
    });
    expect(attempts).toBe(2);
    expect(schema.fields).toHaveLength(1);
    // The repair attempt receives the previous output + validation issues.
    const repairInput: ProposeInput = propose.mock.calls[1]![0];
    expect(repairInput.repair?.issues.some((x) => /at least one field/.test(x.message))).toBe(true);
  });

  it("throws SchemaGenerationError after exhausting repair attempts", async () => {
    const propose = vi.fn(async () => ({ id: "x", version: "1.0", fields: [] }));
    await expect(
      generateSchema("x", { provider: defineProvider(propose), maxRepairAttempts: 1 }),
    ).rejects.toBeInstanceOf(SchemaGenerationError);
    expect(propose).toHaveBeenCalledTimes(2);
  });

  it("accepts a { schema } wrapper or a bare schema object", async () => {
    const { schema } = await generateSchema("x", {
      provider: defineProvider(async () => ({ schema: validSchema })),
    });
    expect(schema.id).toBe("signup");
  });
});

describe("openaiProvider", () => {
  it("calls the injected OpenAI client in JSON mode and parses the result", async () => {
    const create = vi.fn(async (_body: { response_format?: unknown }) => ({
      choices: [{ message: { content: JSON.stringify(validSchema) } }],
    }));
    const client = { chat: { completions: { create } } };
    const { schema } = await generateSchema("a signup form", {
      provider: openaiProvider({ client, model: "gpt-4o" }),
    });
    expect(schema.id).toBe("signup");
    expect(create.mock.calls[0]![0].response_format).toEqual({ type: "json_object" });
  });
});
