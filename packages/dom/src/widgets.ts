/**
 * Widget registry — maps a field `type` to a factory that builds its control and
 * wires two-way reactive binding. Register custom widgets with {@link registerWidget}.
 */
import type { FieldOption, FieldValue, Form, FormRenderer } from "@formwright/core";
import { resolve, resolveQuery, type FieldState } from "@formwright/core";
import { bindDisabled, on, Scope } from "./internal.js";

export interface WidgetContext {
  readonly form: Form;
  readonly field: FieldState;
  readonly scope: Scope;
}

/** Builds the control element for a field and wires its bindings. */
export type WidgetFactory = (ctx: WidgetContext) => HTMLElement;

const registry = new Map<string, WidgetFactory>();

export function registerWidget(type: string, factory: WidgetFactory): void {
  registry.set(type, factory);
}

export function getWidget(type: string): WidgetFactory {
  return registry.get(type) ?? registry.get("text")!;
}

function commonId(field: FieldState): string {
  return `fw-${field.id}`;
}

/** Two-way bind a text-like input's `value` to the field signal. */
function wireInput(ctx: WidgetContext, input: HTMLInputElement | HTMLTextAreaElement): void {
  const { form, field, scope } = ctx;
  scope.bind(() => {
    const v = field.value.get();
    const str = v == null ? "" : String(v);
    if (input.value !== str) input.value = str;
  });
  on(scope, input, "input", () => {
    const raw: FieldValue =
      input instanceof HTMLInputElement && input.type === "number"
        ? input.value === ""
          ? undefined
          : Number(input.value)
        : input.value;
    form.setValue(field.id, raw);
  });
  bindDisabled(scope, input, () => !field.enabled.get());
}

function textWidget(ctx: WidgetContext, type: string): HTMLElement {
  const input = document.createElement("input");
  input.type = type;
  input.id = commonId(ctx.field);
  input.name = ctx.field.id;
  const placeholder = resolve(ctx.field.schema.placeholder, ctx.form.options.providers);
  if (typeof placeholder === "string") input.placeholder = placeholder;
  wireInput(ctx, input);
  return input;
}

function resolveOptions(ctx: WidgetContext): readonly FieldOption[] {
  const { field, form } = ctx;
  const literal = resolve(field.schema.options, form.options.providers);
  if (Array.isArray(literal)) return literal as readonly FieldOption[];
  const query = resolveQuery(field.schema.options, form.options.providers);
  if (query) {
    const result = query.get();
    if (Array.isArray(result.data)) return result.data as readonly FieldOption[];
  }
  return [];
}

registerWidget("text", (ctx) => textWidget(ctx, "text"));
registerWidget("email", (ctx) => textWidget(ctx, "email"));
registerWidget("password", (ctx) => textWidget(ctx, "password"));
registerWidget("number", (ctx) => textWidget(ctx, "number"));

registerWidget("textarea", (ctx) => {
  const ta = document.createElement("textarea");
  ta.id = commonId(ctx.field);
  ta.name = ctx.field.id;
  wireInput(ctx, ta);
  return ta;
});

registerWidget("checkbox", (ctx) => {
  const { form, field, scope } = ctx;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = commonId(field);
  input.name = field.id;
  scope.bind(() => {
    input.checked = Boolean(field.value.get());
  });
  on(scope, input, "change", () => form.setValue(field.id, input.checked));
  bindDisabled(scope, input, () => !field.enabled.get());
  return input;
});

registerWidget("select", (ctx) => {
  const { form, field, scope } = ctx;
  const select = document.createElement("select");
  select.id = commonId(field);
  select.name = field.id;
  // Re-render options reactively (covers async $query options).
  scope.bind(() => {
    const options = resolveOptions(ctx);
    const current = field.value.peek();
    select.replaceChildren();
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = String(opt.value);
      o.textContent =
        typeof opt.label === "string"
          ? opt.label
          : String(resolve(opt.label, form.options.providers) ?? opt.value);
      select.appendChild(o);
    }
    select.value = current == null ? "" : String(current);
  });
  // Keep the control in sync when the value changes elsewhere.
  scope.bind(() => {
    const v = field.value.get();
    select.value = v == null ? "" : String(v);
  });
  on(scope, select, "change", () => form.setValue(field.id, select.value));
  bindDisabled(scope, select, () => !field.enabled.get());
  return select;
});

registerWidget("radio", (ctx) => {
  const { form, field, scope } = ctx;
  const group = document.createElement("div");
  group.setAttribute("role", "radiogroup");
  scope.bind(() => {
    const options = resolveOptions(ctx);
    group.replaceChildren();
    for (const opt of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = field.id;
      input.value = String(opt.value);
      input.checked = field.value.peek() === opt.value;
      input.addEventListener("change", () => form.setValue(field.id, opt.value));
      const text =
        typeof opt.label === "string"
          ? opt.label
          : String(resolve(opt.label, form.options.providers) ?? opt.value);
      label.append(input, document.createTextNode(` ${text}`));
      group.appendChild(label);
    }
  });
  return group;
});

export type { FormRenderer };
