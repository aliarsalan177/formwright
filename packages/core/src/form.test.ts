import { describe, expect, it, vi } from "vitest";
import { effect } from "./reactive.js";
import { Form } from "./form.js";
import type { FormSchema } from "@formwright/schema";

const schema: FormSchema = {
  id: "signup",
  version: "1.0",
  fields: [
    { id: "email", type: "email", validation: { kind: "string", format: "email", required: true } },
    { id: "country", type: "select", options: [{ label: "US", value: "US" }] },
    {
      id: "state",
      type: "text",
      visibleWhen: { "==": [{ var: "country" }, "US"] },
      requiredWhen: { "==": [{ var: "country" }, "US"] },
    },
  ],
  submit: { transform: "build", endpoint: { method: "POST", url: "/api/signup" } },
};

describe("Form construction", () => {
  it("creates field state with defaults", () => {
    const form = new Form(schema);
    expect(form.order).toEqual(["email", "country", "state"]);
    expect(form.getValue("email")).toBe("");
  });

  it("applies initial values", () => {
    const form = new Form(schema, { email: "a@b.com" });
    expect(form.getValue("email")).toBe("a@b.com");
  });

  it("parses/validates an unknown schema input", () => {
    expect(() => new Form({ id: "x", version: "1", fields: [] })).toThrowError(
      /Invalid Formwright schema/,
    );
  });
});

describe("reactive state", () => {
  it("values is a reactive snapshot", () => {
    const form = new Form(schema, { email: "a@b.com" });
    const seen: string[] = [];
    effect(() => {
      seen.push(String(form.values.get()["email"]));
    });
    form.setValue("email", "c@d.com");
    expect(seen).toEqual(["a@b.com", "c@d.com"]);
  });

  it("isDirty tracks changes", () => {
    const form = new Form(schema);
    expect(form.isDirty.peek()).toBe(false);
    form.setValue("email", "x@y.com");
    expect(form.isDirty.peek()).toBe(true);
  });
});

describe("conditional fields", () => {
  it("toggles visibility reactively", () => {
    const form = new Form(schema);
    const state = form.fields.get("state")!;
    expect(state.visible.peek()).toBe(false);
    form.setValue("country", "US");
    expect(state.visible.peek()).toBe(true);
  });

  it("requiredWhen drives required", () => {
    const form = new Form(schema);
    const state = form.fields.get("state")!;
    expect(state.required.peek()).toBe(false);
    form.setValue("country", "US");
    expect(state.required.peek()).toBe(true);
  });
});

describe("validation", () => {
  it("fails on invalid email", () => {
    const form = new Form(schema, { email: "not-an-email" });
    expect(form.validate()).toBe(false);
    expect(form.fields.get("email")!.error.peek()).toMatch(/valid email/);
  });

  it("does not validate hidden fields", () => {
    const form = new Form(schema, { email: "a@b.com" });
    // state is hidden (country != US), so its requiredWhen does not block submit
    expect(form.validate()).toBe(true);
  });

  it("requires conditionally-shown fields", () => {
    const form = new Form(schema, { email: "a@b.com", country: "US" });
    expect(form.validate()).toBe(false);
    expect(form.fields.get("state")!.error.peek()).toMatch(/required/);
  });
});

describe("submission pipeline", () => {
  it("transforms payload and calls success handler", async () => {
    const onSuccess = vi.fn();
    const send = vi.fn(async (payload: unknown) => ({ ok: true, echo: payload }));
    const form = new Form(
      { ...schema, submit: { ...schema.submit!, onSuccess: "done" } },
      { email: "a@b.com" },
      {
        transforms: { build: (values) => ({ ...values, source: "web" }) },
        handlers: { done: onSuccess },
        send,
      },
    );
    await form.submit();
    // `state` is hidden (country != "US"), so it's excluded from the payload.
    expect(send.mock.calls[0]![0]).toEqual({
      email: "a@b.com",
      country: "",
      source: "web",
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("rejects and calls error handler on invalid form", async () => {
    const onError = vi.fn();
    const form = new Form(
      { ...schema, submit: { ...schema.submit!, onError: "err" } },
      { email: "bad" },
      { handlers: { err: onError } },
    );
    const result = await form.submit();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("emits lifecycle events", async () => {
    const events: string[] = [];
    const form = new Form(schema, { email: "a@b.com" }, { send: async () => ({}) });
    form.on("submit", () => events.push("submit"));
    form.on("success", () => events.push("success"));
    await form.submit();
    expect(events).toEqual(["submit", "success"]);
  });
});

describe("reset", () => {
  it("restores initial values", () => {
    const form = new Form(schema, { email: "a@b.com" });
    form.setValue("email", "z@z.com");
    form.reset();
    expect(form.getValue("email")).toBe("a@b.com");
    expect(form.isDirty.peek()).toBe(false);
  });
});
