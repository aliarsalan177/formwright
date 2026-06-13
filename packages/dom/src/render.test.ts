import { describe, expect, it, vi } from "vitest";
import { Form } from "@formwright/core";
import type { FormSchema } from "@formwright/core";
import { mount } from "./index.js";

const schema: FormSchema = {
  id: "signup",
  version: "1.0",
  title: "Sign up",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      validation: { kind: "string", format: "email", required: true },
    },
    {
      id: "country",
      type: "select",
      label: "Country",
      options: [
        { label: "United States", value: "US" },
        { label: "Canada", value: "CA" },
      ],
    },
    {
      id: "state",
      type: "text",
      label: "State",
      visibleWhen: { "==": [{ var: "country" }, "US"] },
    },
  ],
};

function setup(initial: Record<string, never> | Record<string, unknown> = {}) {
  const host = document.createElement("div");
  const form = new Form(schema, initial as never);
  const dispose = mount(form, host);
  return { host, form, dispose };
}

describe("mount", () => {
  it("renders fields, labels, and a submit button", () => {
    const { host } = setup();
    expect(host.querySelector(".fw-title")?.textContent).toBe("Sign up");
    expect(host.querySelectorAll(".fw-field").length).toBe(3);
    expect(host.querySelector("label[for='fw-email']")?.textContent).toBe("Email");
    expect(host.querySelector("input[type='email']")).toBeTruthy();
    // 2 options + a leading empty placeholder.
    expect(host.querySelector("select[name='country']")?.children.length).toBe(3);
    expect(host.querySelector(".fw-submit")).toBeTruthy();
  });

  it("hides conditional fields until their condition holds", () => {
    const { host, form } = setup();
    const stateField = host.querySelector("[data-field='state']") as HTMLElement;
    expect(stateField.hidden).toBe(true);
    form.setValue("country", "US");
    expect(stateField.hidden).toBe(false);
  });

  it("an unselected select shows an empty placeholder, not its first option", () => {
    const { host, form } = setup();
    const select = host.querySelector("select[name='country']") as HTMLSelectElement;
    const stateField = host.querySelector("[data-field='state']") as HTMLElement;
    // The model value is empty, so the control must show empty — NOT silently
    // display "US" (its first real option) while State stays hidden.
    expect(form.getValue("country")).toBe("");
    expect(select.value).toBe("");
    expect((select.firstElementChild as HTMLOptionElement).value).toBe("");
    expect(stateField.hidden).toBe(true);

    // Choosing United States in the DOM drives the value and reveals State.
    select.value = "US";
    select.dispatchEvent(new Event("change"));
    expect(form.getValue("country")).toBe("US");
    expect(stateField.hidden).toBe(false);
  });

  it("two-way binds input to the form value", () => {
    const { host, form } = setup();
    const input = host.querySelector("input[type='email']") as HTMLInputElement;
    input.value = "a@b.com";
    input.dispatchEvent(new Event("input"));
    expect(form.getValue("email")).toBe("a@b.com");

    form.setValue("email", "c@d.com");
    expect(input.value).toBe("c@d.com");
  });

  it("shows validation errors on submit", async () => {
    const { host, form } = setup();
    await form.submit().catch(() => undefined);
    const error = host.querySelector("[data-field='email'] .fw-error") as HTMLElement;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/required/);
  });

  it("updates ONLY the changed field's nodes (surgical)", () => {
    const { host, form } = setup({ email: "a@b.com" });
    const countryField = host.querySelector("[data-field='country']") as HTMLElement;

    // Observe mutations to the country field's subtree while we change `email`.
    const observer = new MutationObserver(() => {});
    const spy = vi.fn();
    const obs = new MutationObserver(spy);
    obs.observe(countryField, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    form.setValue("email", "z@z.com");

    const records = obs.takeRecords();
    obs.disconnect();
    observer.disconnect();
    expect(records.length).toBe(0); // country subtree untouched by an email change
  });

  it("renders groups and collections with add/remove", () => {
    const nested: FormSchema = {
      id: "checkout",
      version: "1.0",
      fields: [
        { id: "reuse", type: "toggle", label: "Reuse" },
        {
          id: "billing",
          type: "group",
          label: "Billing",
          fields: [
            { id: "name", type: "text", label: "Name" },
            { id: "note", type: "text", label: "Note", visibleWhen: { not: { var: "reuse" } } },
          ],
        },
        {
          id: "contacts",
          type: "collection",
          label: "Contacts",
          minItems: 1,
          maxItems: 2,
          fields: [{ id: "name", type: "text", label: "Name" }],
        },
      ],
    };
    const host = document.createElement("div");
    const form = new Form(nested);
    mount(form, host);

    // Group renders as a fieldset with nested fields.
    expect(host.querySelector("fieldset[data-field='billing']")).toBeTruthy();
    expect(host.querySelector("[data-field='billing'] [data-field='note']")).toBeTruthy();

    // Collection seeds one row; Add appends another up to maxItems.
    const collection = host.querySelector("[data-field='contacts']") as HTMLElement;
    expect(collection.querySelectorAll(".fw-row").length).toBe(1);
    const addBtn = collection.querySelector(".fw-add") as HTMLButtonElement;
    addBtn.click();
    expect(collection.querySelectorAll(".fw-row").length).toBe(2);
    expect(addBtn.disabled).toBe(true); // at maxItems

    // Outer toggle hides the nested 'note' field.
    const note = host.querySelector("[data-field='note']") as HTMLElement;
    expect(note.hidden).toBe(false);
    form.setValue("reuse", true);
    expect(note.hidden).toBe(true);
  });

  it("dispose removes the form and stops bindings", () => {
    const { host, form, dispose } = setup();
    dispose();
    expect(host.querySelector(".fw-form")).toBeNull();
    // After dispose, setting a value must not throw or touch removed nodes.
    expect(() => form.setValue("email", "x@y.com")).not.toThrow();
  });
});
