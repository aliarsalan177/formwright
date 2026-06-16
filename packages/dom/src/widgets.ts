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
import { resolve, type FieldState } from "@formwright/core";
import type { FieldSchema, WidgetBindMap, WidgetRef } from "@formwright/schema";
import { bindDisabled, on, Scope } from "./internal.js";
import { bindFieldOptions, optionLabel } from "./options-source.js";
import {
  createEventReader,
  mapFieldOptions,
  normalizeWidgetValue,
  shapeWidgetValue,
  type WidgetValueMode,
  type WidgetValueShape,
} from "./widget-normalize.js";

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
  /** Subscribe to validation error message changes. */
  onError(cb: (message: string | null) => void): void;
  /** Subscribe to invalid (has error) changes. */
  onInvalid(cb: (invalid: boolean) => void): void;
  /** Subscribe to required flag changes. */
  onRequired(cb: (required: boolean) => void): void;
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
  /** Map form options into the component's choices shape. */
  mapOptions?: (options: readonly FieldOption[]) => unknown;
  /** Map form state → component property names (see {@link WidgetBindMap}). */
  bind?: WidgetBindMap;
  /** Dot-path on change events (`detail.value.payload`). */
  readPath?: string;
  /** Extract key from object / object[] payloads. */
  valueKey?: string;
  valueMode?: WidgetValueMode;
  valueShape?: WidgetValueShape;
  /** Map `{ label, value }` options to component choice shape. */
  optionsMap?: { label: string; value: string };
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
  return field.domId; // globally unique (collection rows reuse `field.id`)
}

/** True when the field widget owns error display (skip the default `.fw-error`). */
export function fieldWidgetHandlesError(schema: FieldSchema): boolean {
  const ref = schema.widget;
  if (!ref || typeof ref === "string") return false;
  const bind = ref.bind;
  return !!(bind?.hideError || bind?.error || bind?.invalid);
}

/** Resolve and build a field's control, honoring a per-field `widget` override. */
export function renderControl(ctx: WidgetContext): HTMLElement {
  const ref = ctx.field.schema.widget;

  // Per-field declarative tag (custom element) with no registration needed.
  if (ref && typeof ref === "object" && ref.tag && !ref.component) {
    return buildSpec(mergeTransforms(specFromRef(ref), ctx.form, ref), ctx);
  }

  const name = (typeof ref === "string" ? ref : ref?.component) ?? ctx.field.schema.type ?? "text";
  const widget = registry.get(name) ?? registry.get("text")!;

  if (typeof widget === "function") return widget(ctx);
  // Merge serializable per-field overrides onto the registered spec.
  const overrides = ref && typeof ref === "object" ? specFromRef(ref) : undefined;
  const base = overrides ? { ...widget, ...overrides } : widget;
  return buildSpec(mergeTransforms(base, ctx.form, ref), ctx);
}

/** Build a {@link WidgetSpec} from the schema's serializable {@link WidgetRef}. */
function specFromRef(ref: Exclude<WidgetRef, string>): WidgetSpec {
  const spec: WidgetSpec = {};
  if (ref.tag !== undefined) spec.tag = ref.tag;
  if (ref.valueProp !== undefined) spec.valueProp = ref.valueProp;
  if (ref.event !== undefined) spec.event = ref.event;
  if (ref.attrs !== undefined) spec.attrs = ref.attrs;
  if (ref.bind !== undefined) spec.bind = ref.bind;
  if (ref.readPath !== undefined) spec.readPath = ref.readPath;
  if (ref.valueKey !== undefined) spec.valueKey = ref.valueKey;
  if (ref.valueMode !== undefined) spec.valueMode = ref.valueMode;
  if (ref.valueShape !== undefined) spec.valueShape = ref.valueShape;
  if (ref.optionsMap !== undefined) spec.optionsMap = ref.optionsMap;
  return spec;
}

function mergeTransforms(spec: WidgetSpec, form: Form, ref?: WidgetRef): WidgetSpec {
  if (!ref || typeof ref === "string") return spec;
  const transforms = form.options.widgetTransforms ?? {};
  const out: WidgetSpec = { ...spec };
  const toValue = ref.toValue ? transforms[ref.toValue]?.toValue : undefined;
  const fromValue = ref.fromValue ? transforms[ref.fromValue]?.fromValue : undefined;
  const read = ref.read ? transforms[ref.read]?.read : undefined;
  const write = ref.write ? transforms[ref.write]?.write : undefined;
  const mapOptions = ref.optionsTransform
    ? transforms[ref.optionsTransform]?.mapOptions
    : undefined;
  if (!out.toValue && toValue) out.toValue = toValue;
  if (!out.fromValue && fromValue) out.fromValue = fromValue;
  if (!out.read && read) out.read = read;
  if (!out.write && write) out.write = write;
  if (!out.mapOptions && mapOptions) out.mapOptions = mapOptions;
  return out;
}

function resolveToValue(spec: WidgetSpec): (raw: unknown) => FieldValue {
  if (spec.toValue) return spec.toValue;
  const { valueKey, valueMode } = spec;
  if (valueKey) return (raw) => normalizeWidgetValue(raw, valueKey, valueMode ?? "single");
  return (raw) => raw as FieldValue;
}

function resolveFromValue(spec: WidgetSpec): (value: FieldValue) => unknown {
  if (spec.fromValue) return spec.fromValue;
  const { valueKey, valueShape } = spec;
  if (valueKey && valueShape && valueShape !== "scalar") {
    return (value) => shapeWidgetValue(value, valueKey, valueShape);
  }
  return (v) => v;
}

function wireWidgetOptions(spec: WidgetSpec, el: HTMLElement, ctx: WidgetContext): void {
  const optionsProp = spec.bind?.options;
  if (!optionsProp) return;
  const { form, field } = ctx;
  const hasOptions =
    field.schema.options !== undefined ||
    field.schema.type === "select" ||
    field.schema.type === "radio" ||
    field.schema.type === "checkbox";
  if (!hasOptions) return;

  bindFieldOptions(ctx, el, (options) => {
    let mapped: unknown = options;
    if (spec.mapOptions) {
      mapped = spec.mapOptions(options);
    } else if (spec.optionsMap) {
      mapped = mapFieldOptions(options, spec.optionsMap.label, spec.optionsMap.value, (opt) =>
        optionLabel(opt, form),
      );
    }
    setElementProp(el, optionsProp, mapped);
  });
}

function valuePropName(spec: WidgetSpec): string {
  return spec.bind?.value ?? spec.valueProp ?? "value";
}

function setElementProp(el: HTMLElement, name: string, value: unknown): void {
  (el as HTMLElement & Record<string, unknown>)[name] = value;
}

function wireBindMap(spec: WidgetSpec, el: HTMLElement, ctx: WidgetContext): void {
  const { form, field, scope } = ctx;
  const bind = spec.bind;

  if (!bind) {
    scope.bind(() => {
      if ("disabled" in el) (el as HTMLInputElement).disabled = !field.enabled.get();
    });
    return;
  }

  if (bind.disabled) {
    scope.bind(() => setElementProp(el, bind.disabled!, !field.enabled.get()));
  } else {
    scope.bind(() => {
      if ("disabled" in el) (el as HTMLInputElement).disabled = !field.enabled.get();
    });
  }

  if (bind.invalid) {
    scope.bind(() => setElementProp(el, bind.invalid!, field.error.get() !== null));
  }

  if (bind.error) {
    scope.bind(() => setElementProp(el, bind.error!, field.error.get() ?? ""));
  }

  if (bind.required) {
    scope.bind(() =>
      setElementProp(el, bind.required!, field.schema.validation?.required === true),
    );
  }

  if (bind.placeholder) {
    scope.bind(() => {
      const placeholder = resolve(field.schema.placeholder, form.options.providers);
      setElementProp(el, bind.placeholder!, typeof placeholder === "string" ? placeholder : "");
    });
  }
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

  const valueProp = valuePropName(spec);
  const fromValue = resolveFromValue(spec);
  const toValue = resolveToValue(spec);
  const write =
    spec.write ??
    ((e, v) => {
      setElementProp(e, valueProp, fromValue(v) ?? "");
    });
  const read = spec.read ?? createEventReader(spec.readPath, valueProp);

  scope.bind(() => write(el, field.value.get()));
  on(scope, el, (spec.event ?? "input") as keyof HTMLElementEventMap, (ev) =>
    form.setFieldValue(field, toValue(read(el, ev))),
  );
  wireBindMap(spec, el, ctx);
  wireWidgetOptions(spec, el, ctx);
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
    onError: (cb) => scope.bind(() => cb(field.error.get())),
    onInvalid: (cb) => scope.bind(() => cb(field.error.get() !== null)),
    onRequired: (cb) => scope.bind(() => cb(field.schema.validation?.required === true)),
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
  // Autocomplete: explicit token, else a sensible default per type (a11y).
  input.setAttribute(
    "autocomplete",
    ctx.field.schema.autocomplete ?? defaultAutocomplete(ctx.field.schema.type),
  );
  wireInput(ctx, input);
  return input;
}

function defaultAutocomplete(type: string): string {
  switch (type) {
    case "email":
      return "email";
    case "password":
      return "current-password";
    default:
      return "on";
  }
}

registerWidget("text", (ctx) => textWidget(ctx, "text"));
registerWidget("email", (ctx) => textWidget(ctx, "email"));
registerWidget("password", (ctx) => textWidget(ctx, "password"));
registerWidget("number", (ctx) => textWidget(ctx, "number"));
// Native date / time pickers.
registerWidget("date", (ctx) => textWidget(ctx, "date"));
registerWidget("time", (ctx) => textWidget(ctx, "time"));
registerWidget("datetime", (ctx) => textWidget(ctx, "datetime-local"));

// A from/to range, with or without time (`props.time: true`). Value: `{ from, to }`.
registerWidget("daterange", (ctx) => {
  const { form, field, scope } = ctx;
  const withTime = field.schema.props?.["time"] === true;
  const type = withTime ? "datetime-local" : "date";
  const group = document.createElement("div");
  group.className = "fw-input-group fw-daterange";

  const from = document.createElement("input");
  from.type = type;
  from.id = commonId(field);
  from.setAttribute("autocomplete", "off");
  const to = document.createElement("input");
  to.type = type;
  to.setAttribute("autocomplete", "off");
  const sep = document.createElement("span");
  sep.className = "fw-slot fw-range-sep";
  sep.textContent = "→";

  scope.bind(() => {
    const v = field.value.get() as { from?: string; to?: string } | undefined;
    from.value = v?.from ?? "";
    to.value = v?.to ?? "";
  });
  const commit = () =>
    form.setFieldValue(field, {
      from: from.value || undefined,
      to: to.value || undefined,
    } as unknown as FieldValue);
  on(scope, from, "input", commit);
  on(scope, to, "input", commit);
  bindDisabled(scope, from, () => !field.enabled.get());
  bindDisabled(scope, to, () => !field.enabled.get());

  group.append(from, sep, to);
  return group;
});

registerWidget("textarea", (ctx) => {
  const ta = document.createElement("textarea");
  ta.id = commonId(ctx.field);
  ta.name = ctx.field.id;
  const placeholder = resolve(ctx.field.schema.placeholder, ctx.form.options.providers);
  if (typeof placeholder === "string") ta.placeholder = placeholder;
  wireInput(ctx, ta);
  return ta;
});

// Modern color picker: a native swatch + a hex text input (which supports a placeholder).
registerWidget("color", (ctx) => {
  const { form, field, scope } = ctx;
  const group = document.createElement("div");
  group.className = "fw-input-group fw-color";

  const swatch = document.createElement("input");
  swatch.type = "color";
  swatch.className = "fw-color-swatch";

  const text = document.createElement("input");
  text.type = "text";
  text.id = commonId(field);
  text.name = field.id;
  const placeholder = resolve(field.schema.placeholder, form.options.providers);
  text.placeholder = typeof placeholder === "string" ? placeholder : "#000000";

  scope.bind(() => {
    const v = field.value.get();
    const hex = typeof v === "string" ? v : "";
    if (text.value !== hex) text.value = hex;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) swatch.value = hex;
  });
  on(scope, swatch, "input", () => form.setFieldValue(field, swatch.value));
  on(scope, text, "input", () => form.setFieldValue(field, text.value));
  bindDisabled(scope, swatch, () => !field.enabled.get());
  bindDisabled(scope, text, () => !field.enabled.get());

  group.append(swatch, text);
  return group;
});

// A slider with a live value bubble (e.g. brightness). Reads min/max/step/unit
// from `props`, falling back to `validation.min`/`validation.max`.
registerWidget("range", (ctx) => {
  const { form, field, scope } = ctx;
  const props = (field.schema.props ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number): number => (typeof v === "number" ? v : d);
  const group = document.createElement("div");
  group.className = "fw-input-group fw-range";

  const minN = num(props.min, field.schema.validation?.min ?? 0);
  const input = document.createElement("input");
  input.type = "range";
  input.className = "fw-range-input";
  input.id = commonId(field);
  input.name = field.id;
  input.min = String(minN);
  input.max = String(num(props.max, field.schema.validation?.max ?? 100));
  input.step = String(num(props.step, 1));

  // A range with no numeric seed (no `defaultValue`) would otherwise submit the
  // empty-string default while visually parked at min — commit min so the
  // payload matches what the slider shows.
  if (typeof field.value.peek() !== "number") form.setFieldValue(field, minN);

  const bubble = document.createElement("output");
  bubble.className = "fw-range-value";
  const unit = typeof props.unit === "string" ? props.unit : "";

  scope.bind(() => {
    const v = field.value.get();
    const n = typeof v === "number" ? v : minN;
    if (Number(input.value) !== n) input.value = String(n);
    bubble.textContent = `${input.value}${unit}`;
  });
  on(scope, input, "input", () => form.setFieldValue(field, Number(input.value)));
  bindDisabled(scope, input, () => !field.enabled.get());

  group.append(input, bubble);
  return group;
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

registerWidget("checkbox", (ctx) => {
  const { form, field, scope } = ctx;
  const hasOptions =
    Array.isArray(resolve(field.schema.options, form.options.providers)) ||
    (field.schema.options &&
      typeof field.schema.options === "object" &&
      "$query" in field.schema.options);
  if (!hasOptions) return checkLikeWidget(ctx, "fw-checkbox");

  const group = document.createElement("div");
  group.className = "fw-checkbox-group";
  group.setAttribute("role", "group");
  bindFieldOptions(ctx, group, (options) => {
    group.replaceChildren();
    const selected = new Set(
      Array.isArray(field.value.peek())
        ? (field.value.peek() as unknown[]).map(String)
        : field.value.peek() == null
          ? []
          : [String(field.value.peek())],
    );
    for (const opt of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = field.id;
      input.value = String(opt.value);
      input.checked = selected.has(String(opt.value));
      input.addEventListener("change", () => {
        const next = new Set(
          Array.isArray(field.value.peek()) ? (field.value.peek() as unknown[]).map(String) : [],
        );
        if (input.checked) next.add(String(opt.value));
        else next.delete(String(opt.value));
        form.setFieldValue(field, [...next] as unknown as FieldValue);
      });
      label.append(input, document.createTextNode(` ${optionLabel(opt, form)}`));
      bindDisabled(scope, input, () => !field.enabled.get());
      group.appendChild(label);
    }
  });
  return group;
});
// A toggle is a checkbox styled as an iOS-style switch (see playground CSS).
registerWidget("toggle", (ctx) => checkLikeWidget(ctx, "fw-switch"));

registerWidget("select", (ctx) => {
  const { form, field, scope } = ctx;
  const select = document.createElement("select");
  select.id = commonId(field);
  select.name = field.id;
  const placeholderText = resolve(field.schema.placeholder, form.options.providers);

  bindFieldOptions(ctx, select, (options) => {
    const current = field.value.peek();
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = typeof placeholderText === "string" ? placeholderText : "Select…";
    select.appendChild(placeholder);
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = String(opt.value);
      o.textContent = optionLabel(opt, form);
      select.appendChild(o);
    }
    select.value = current == null ? "" : String(current);
  });

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
// File uploader with drag-and-drop, type filtering, multiple/single, and thumbnail
// previews. The payload gets file name(s) by default (serializable); override with a
// custom `mount` widget to store File objects, base64, or an upload result.
registerWidget("file", (ctx) => {
  const { form, field, scope } = ctx;
  const props = field.schema.props ?? {};
  const multiple = props["multiple"] === true;
  const accept = typeof props["accept"] === "string" ? props["accept"] : undefined;

  const zone = document.createElement("div");
  zone.className = "fw-dropzone";

  const input = document.createElement("input");
  input.type = "file";
  input.className = "fw-file-input";
  input.id = commonId(field);
  input.name = field.id;
  input.multiple = multiple;
  if (accept) input.accept = accept;

  const prompt = document.createElement("div");
  prompt.className = "fw-dropzone-prompt";
  // Built with textContent (not innerHTML) so a schema-provided `accept` string
  // can never inject markup — the rest of the renderer follows the same rule.
  const icon = document.createElement("span");
  icon.className = "fw-dropzone-icon";
  icon.textContent = "⬆";
  const text = document.createElement("span");
  text.append(
    `Drag ${multiple ? "files" : "a file"} here, or `,
    Object.assign(document.createElement("strong"), { textContent: "browse" }),
  );
  prompt.append(icon, text);
  if (accept) {
    const hint = document.createElement("small");
    hint.className = "fw-dropzone-hint";
    hint.textContent = accept;
    prompt.append(hint);
  }

  const previews = document.createElement("div");
  previews.className = "fw-file-previews";
  zone.append(input, prompt, previews);

  function renderPreviews(list: readonly File[]): void {
    previews.replaceChildren();
    for (const f of list) {
      const chip = document.createElement("div");
      chip.className = "fw-file-chip";
      if (f.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.className = "fw-file-thumb";
        img.src = URL.createObjectURL(f);
        img.addEventListener("load", () => URL.revokeObjectURL(img.src));
        chip.appendChild(img);
      } else {
        const ic = document.createElement("span");
        ic.className = "fw-file-icon";
        ic.textContent = "📄";
        chip.appendChild(ic);
      }
      const name = document.createElement("span");
      name.className = "fw-file-name";
      name.textContent = f.name;
      chip.appendChild(name);
      previews.appendChild(chip);
    }
  }

  function setFiles(files: FileList | null): void {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) {
      form.setFieldValue(field, undefined);
      previews.replaceChildren();
      return;
    }
    const names = list.map((f) => f.name);
    form.setFieldValue(field, multiple ? (names as FieldValue) : names[0]!);
    renderPreviews(list);
  }

  on(scope, input, "change", () => setFiles(input.files));
  on(scope, zone, "dragover", (e) => {
    e.preventDefault();
    zone.classList.add("fw-dragover");
  });
  on(scope, zone, "dragleave", () => zone.classList.remove("fw-dragover"));
  on(scope, zone, "drop", (e) => {
    e.preventDefault();
    zone.classList.remove("fw-dragover");
    const dt = (e as DragEvent).dataTransfer;
    if (dt?.files?.length) {
      input.files = dt.files;
      setFiles(dt.files);
    }
  });
  bindDisabled(scope, input, () => !field.enabled.get());
  return zone;
});

registerWidget("radio", (ctx) => {
  const { form, field, scope } = ctx;
  const group = document.createElement("div");
  group.setAttribute("role", "radiogroup");
  bindFieldOptions(ctx, group, (options) => {
    group.replaceChildren();
    for (const opt of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = field.id;
      input.value = String(opt.value);
      input.checked = field.value.peek() === opt.value;
      input.addEventListener("change", () => form.setFieldValue(field, opt.value));
      label.append(input, document.createTextNode(` ${optionLabel(opt, form)}`));
      bindDisabled(scope, input, () => !field.enabled.get());
      group.appendChild(label);
    }
  });
  return group;
});

export type { FormRenderer };
