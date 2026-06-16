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

  it("renders a color picker (swatch + hex input with placeholder)", () => {
    const { host } = setup(
      { id: "f", version: "1.0", fields: [{ id: "c", type: "color", placeholder: "#000000" }] },
      { c: "#ff0000" },
    );
    const swatch = host.querySelector("input[type='color']") as HTMLInputElement;
    const text = host.querySelector(".fw-color input[type='text']") as HTMLInputElement;
    expect(swatch.value).toBe("#ff0000");
    expect(text.value).toBe("#ff0000");
    expect(text.placeholder).toBe("#000000");
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

  it("re-renders a field's control when its schema is patched (select → text)", () => {
    const host = document.createElement("div");
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [
        { id: "state", type: "select", label: "State", options: [{ label: "CA", value: "CA" }] },
      ],
    });
    mount(form, host);
    expect(host.querySelector("[data-field='state'] select")).toBeTruthy();
    form.setFieldSchema("state", { type: "text" });
    expect(host.querySelector("[data-field='state'] select")).toBeNull();
    expect(host.querySelector("[data-field='state'] input[type='text']")).toBeTruthy();
  });

  it("labelPosition 'start' renders an iPad-style row: [label + description] [control]", () => {
    const { host } = setup({
      id: "f",
      version: "1.0",
      fields: [
        {
          id: "twofa",
          type: "toggle",
          label: "Two-factor auth",
          description: "Require a code at sign-in.",
          labelPosition: "start",
        },
      ],
    });
    const wrap = host.querySelector("[data-field='twofa']") as HTMLElement;
    expect(wrap.classList.contains("fw-field-between")).toBe(true);
    const row = wrap.querySelector(".fw-field-row") as HTMLElement;
    expect(row).toBeTruthy();
    const head = row.querySelector(".fw-field-head") as HTMLElement;
    expect(head.querySelector("label")?.textContent).toBe("Two-factor auth");
    expect(head.querySelector(".fw-description")?.textContent).toBe("Require a code at sign-in.");
    expect(row.querySelector(".fw-switch")).toBeTruthy(); // control on the right
  });

  it("renders a drag-and-drop file uploader (multiple + accept)", () => {
    const { host } = setup({
      id: "f",
      version: "1.0",
      fields: [{ id: "gallery", type: "file", props: { multiple: true, accept: "image/*" } }],
    });
    const zone = host.querySelector(".fw-dropzone") as HTMLElement;
    expect(zone).toBeTruthy();
    const input = zone.querySelector("input[type='file']") as HTMLInputElement;
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe("image/*");
    expect(zone.querySelector(".fw-file-previews")).toBeTruthy();
  });

  it("renders a localized field as one input + a language switcher with RTL", () => {
    const { host, form } = setup({
      id: "f",
      version: "1.0",
      locales: ["en", "ar"],
      fields: [{ id: "name", type: "text", localized: true, label: "Name", defaultLocale: "ar" }],
    });
    const wrap = host.querySelector(".fw-localized") as HTMLElement;
    expect(wrap).toBeTruthy();
    // The language switcher is a dropdown rendered inside the input group.
    const sel = wrap.querySelector(".fw-input-group .fw-lang-select") as HTMLSelectElement;
    expect(sel.options.length).toBe(2);
    expect(sel.value).toBe("ar"); // defaultLocale
    // defaultLocale "ar" is active and RTL.
    const control = wrap.querySelector(".fw-localized-control input") as HTMLInputElement;
    expect(control.getAttribute("dir")).toBe("rtl");
    control.value = "بوابة";
    control.dispatchEvent(new Event("input"));
    expect((form.values.peek().name as Record<string, unknown>).ar).toBe("بوابة");
    // Switch to English via the dropdown → LTR.
    sel.value = "en";
    sel.dispatchEvent(new Event("change"));
    expect(
      (wrap.querySelector(".fw-localized-control input") as HTMLElement).getAttribute("dir"),
    ).toBe("ltr");
  });

  it("aligns action buttons and supports full-width", () => {
    const host = document.createElement("div");
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [{ id: "name", type: "text" }],
      actionsAlign: "between",
      actions: [
        { name: "save", role: "submit", label: "Save", fullWidth: true },
        { name: "del", role: "button", label: "Delete", variant: "danger" },
      ],
    });
    mount(form, host);
    expect(host.querySelector(".fw-actions.fw-actions-between")).toBeTruthy();
    expect(host.querySelector(".fw-action.fw-action-block")).toBeTruthy();
  });

  it("supports custom wrapper tags for fields and actions", () => {
    const host = document.createElement("div");
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [
        {
          id: "email",
          type: "email",
          label: "Email",
          wrapper: {
            tag: "my-field-shell",
            class: "shell",
            attrs: { "data-kind": "field", "data-enabled": true },
          },
        },
      ],
      actions: [
        {
          name: "save",
          role: "submit",
          label: "Save",
          wrapper: { tag: "my-action-shell", attrs: { "data-kind": "action" } },
        },
      ],
    });
    mount(form, host);
    const fieldShell = host.querySelector("my-field-shell") as HTMLElement;
    expect(fieldShell).toBeTruthy();
    expect(fieldShell.classList.contains("shell")).toBe(true);
    expect(fieldShell.getAttribute("data-kind")).toBe("field");
    expect(fieldShell.getAttribute("data-enabled")).toBe("");
    expect(fieldShell.querySelector("[data-field='email'].fw-field")).toBeTruthy();

    const actionShell = host.querySelector("my-action-shell") as HTMLElement;
    expect(actionShell).toBeTruthy();
    expect(actionShell.getAttribute("data-kind")).toBe("action");
    expect(actionShell.querySelector("button.fw-action")).toBeTruthy();
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
