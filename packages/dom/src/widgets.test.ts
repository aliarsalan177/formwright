import { describe, expect, it, vi } from "vitest";
import { Form } from "@formwright/core";
import type { FormSchema } from "@formwright/core";
import { mount, registerWidget } from "./index.js";

function setup(schema: FormSchema, initial: Record<string, unknown> = {}) {
  const host = document.createElement("div");
  const form = new Form(schema, initial as never);
  mount(form, host);
  return { host, form };
}

describe("widget adapters", () => {
  it("maps a field to a custom element by tag and binds value + event", () => {
    const { host, form } = setup({
      id: "f",
      version: "1.0",
      fields: [
        {
          id: "country",
          type: "text",
          widget: { tag: "s-select", event: "value-change", valueProp: "value" },
        },
      ],
    });

    const el = host.querySelector("s-select") as HTMLElement & { value?: unknown };
    expect(el).toBeTruthy();

    // Component emits a custom event carrying detail.value → becomes the field value.
    el.dispatchEvent(new CustomEvent("value-change", { detail: { value: "US" } }));
    expect(form.getValue("country")).toBe("US");

    // Value set elsewhere is written back onto the element's value property.
    form.setValue("country", "CA");
    expect(el.value).toBe("CA");
  });

  it("supports a mount-based framework component via the binding", () => {
    let received: unknown;
    registerWidget("stars", {
      mount(hostEl, ctx) {
        const btn = document.createElement("button");
        btn.className = "stars";
        hostEl.appendChild(btn);
        ctx.onValue((v) => (received = v));
        btn.addEventListener("click", () => ctx.setValue(5));
        return () => btn.remove();
      },
    });

    const { host, form } = setup({
      id: "f",
      version: "1.0",
      fields: [{ id: "rating", type: "number", widget: "stars" }],
    });

    const btn = host.querySelector("button.stars") as HTMLButtonElement;
    expect(host.querySelector(".fw-widget-host")).toBeTruthy();
    btn.click();
    expect(form.getValue("rating")).toBe(5);
    expect(received).toBe(5); // onValue fired with the committed value
  });

  it("applies toValue/fromValue transformers", () => {
    // Component speaks cents; our payload stores dollars.
    registerWidget("money", {
      tag: "input",
      event: "input",
      valueProp: "value",
      toValue: (raw) => Number(raw) / 100,
      fromValue: (v) => Number(v) * 100,
    });

    const { host, form } = setup(
      {
        id: "f",
        version: "1.0",
        fields: [{ id: "price", type: "number", widget: "money" }],
      },
      { price: 1.5 },
    );

    const el = host.querySelector("[name='price']") as HTMLInputElement;
    expect(el.value).toBe("150"); // 1.5 dollars → 150 cents on the element
    el.value = "250";
    el.dispatchEvent(new Event("input"));
    expect(form.getValue("price")).toBe(2.5); // 250 cents → 2.5 dollars in the payload
  });

  it("applies schema class overrides (Tailwind-ready) to wrapper and control", () => {
    const { host } = setup({
      id: "f",
      version: "1.0",
      fields: [
        {
          id: "email",
          type: "email",
          label: "Email",
          class: "col-span-2",
          classes: { control: "rounded-full border-2", label: "text-sm" },
        },
      ],
    });
    const wrapper = host.querySelector("[data-field='email']") as HTMLElement;
    expect(wrapper.classList.contains("fw-field")).toBe(true);
    expect(wrapper.classList.contains("col-span-2")).toBe(true);
    const control = host.querySelector("input[type='email']") as HTMLElement;
    expect(control.classList.contains("rounded-full")).toBe(true);
    expect(control.classList.contains("border-2")).toBe(true);
    expect((host.querySelector("label") as HTMLElement).classList.contains("text-sm")).toBe(true);
  });

  it("renders a native file input for type 'file'", () => {
    const { host } = setup({
      id: "f",
      version: "1.0",
      fields: [{ id: "avatar", type: "file", props: { accept: "image/*" } }],
    });
    const input = host.querySelector("input[type='file']") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toBe("image/*");
  });
});

describe("authoring elements", () => {
  it("renders presentational heading / separator / paragraph and a tooltip", () => {
    const { host } = setup({
      id: "f",
      version: "1.0",
      fields: [
        { id: "h", type: "heading", label: "Contact" },
        { id: "hr", type: "separator" },
        { id: "p", type: "paragraph", content: "We never share your email." },
        { id: "email", type: "email", label: "Email", tooltip: "Use your work email" },
      ],
    });
    expect((host.querySelector("h3.fw-heading") as HTMLElement).textContent).toBe("Contact");
    expect(host.querySelector("hr.fw-separator")).toBeTruthy();
    expect((host.querySelector("p.fw-paragraph") as HTMLElement).textContent).toBe(
      "We never share your email.",
    );
    const tip = host.querySelector(".fw-tooltip") as HTMLElement;
    expect(tip.getAttribute("title")).toBe("Use your work email");
  });

  it("renders configurable action buttons and fires a custom action", () => {
    const onDelete = vi.fn();
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [{ id: "name", type: "text" }],
        actions: [
          { name: "save", role: "submit", label: "Save" },
          { name: "delete", role: "button", variant: "danger", label: "Delete", handler: "rm" },
        ],
      },
      {},
      { handlers: { rm: onDelete } },
    );
    mount(form, host);
    const buttons = host.querySelectorAll(".fw-action");
    expect(buttons.length).toBe(2);
    const del = host.querySelector(".fw-action-danger") as HTMLButtonElement;
    del.click();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows a dismissible error alert when submit fails validation", async () => {
    const host = document.createElement("div");
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [{ id: "email", type: "email", validation: { kind: "string", required: true } }],
    });
    mount(form, host);
    const alert = host.querySelector(".fw-alert") as HTMLElement;
    expect(alert.hidden).toBe(true);
    await form.submit().catch(() => undefined);
    expect(alert.hidden).toBe(false);
    (host.querySelector(".fw-alert-close") as HTMLButtonElement).click();
    expect(alert.hidden).toBe(true);
  });
});
