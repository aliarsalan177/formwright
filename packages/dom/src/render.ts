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
import { resolve } from "@formwright/core";
import { bindHidden, bindText, h, on, Scope } from "./internal.js";
import { renderControl } from "./widgets.js";

/** Render any node (leaf, group, or collection) into a fresh wrapper element. */
function renderNode(form: Form, node: FieldNode, scope: Scope): HTMLElement {
  if (node.kind === "group") return renderGroup(form, node, scope);
  if (node.kind === "collection") return renderCollection(form, node, scope);
  return renderLeaf(form, node, scope);
}

/** Add space-separated class tokens (e.g. Tailwind utilities) to an element. */
function addClass(el: HTMLElement, classes: string | undefined): void {
  if (classes) for (const c of classes.split(/\s+/)) if (c) el.classList.add(c);
}

/** A single leaf field: label, control, help, and error — each surgically bound. */
function renderLeaf(form: Form, field: FieldState, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const cx = field.schema.classes;
  const wrapper = h("div", { class: "fw-field", "data-field": field.id });
  addClass(wrapper, field.schema.class);
  addClass(wrapper, cx?.field);

  const labelText = resolve(field.schema.label, providers);
  const isCheckLike = field.schema.type === "checkbox" || field.schema.type === "toggle";
  if (typeof labelText === "string" && !isCheckLike) {
    const label = h("label", { for: `fw-${field.id}` });
    label.textContent = labelText;
    addClass(label, cx?.label);
    wrapper.appendChild(label);
  }

  const control = renderControl({ form, field, scope });
  addClass(control, cx?.control);
  wrapper.appendChild(control);

  // Check-like controls (checkbox/toggle): label sits after the control.
  if (typeof labelText === "string" && isCheckLike) {
    const label = h("label", { for: `fw-${field.id}`, class: "fw-inline-label" });
    label.textContent = labelText;
    addClass(label, cx?.label);
    wrapper.appendChild(label);
  }

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

  bindHidden(scope, wrapper, () => !field.visible.get());
  return wrapper;
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

/** A `group` object: a titled section (fieldset or accordion) of nested fields. */
function renderGroup(form: Form, group: GroupNode, scope: Scope): HTMLElement {
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

  for (const node of form.tree) formEl.appendChild(renderNode(form, node, scope));

  const submitBtn = h("button", { type: "submit", class: "fw-submit" });
  submitBtn.textContent = "Submit";
  scope.bind(() => {
    submitBtn.disabled = form.isSubmitting.get();
    submitBtn.textContent = form.isSubmitting.get() ? "Submitting…" : "Submit";
  });
  formEl.appendChild(submitBtn);

  on(scope, formEl, "submit", (ev) => {
    ev.preventDefault();
    void form.submit().catch(() => {
      /* error surfaced via field errors + the form's "error" event */
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
