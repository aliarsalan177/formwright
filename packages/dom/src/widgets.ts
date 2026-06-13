/**
 * Widget registry + adapter layer — map a field `type` (or a per-field `widget`
 * override) to your own UI. Three ways to provide a widget:
 *
 *  1. A {@link WidgetFactory} — full control, build and bind the element yourself.
 *  2. A declarative {@link WidgetSpec} with a `tag` (native or custom element) +
 *     `valueProp`/`event`/`toValue`/`fromValue` — bind any custom element with no code.
 *  3. A {@link WidgetSpec} with `mount` — render a React/Vue/any-framework component
 *     into the host and drive it via the {@link WidgetBinding}.
 *
 * The schema stays serializable: it references a widget by name (`widget: "rating"`)
 * or by tag (`widget: { tag: "s-select", event: "value-change" }`); the code-level
 * transforms and `mount` come from {@link registerWidget}.
 */
import type { FieldOption, FieldValue, Form, FormRenderer } from "@formwright/core";
import { resolve, resolveQuery, type FieldState } from "@formwright/core";
import type { WidgetRef } from "@formwright/schema";
import { bindDisabled, on, Scope } from "./internal.js";

export interface WidgetContext {
  readonly form: Form;
  readonly field: FieldState;
  readonly scope: Scope;
}

/** Builds the control element for a field and wires its bindings. */
export type WidgetFactory = (ctx: WidgetContext) => HTMLElement;

/** The handle a `mount`-based widget uses to read/write the field value reactively. */
export interface WidgetBinding {
  readonly form: Form;
  readonly field: FieldState;
  readonly scope: Scope;
  /** Current value (non-reactive read). */
  value(): FieldValue;
  /** Commit a new value to the form payload. */
  setValue(value: FieldValue): void;
  /** Subscribe to value changes — called now and on every change; auto-disposed. */
  onValue(cb: (value: FieldValue) => void): void;
  /** Subscribe to enabled changes. */
  onEnabled(cb: (enabled: boolean) => void): void;
}

/** Declarative adapter for a native tag, custom element, or framework component. */
export interface WidgetSpec {
  /** Tag / custom element to create (e.g. "s-select"). Ignored when `mount` is set. */
  tag?: string;
  /** Static attributes to set on the element. */
  attrs?: Record<string, string>;
  /** Property the value is written to / read from (default "value"). */
  valueProp?: string;
  /** DOM event that signals a change (default "input"). */
  event?: string;
  /** Read the raw value from the element/event (default: `event.detail.value` ?? `el[valueProp]`). */
  read?: (el: HTMLElement, event: Event) => unknown;
  /** Write our value to the element (default: `el[valueProp] = fromValue(value)`). */
  write?: (el: HTMLElement, value: FieldValue) => void;
  /** Transform the component's raw value into our FieldValue. */
  toValue?: (raw: unknown) => FieldValue;
  /** Transform our FieldValue into the component's expected value. */
  fromValue?: (value: FieldValue) => unknown;
  /** Mount any framework component into `host`; return a cleanup. Overrides `tag`. */
  mount?: (host: HTMLElement, binding: WidgetBinding) => (() => void) | void;
}

export type Widget = WidgetFactory | WidgetSpec;

const registry = new Map<string, Widget>();

export function registerWidget(type: string, widget: Widget): void {
  registry.set(type, widget);
}

export function getWidget(type: string): Widget {
  return registry.get(type) ?? registry.get("text")!;
}

function commonId(field: FieldState): string {
  return `fw-${field.id}`;
}

/** Resolve and build a field's control, honoring a per-field `widget` override. */
export function renderControl(ctx: WidgetContext): HTMLElement {
  const ref = ctx.field.schema.widget;

  // Per-field declarative tag (custom element) with no registration needed.
  if (ref && typeof ref === "object" && ref.tag && !ref.component) {
    return buildSpec(specFromRef(ref), ctx);
  }

  const name = (typeof ref === "string" ? ref : ref?.component) ?? ctx.field.schema.type ?? "text";
  const widget = registry.get(name) ?? registry.get("text")!;

  if (typeof widget === "function") return widget(ctx);
  // Merge serializable per-field overrides onto the registered spec.
  const overrides = ref && typeof ref === "object" ? specFromRef(ref) : undefined;
  return buildSpec(overrides ? { ...widget, ...overrides } : widget, ctx);
}

/** Build a {@link WidgetSpec} from the schema's serializable {@link WidgetRef}. */
function specFromRef(ref: Exclude<WidgetRef, string>): WidgetSpec {
  const spec: WidgetSpec = {};
  if (ref.tag !== undefined) spec.tag = ref.tag;
  if (ref.valueProp !== undefined) spec.valueProp = ref.valueProp;
  if (ref.event !== undefined) spec.event = ref.event;
  if (ref.attrs !== undefined) spec.attrs = ref.attrs;
  return spec;
}

/** Build a control element from a declarative spec (tag-based or mount-based). */
function buildSpec(spec: WidgetSpec, ctx: WidgetContext): HTMLElement {
  return spec.mount ? buildMountSpec(spec, ctx) : buildTagSpec(spec, ctx);
}

function buildTagSpec(spec: WidgetSpec, ctx: WidgetContext): HTMLElement {
  const { form, field, scope } = ctx;
  const el = document.createElement(spec.tag ?? "input") as HTMLElement & Record<string, unknown>;
  el.id = commonId(field);
  el.setAttribute("name", field.id);
  if (spec.attrs) for (const [k, v] of Object.entries(spec.attrs)) el.setAttribute(k, v);

  const valueProp = spec.valueProp ?? "value";
  const fromValue = spec.fromValue ?? ((v: FieldValue) => v);
  const toValue = spec.toValue ?? ((r: unknown) => r as FieldValue);
  const write =
    spec.write ??
    ((e, v) => {
      (e as unknown as Record<string, unknown>)[valueProp] = fromValue(v) ?? "";
    });
  const read =
    spec.read ??
    ((e, ev) => {
      const detail = (ev as CustomEvent).detail;
      if (detail && typeof detail === "object" && "value" in detail) {
        return (detail as { value: unknown }).value;
      }
      return (e as unknown as Record<string, unknown>)[valueProp];
    });

  scope.bind(() => write(el, field.value.get()));
  on(scope, el, (spec.event ?? "input") as keyof HTMLElementEventMap, (ev) =>
    form.setFieldValue(field, toValue(read(el, ev))),
  );
  scope.bind(() => {
    (el as Record<string, unknown>).disabled = !field.enabled.get();
  });
  return el;
}

function buildMountSpec(spec: WidgetSpec, ctx: WidgetContext): HTMLElement {
  const { form, field, scope } = ctx;
  const host = document.createElement("div");
  host.className = "fw-widget-host";
  host.setAttribute("data-widget", field.id);
  const binding: WidgetBinding = {
    form,
    field,
    scope,
    value: () => field.value.peek(),
    setValue: (v) => form.setFieldValue(field, v),
    onValue: (cb) => scope.bind(() => cb(field.value.get())),
    onEnabled: (cb) => scope.bind(() => cb(field.enabled.get())),
  };
  const cleanup = spec.mount!(host, binding);
  if (typeof cleanup === "function") scope.add(cleanup);
  return host;
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
    form.setFieldValue(field, raw);
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

function checkLikeWidget(ctx: WidgetContext, className: string): HTMLElement {
  const { form, field, scope } = ctx;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = className;
  input.id = commonId(field);
  input.name = field.id;
  scope.bind(() => {
    input.checked = Boolean(field.value.get());
  });
  on(scope, input, "change", () => form.setFieldValue(field, input.checked));
  bindDisabled(scope, input, () => !field.enabled.get());
  return input;
}

registerWidget("checkbox", (ctx) => checkLikeWidget(ctx, "fw-checkbox"));
// A toggle is a checkbox styled as an iOS-style switch (see playground CSS).
registerWidget("toggle", (ctx) => checkLikeWidget(ctx, "fw-switch"));

registerWidget("select", (ctx) => {
  const { form, field, scope } = ctx;
  const select = document.createElement("select");
  select.id = commonId(field);
  select.name = field.id;
  const placeholderText = resolve(field.schema.placeholder, form.options.providers);
  // Re-render options reactively (covers async $query options).
  scope.bind(() => {
    const options = resolveOptions(ctx);
    const current = field.value.peek();
    select.replaceChildren();
    // A native <select> always displays its first option, which would
    // misrepresent an empty/unset value as if it were chosen — and break any
    // condition reading this field (e.g. `country == "US"` showing as US before
    // the user picks anything). Prepend an empty placeholder so the control
    // honestly shows "nothing selected" until a real choice is made.
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = typeof placeholderText === "string" ? placeholderText : "Select…";
    select.appendChild(placeholder);
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
  on(scope, select, "change", () => form.setFieldValue(field, select.value));
  bindDisabled(scope, select, () => !field.enabled.get());
  return select;
});

// Native file input. The payload gets the file name(s) by default (serializable);
// override with a custom `mount` widget to store a File, base64, or upload result.
registerWidget("file", (ctx) => {
  const { form, field, scope } = ctx;
  const input = document.createElement("input");
  input.type = "file";
  input.id = commonId(field);
  input.name = field.id;
  const props = field.schema.props ?? {};
  if (typeof props["accept"] === "string") input.accept = props["accept"];
  const multiple = props["multiple"] === true;
  input.multiple = multiple;
  on(scope, input, "change", () => {
    const files = input.files;
    if (!files || files.length === 0) {
      form.setFieldValue(field, undefined);
      return;
    }
    const names = Array.from(files).map((f) => f.name);
    form.setFieldValue(field, multiple ? (names as FieldValue) : names[0]!);
  });
  bindDisabled(scope, input, () => !field.enabled.get());
  return input;
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
      input.addEventListener("change", () => form.setFieldValue(field, opt.value));
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
