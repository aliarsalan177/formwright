/**
 * Orchestrates mounting a {@link Form} into the DOM. Walks the field tree —
 * leaf fields, `group` objects, and repeatable `collection` lists — rendering
 * each once to real elements; reactive bindings then keep individual nodes in
 * sync. Hidden nodes toggle via the `hidden` attribute (kept in the DOM so
 * re-showing is O(1)).
 */
import type {
  CollectionItem,
  CollectionNode,
  Dispose,
  FieldNode,
  FieldState,
  Form,
  FormRenderer,
  GroupNode,
} from "@formwright/core";
import { isPresentational, resolve, signal } from "@formwright/core";
import { bindHidden, bindText, h, on, Scope } from "./internal.js";
import { renderControl } from "./widgets.js";

/** Render any node (leaf, group, or collection) into a fresh wrapper element. */
function renderNode(form: Form, node: FieldNode, scope: Scope): HTMLElement {
  if (node.kind === "group") return renderGroup(form, node, scope);
  if (node.kind === "collection") return renderCollection(form, node, scope);
  if (isPresentational(node.schema.type)) return renderPresentational(form, node, scope);
  return renderLeaf(form, node, scope);
}

/** Add space-separated class tokens (e.g. Tailwind utilities) to an element. */
function addClass(el: HTMLElement, classes: string | undefined): void {
  if (classes) for (const c of classes.split(/\s+/)) if (c) el.classList.add(c);
}

/** Static, payload-free content: a section heading, a divider, or a paragraph. */
function renderPresentational(form: Form, field: FieldState, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const type = field.schema.type;
  const text = resolve(field.schema.content ?? field.schema.label, providers);
  let el: HTMLElement;
  if (type === "separator") {
    el = h("hr", { class: "fw-separator", "data-field": field.id });
  } else if (type === "heading") {
    el = h("h3", { class: "fw-heading", "data-field": field.id });
    el.textContent = typeof text === "string" ? text : "";
  } else {
    el = h("p", { class: "fw-paragraph", "data-field": field.id });
    el.textContent = typeof text === "string" ? text : "";
  }
  addClass(el, field.schema.class);
  addClass(el, field.schema.classes?.field);
  bindHidden(scope, el, () => !field.visible.get());
  return el;
}

/** A small info icon carrying a tooltip, placed next to a field's label. */
function tooltipIcon(text: string): HTMLElement {
  const icon = h("span", { class: "fw-tooltip", role: "img", "aria-label": text, title: text });
  icon.textContent = "ⓘ";
  return icon;
}

/** Build the label element (with optional tooltip icon) for a field. */
function buildLabel(form: Form, field: FieldState, inline: boolean): HTMLElement | null {
  const labelText = resolve(field.schema.label, form.options.providers);
  if (typeof labelText !== "string") return null;
  const label = h(
    "label",
    inline ? { for: `fw-${field.id}`, class: "fw-inline-label" } : { for: `fw-${field.id}` },
  );
  label.textContent = labelText;
  addClass(label, field.schema.classes?.label);
  const tip = resolve(field.schema.tooltip, form.options.providers);
  if (typeof tip === "string") label.append(" ", tooltipIcon(tip));
  return label;
}

/** Wrap a control with decorative prefix/suffix slots (icons, currency symbols, …). */
function withSlots(form: Form, field: FieldState, control: HTMLElement): HTMLElement {
  const slots = field.schema.slots;
  if (!slots || (!slots.start && !slots.end)) return control;
  const group = h("div", { class: "fw-input-group" });
  const affix = (slot: unknown, side: string) => {
    if (typeof slot === "string") {
      const span = h("span", { class: `fw-slot fw-slot-${side}` });
      span.textContent = resolveString(slot, form) ?? slot;
      group.appendChild(span);
    }
  };
  affix(slots.start, "start");
  group.appendChild(control);
  affix(slots.end, "end");
  return group;
}

function resolveString(v: unknown, form: Form): string | undefined {
  const r = resolve(v as never, form.options.providers);
  return typeof r === "string" ? r : undefined;
}

/** A single leaf field. The wrapper persists; its inner content re-renders when the
 *  field's schema is patched at runtime (`form.setFieldSchema` / `form.patch`). */
function renderLeaf(form: Form, field: FieldState, scope: Scope): HTMLElement {
  const wrapper = h("div", { class: "fw-field", "data-field": field.id });
  addClass(wrapper, field.schema.class);
  addClass(wrapper, field.schema.classes?.field);

  let inner: Scope | null = null;
  scope.bind(() => {
    field.revision.get(); // re-render on runtime schema patch (e.g. select → text)
    inner?.dispose();
    inner = new Scope();
    wrapper.replaceChildren();
    renderLeafContent(form, field, inner, wrapper);
  });
  scope.add(() => inner?.dispose());

  bindHidden(scope, wrapper, () => !field.visible.get());
  return wrapper;
}

/** Build a leaf field's inner content (label, control, help, error) into `wrapper`. */
function renderLeafContent(
  form: Form,
  field: FieldState,
  scope: Scope,
  wrapper: HTMLElement,
): void {
  const providers = form.options.providers;
  const cx = field.schema.classes;

  const isCheckLike = field.schema.type === "checkbox" || field.schema.type === "toggle";
  const labelStart = field.schema.labelPosition === "start";

  // Description, positioned relative to the label or the field.
  const descText = resolve(field.schema.description, providers);
  const descEl =
    typeof descText === "string"
      ? (() => {
          const d = h("small", { class: "fw-description" });
          d.textContent = descText;
          addClass(d, cx?.description);
          return d;
        })()
      : null;
  const descBelowField = field.schema.descriptionPosition === "below-field";

  // Label first (non-check fields, or check-like with labelPosition: "start").
  const label = buildLabel(form, field, isCheckLike);
  if (label && (!isCheckLike || labelStart)) {
    if (isCheckLike && labelStart) wrapper.classList.add("fw-field-between");
    wrapper.appendChild(label);
  }
  if (descEl && !descBelowField) wrapper.appendChild(descEl);

  const control = withSlots(form, field, renderControl({ form, field, scope }));
  addClass(control, cx?.control);
  wrapper.appendChild(control);

  // Check-like controls (checkbox/toggle): label sits after the control by default.
  if (label && isCheckLike && !labelStart) wrapper.appendChild(label);

  if (descEl && descBelowField) wrapper.appendChild(descEl);

  const help = resolve(field.schema.help, providers);
  if (typeof help === "string") {
    const helpEl = h("small", { class: "fw-help" });
    helpEl.textContent = help;
    addClass(helpEl, cx?.help);
    wrapper.appendChild(helpEl);
  }

  const errorEl = h("p", { class: "fw-error", role: "alert" });
  addClass(errorEl, cx?.error);
  bindText(scope, errorEl, () => field.error.get() ?? "");
  scope.bind(() => {
    errorEl.hidden = field.error.get() === null;
    wrapper.classList.toggle("fw-invalid", field.error.get() !== null);
  });
  wrapper.appendChild(errorEl);
}

/** Render the inner fields of a group/row into a host, returning their wrappers. */
function renderFields(
  form: Form,
  nodes: readonly FieldNode[],
  scope: Scope,
  host: HTMLElement,
): void {
  for (const child of nodes) host.appendChild(renderNode(form, child, scope));
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "dv", "ckb"]);

/** A `localized` field: one input bound to the active locale, with a language switcher. */
function renderLocalized(form: Form, group: GroupNode, scope: Scope): HTMLElement {
  const locales = group.children.map((c) => c.id);
  const def = group.schema.defaultLocale;
  const startLocale = def && locales.includes(def) ? def : (locales[0] ?? "");
  const rtlOverride = form.schema.rtlLocales;
  const isRtl = (loc: string) =>
    rtlOverride ? rtlOverride.includes(loc) : RTL_LOCALES.has(loc.split("-")[0]!);

  const wrapper = h("div", { class: "fw-field fw-localized", "data-field": group.id });
  addClass(wrapper, group.schema.class);
  const label = buildLabel(form, group as unknown as FieldState, false);
  if (label) wrapper.appendChild(label);

  // One unified control: the input + a language dropdown rendered INSIDE it.
  const row = h("div", { class: "fw-input-group fw-localized-row" });
  const controlHost = h("div", { class: "fw-localized-control" });
  const langSelect = document.createElement("select");
  langSelect.className = "fw-slot fw-slot-end fw-lang-select";
  langSelect.setAttribute("aria-label", "Language");
  for (const loc of locales) {
    const o = document.createElement("option");
    o.value = loc;
    o.textContent = loc.toUpperCase();
    langSelect.appendChild(o);
  }
  row.append(controlHost, langSelect);
  wrapper.appendChild(row);

  const active = signal(startLocale);
  on(scope, langSelect, "change", () => active.set(langSelect.value));

  // Re-render the single control whenever the active locale changes.
  let inner: Scope | null = null;
  scope.bind(() => {
    const loc = active.get();
    langSelect.value = loc;
    inner?.dispose();
    inner = new Scope();
    controlHost.replaceChildren();
    const child = group.byName.get(loc);
    if (child && child.kind === "field") {
      const control = renderControl({ form, field: child, scope: inner });
      control.setAttribute("dir", isRtl(loc) ? "rtl" : "ltr");
      controlHost.appendChild(control);
    }
  });
  scope.add(() => inner?.dispose());

  bindHidden(scope, wrapper, () => !group.visible.get());
  return wrapper;
}

/** A `group` object: a titled section (fieldset or accordion) of nested fields. */
function renderGroup(form: Form, group: GroupNode, scope: Scope): HTMLElement {
  if (group.schema.localized) return renderLocalized(form, group, scope);

  const providers = form.options.providers;
  const title = resolve(group.schema.label, providers);

  if (group.schema.layout === "accordion") {
    const details = h("details", {
      class: "fw-group fw-accordion",
      "data-field": group.id,
      open: "",
    });
    const summary = h("summary", { class: "fw-accordion-head" });
    summary.textContent = typeof title === "string" ? title : group.id;
    details.appendChild(summary);
    const body = h("div", { class: "fw-group-body" });
    renderFields(form, group.children, scope, body);
    details.appendChild(body);
    bindHidden(scope, details, () => !group.visible.get());
    return details;
  }

  const fieldset = h("fieldset", { class: "fw-group", "data-field": group.id });
  if (typeof title === "string") {
    const legend = h("legend", { class: "fw-legend" });
    legend.textContent = title;
    fieldset.appendChild(legend);
  }
  renderFields(form, group.children, scope, fieldset);
  bindHidden(scope, fieldset, () => !group.visible.get());
  return fieldset;
}

/** A `collection`: a repeatable list of rows with add/remove honouring min/max. */
function renderCollection(form: Form, collection: CollectionNode, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const layout = collection.schema.layout ?? "list";
  const wrapper = h("div", {
    class: `fw-collection fw-collection-${layout}`,
    "data-field": collection.id,
  });

  const title = resolve(collection.schema.label, providers);
  if (typeof title === "string") {
    const heading = h("div", { class: "fw-collection-title" });
    heading.textContent = title;
    wrapper.appendChild(heading);
  }

  const rowsHost = h("div", { class: "fw-rows" });
  wrapper.appendChild(rowsHost);

  const itemLabel = resolve(collection.schema.itemLabel, providers);
  const addLabel = resolve(collection.schema.addLabel, providers);
  const addBtn = h("button", { type: "button", class: "fw-add" });
  addBtn.textContent = typeof addLabel === "string" ? addLabel : "Add";
  on(scope, addBtn, "click", () => collection.add());
  wrapper.appendChild(addBtn);

  // Re-render the rows whenever the list changes; each pass gets its own scope so
  // removed rows' bindings and listeners are torn down.
  let rowsScope: Scope | null = null;
  scope.bind(() => {
    const items = collection.items.get();
    rowsScope?.dispose();
    rowsScope = new Scope();
    rowsHost.replaceChildren();
    items.forEach((item, index) => {
      rowsHost.appendChild(
        renderRow(form, collection, item, index, items.length, rowsScope!, itemLabel, layout),
      );
    });
    const max = collection.schema.maxItems;
    addBtn.disabled = max !== undefined && items.length >= max;
  });
  // Dispose the latest rows scope when the parent scope tears down.
  scope.add(() => rowsScope?.dispose());

  bindHidden(scope, wrapper, () => !collection.visible.get());
  return wrapper;
}

/** One collection row: its group's fields plus a remove button (disabled at min). */
function renderRow(
  form: Form,
  collection: CollectionNode,
  item: CollectionItem,
  index: number,
  count: number,
  scope: Scope,
  itemLabel: string | readonly unknown[] | undefined,
  layout: string,
): HTMLElement {
  const heading = `${typeof itemLabel === "string" ? itemLabel : "Item"} ${index + 1}`;
  const min = collection.schema.minItems ?? 0;

  const removeBtn = h("button", { type: "button", class: "fw-remove", "aria-label": "Remove" });
  removeBtn.textContent = "Remove";
  removeBtn.disabled = count <= min;
  on(scope, removeBtn, "click", () => collection.removeAt(index));

  if (layout === "accordion") {
    const details = h("details", { class: "fw-row fw-accordion", open: "" });
    const summary = h("summary", { class: "fw-accordion-head" });
    summary.textContent = heading;
    details.appendChild(summary);
    const body = h("div", { class: "fw-row-body" });
    renderFields(form, item.group.children, scope, body);
    body.appendChild(removeBtn);
    details.appendChild(body);
    return details;
  }

  const row = h("div", { class: "fw-row" });
  const head = h("div", { class: "fw-row-head" });
  head.textContent = heading;
  head.appendChild(removeBtn);
  row.appendChild(head);
  const body = h("div", { class: "fw-row-body" });
  renderFields(form, item.group.children, scope, body);
  row.appendChild(body);
  return row;
}

/** A dismissible error summary shown at the top of the form on a failed submit. */
function renderAlert(form: Form, scope: Scope): HTMLElement {
  const alert = h("div", { class: "fw-alert", role: "alert", hidden: "" });
  const body = h("div", { class: "fw-alert-body" });
  const close = h("button", { type: "button", class: "fw-alert-close", "aria-label": "Dismiss" });
  close.textContent = "×";
  alert.append(body, close);
  alert.hidden = true;
  alert.style.display = "none";

  const show = (message: string) => {
    body.textContent = message;
    alert.hidden = false;
    alert.style.display = "";
  };
  const hide = () => {
    alert.hidden = true;
    alert.style.display = "none";
  };
  on(scope, close, "click", hide);
  scope.add(form.on("error", (err) => show(errorMessage(err))));
  scope.add(form.on("success", hide));
  return alert;
}

/** Human-readable summary of a submission error. */
function errorMessage(err: unknown): string {
  const errors = (err as { errors?: Record<string, string | null> })?.errors;
  if (errors) {
    const messages = Object.values(errors).filter((m): m is string => !!m);
    return messages.length
      ? `Please fix ${messages.length} field${messages.length === 1 ? "" : "s"}: ${messages.join("; ")}`
      : "Please fix the errors above.";
  }
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/** Render the configurable action buttons (or a single default Submit). */
function renderActions(form: Form, scope: Scope): HTMLElement {
  const align = form.schema.actionsAlign ?? "start";
  const bar = h("div", { class: `fw-actions fw-actions-${align}` });
  const providers = form.options.providers;
  const actions = form.schema.actions;

  if (!actions || actions.length === 0) {
    const submit = h("button", { type: "submit", class: "fw-submit" });
    submit.textContent = "Submit";
    scope.bind(() => {
      submit.disabled = form.isSubmitting.get();
      submit.textContent = form.isSubmitting.get() ? "Submitting…" : "Submit";
    });
    bar.appendChild(submit);
    return bar;
  }

  for (const def of actions) {
    const role = def.role ?? "button";
    const btn = h("button", { type: role === "submit" ? "submit" : "button", class: "fw-action" });
    if (def.variant) btn.classList.add(`fw-action-${def.variant}`);
    if (def.fullWidth) btn.classList.add("fw-action-block");
    const label = resolve(def.label, providers);
    btn.textContent = typeof label === "string" ? label : def.name;
    if (role === "submit") {
      scope.bind(() => (btn.disabled = form.isSubmitting.get()));
    } else if (role === "reset") {
      on(scope, btn, "click", () => form.reset());
    } else {
      on(scope, btn, "click", () => form.action(def.name));
    }
    bar.appendChild(btn);
  }
  return bar;
}

/** Mount a form into `host`. Returns a disposer that removes the form and tears down bindings. */
export function mount(form: Form, host: Element): Dispose {
  const scope = new Scope();
  const formEl = h("form", { class: "fw-form", novalidate: "" });

  const title = resolve(form.schema.title, form.options.providers);
  if (typeof title === "string") {
    const heading = h("h2", { class: "fw-title" });
    heading.textContent = title;
    formEl.appendChild(heading);
  }

  formEl.appendChild(renderAlert(form, scope));
  for (const node of form.tree) formEl.appendChild(renderNode(form, node, scope));
  formEl.appendChild(renderActions(form, scope));

  on(scope, formEl, "submit", (ev) => {
    ev.preventDefault();
    void form.submit().catch(() => {
      /* error surfaced via field errors + the form's "error" event + the alert */
    });
  });

  host.appendChild(formEl);

  return () => {
    scope.dispose();
    formEl.remove();
  };
}

/** The renderer object consumed by `Form.mount` / `setDefaultRenderer`. */
export const domRenderer: FormRenderer = { mount };
