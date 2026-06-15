import { describe, expect, it, vi } from "vitest";
import { Form } from "./form.js";
import type { FormSchema } from "@formwright/schema";

const wizardSchema: FormSchema = {
  id: "signup-wizard",
  version: "1.0",
  title: "Sign up",
  fields: [
    {
      id: "wizard",
      type: "steps",
      fields: [
        {
          id: "personal",
          type: "step",
          label: "Personal",
          fields: [
            {
              id: "name",
              type: "text",
              label: "Name",
              validation: { kind: "string", required: true },
            },
          ],
        },
        {
          id: "account",
          type: "step",
          label: "Account",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email",
              validation: { kind: "string", format: "email", required: true },
            },
          ],
        },
      ],
    },
  ],
};

describe("step-based forms", () => {
  it("builds a steps container with nested step groups", () => {
    const form = new Form(wizardSchema);
    const steps = form.findSteps();
    expect(steps).toBeDefined();
    expect(steps!.steps).toHaveLength(2);
    expect(steps!.currentStep.peek()).toBe(0);
    expect(form.getValue("wizard.personal.name")).toBe("");
  });

  it("collects nested payload from all steps", () => {
    const form = new Form(wizardSchema, {
      wizard: { personal: { name: "Ada" }, account: { email: "ada@example.com" } },
    });
    expect(form.values.peek()).toEqual({
      wizard: { personal: { name: "Ada" }, account: { email: "ada@example.com" } },
    });
  });

  it("validates only the active step by default", () => {
    const form = new Form(wizardSchema);
    expect(form.validate()).toBe(false);
    expect(form.fields.get("wizard.personal.name")!.error.peek()).toMatch(/required/);
    expect(form.fields.get("wizard.account.email")!.error.peek()).toBeNull();
    form.setValue("wizard.personal.name", "Ada");
    expect(form.validate()).toBe(true);
  });

  it("does not validate inactive steps while on an earlier step", () => {
    const form = new Form(wizardSchema, { wizard: { personal: { name: "Ada" } } });
    expect(form.validate()).toBe(true);
    expect(form.fields.get("wizard.account.email")!.error.peek()).toBeNull();
  });

  it("blocks next when the current step is invalid", () => {
    const form = new Form(wizardSchema);
    const steps = form.findSteps()!;
    expect(steps.next()).toBe(false);
    expect(steps.currentStep.peek()).toBe(0);
    form.setValue("wizard.personal.name", "Ada");
    expect(steps.next()).toBe(true);
    expect(steps.currentStep.peek()).toBe(1);
  });

  it("validates all steps on submit", async () => {
    const form = new Form(wizardSchema, { wizard: { personal: { name: "Ada" } } });
    const steps = form.findSteps()!;
    steps.goTo(1);
    const result = await form.submit();
    expect(result.ok).toBe(false);
    expect(form.fields.get("wizard.account.email")!.error.peek()).toMatch(/required|valid email/);
  });

  it("submits when every step is valid", async () => {
    const send = vi.fn(async (payload: unknown) => payload);
    const form = new Form(
      { ...wizardSchema, submit: { endpoint: { method: "POST", url: "/api/signup" } } },
      { wizard: { personal: { name: "Ada" }, account: { email: "ada@example.com" } } },
      { send },
    );
    const result = await form.submit();
    expect(result.ok).toBe(true);
    expect(send.mock.calls[0]![0]).toEqual({
      wizard: { personal: { name: "Ada" }, account: { email: "ada@example.com" } },
    });
  });

  it("goes back without clearing values", () => {
    const form = new Form(wizardSchema);
    form.setValue("wizard.personal.name", "Ada");
    const steps = form.findSteps()!;
    steps.next();
    steps.prev();
    expect(steps.currentStep.peek()).toBe(0);
    expect(form.getValue("wizard.personal.name")).toBe("Ada");
  });
});
