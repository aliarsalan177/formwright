import { describe, expect, it, vi } from "vitest";
import { Form } from "./form.js";
import type { FormSchema } from "@formwright/schema";

describe("submit(transform)", () => {
  it("applies an inline transform to shape the final payload", async () => {
    const schema: FormSchema = {
      id: "f",
      version: "1.0",
      fields: [{ id: "email", type: "email" }],
    };
    const send = vi.fn(async (p: unknown) => p);
    const form = new Form(schema, { email: "a@b.com" }, { send });
    await form.submit((values) => ({ ...values, source: "web" }));
    expect(send.mock.calls[0]![0]).toEqual({ email: "a@b.com", source: "web" });
  });
});

describe("submit() result envelope", () => {
  const schema: FormSchema = {
    id: "f",
    version: "1.0",
    fields: [
      {
        id: "email",
        type: "email",
        validation: { kind: "string", format: "email", required: true },
      },
    ],
  };

  it("resolves with { ok: true, data } on success — no throw", async () => {
    const form = new Form(schema, { email: "a@b.com" }, { send: async () => ({ id: 7 }) });
    const res = await form.submit();
    expect(res).toEqual({ ok: true, data: { id: 7 } });
  });

  it("resolves with { ok: false, error } when the API fails — no throw", async () => {
    const form = new Form(
      schema,
      { email: "a@b.com" },
      {
        send: async () => {
          throw new Error("500");
        },
      },
    );
    const res = await form.submit();
    expect(res.ok).toBe(false);
    if (!res.ok) expect((res.error as Error).message).toBe("500");
  });

  it("resolves with { ok: false, errors } on validation failure", async () => {
    const form = new Form(schema, { email: "nope" });
    const res = await form.submit();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors?.email).toMatch(/valid email/);
  });
});

describe("validation message overrides", () => {
  it("uses per-rule messages, then the catch-all, then the default", () => {
    const schema: FormSchema = {
      id: "f",
      version: "1.0",
      fields: [
        {
          id: "email",
          type: "email",
          validation: {
            kind: "string",
            required: true,
            format: "email",
            message: "Check this field",
            messages: { required: "Email is required", format: "That's not a valid email" },
          },
        },
        {
          id: "age",
          type: "number",
          validation: { kind: "number", min: 18, message: "Out of range" },
        },
      ],
    };
    const form = new Form(schema);

    // per-rule override (required)
    expect(form.field("email")!.validate()).toBe("Email is required");
    form.setValue("email", "nope");
    expect(form.field("email")!.validate()).toBe("That's not a valid email"); // per-rule (format)

    // catch-all `message` used when no per-rule override exists (min)
    form.setValue("age", 5);
    expect(form.field("age")!.validate()).toBe("Out of range");
  });
});

describe("runtime schema patching", () => {
  it("setFieldSchema changes a field's type at runtime, keeping its value", () => {
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [{ id: "state", type: "select", options: [{ label: "CA", value: "CA" }] }],
      },
      { state: "CA" },
    );
    expect(form.field("state")!.schema.type).toBe("select");
    form.setFieldSchema("state", { type: "text" });
    expect(form.field("state")!.schema.type).toBe("text");
    expect(form.getValue("state")).toBe("CA"); // value preserved across the type switch
  });

  it("patch re-evaluates conditions after updating many fields at once", () => {
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [
        { id: "country", type: "text" },
        { id: "state", type: "text", visibleWhen: { "==": [{ var: "country" }, "US"] } },
      ],
    });
    form.setValue("country", "US");
    expect(form.field("state")!.visible.peek()).toBe(true);
    form.patch({ state: { visibleWhen: { "==": [{ var: "country" }, "CA"] } } });
    expect(form.field("state")!.visible.peek()).toBe(false); // condition re-evaluated post-patch
  });
});

describe("presentational fields", () => {
  it("render-only types are excluded from the payload", () => {
    const schema: FormSchema = {
      id: "f",
      version: "1.0",
      fields: [
        { id: "title", type: "heading", label: "Your details" },
        { id: "divider", type: "separator" },
        { id: "name", type: "text" },
      ],
    };
    const form = new Form(schema, { name: "Ada" });
    expect(form.values.peek()).toEqual({ name: "Ada" });
  });
});

describe("localized fields", () => {
  it("expands into a per-locale object in the payload", () => {
    const schema: FormSchema = {
      id: "f",
      version: "1.0",
      locales: ["en", "ar"],
      fields: [{ id: "name", type: "text", localized: true, label: "Name" }],
    };
    const form = new Form(schema, { name: { en: "Gateway", ar: "بوابة" } });
    expect(form.values.peek().name).toEqual({ en: "Gateway", ar: "بوابة" });
    expect(form.getValue("name.ar")).toBe("بوابة");
  });
});

describe("actions", () => {
  it("runs the named handler and emits an action event", () => {
    const onDelete = vi.fn();
    const events: string[] = [];
    const schema: FormSchema = {
      id: "f",
      version: "1.0",
      fields: [{ id: "name", type: "text" }],
      actions: [
        { name: "save", role: "submit", label: "Save" },
        { name: "delete", role: "button", variant: "danger", handler: "removeItem" },
      ],
    };
    const form = new Form(schema, {}, { handlers: { removeItem: onDelete } });
    form.on("action", (p) => events.push((p as { name: string }).name));
    form.action("delete");
    expect(onDelete).toHaveBeenCalledOnce();
    expect(events).toEqual(["delete"]);
  });
});
