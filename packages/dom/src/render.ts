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
  StepsNode,
} from "@formwright/core";
import { buildSkeletonPlanFromForm, isPresentational, resolve, signal } from "@formwright/core";
import { bindSubmitButton, bindDisabledWhileSubmitting } from "./actions.js";
import { bindHidden, bindText, h, on, Scope } from "./internal.js";
import { renderControl } from "./widgets.js";
import {
  renderPersistConsentBanner,
  renderResumeBanner,
  renderSuccessScreen,
} from "./resume-success.js";
import { renderSkeleton } from "./skeleton.js";
import { wireStepUrlSync } from "./step-url.js";

/** Render any node (leaf, group, collection, or steps) into a fresh wrapper element. */
function renderNode(form: Form, node: FieldNode, scope: Scope): HTMLElement {
  if (node.kind === "group") return wrapNode(renderGroup(form, node, scope), node.schema.wrapper);
  if (node.kind === "collection")
    return wrapNode(renderCollection(form, node, scope), node.schema.wrapper);
  if (node.kind === "steps") return wrapNode(renderSteps(form, node, scope), node.schema.wrapper);
  if (node.kind === "field") {
    if (isPresentational(node.schema.type)) {
      return wrapNode(renderPresentational(form, node, scope), node.schema.wrapper);
    }
    return wrapNode(renderLeaf(form, node, scope), node.schema.wrapper);
  }
  // `step` nodes render inside their parent `steps` container only.
  const panel = h("div", { class: "fw-step-panel", "data-field": node.id });
  renderFields(form, node.children, scope, panel);
  return wrapNode(panel, node.schema.wrapper);
}

/** Add space-separated class tokens (e.g. Tailwind utilities) to an element. */
function addClass(el: HTMLElement, classes: string | undefined): void {
  if (classes) for (const c of classes.split(/\s+/)) if (c) el.classList.add(c);
}

function wrapperAttrValue(value: string | number | boolean): string | null {
  if (value === false) return null;
  if (value === true) return "";
  return String(value);
}

function wrapNode(
  child: HTMLElement,
  wrapper:
    | { tag: string; class?: string; attrs?: Record<string, string | number | boolean> }
    | undefined,
): HTMLElement {
  if (!wrapper?.tag) return child;
  const host = document.createElement(wrapper.tag);
  if (wrapper.class) addClass(host, wrapper.class);
  if (wrapper.attrs) {
    for (const [name, raw] of Object.entries(wrapper.attrs)) {
      const value = wrapperAttrValue(raw);
      if (value === null) continue;
      host.setAttribute(name, value);
    }
  }
  host.appendChild(child);
  return host;
}

/** Apply a field's grid column span (for side-by-side layouts). */
function applyColSpan(
  el: HTMLElement,
  field: FieldState | GroupNode | CollectionNode | StepsNode,
): void {
  const span = field.schema.colSpan;
  if (typeof span === "number") el.style.gridColumn = `span ${span}`;
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
  applyColSpan(el, field);
  bindHidden(scope, el, () => !field.visible.get());
  return el;
}

/** A small info icon carrying a tooltip, placed next to a field's label. */
function tooltipIcon(text: string): HTMLElement {
  const icon = h("span", { class: "fw-tooltip", role: "img", "aria-label": text, title: text });
  icon.textContent = "ⓘ";
  return icon;
}

/** Build the label element (with a required marker + optional tooltip) for a field. */
function buildLabel(
  form: Form,
  field: FieldState,
  inline: boolean,
  scope?: Scope,
): HTMLElement | null {
  const labelText = resolve(field.schema.label, form.options.providers);
  if (typeof labelText !== "string") return null;
  const forId = field.domId ?? `fw-${field.id}`;
  const label = h("label", inline ? { for: forId, class: "fw-inline-label" } : { for: forId });
  const text = document.createElement("span");
  text.textContent = labelText;
  label.appendChild(text);
  addClass(label, field.schema.classes?.label);

  // Reactive "required" marker — only on fields that can be required (keeps other
  // labels' text clean), and reflects `requiredWhen`.
  const canRequire =
    field.schema.validation?.required === true || field.schema.requiredWhen !== undefined;
  if (scope && field.required && canRequire) {
    const req = h("span", { class: "fw-required", "aria-hidden": "true" });
    req.textContent = "*";
    scope.bind(() => {
      req.hidden = !field.required.get();
    });
    label.append(" ", req);
  }

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
  applyColSpan(wrapper, field);

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
  // `labelPosition: "start"` → an iPad-settings row: [label + description] … [control].
  const between = field.schema.labelPosition === "start";

  // Description text (used in the head for `between`, otherwise below label/field).
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

  const label = buildLabel(form, field, isCheckLike && !between, scope);
  const control = withSlots(form, field, renderControl({ form, field, scope }));
  addClass(control, cx?.control);

  if (between) {
    // Row: label (+ description) on the left, control on the right.
    wrapper.classList.add("fw-field-between");
    const row = h("div", { class: "fw-field-row" });
    const head = h("div", { class: "fw-field-head" });
    if (label) head.appendChild(label);
    if (descEl && !descBelowField) head.appendChild(descEl);
    row.append(head, control);
    wrapper.appendChild(row);
    if (descEl && descBelowField) wrapper.appendChild(descEl);
  } else {
    // Stacked: label, [description], control, [check-like label after control].
    if (label && !isCheckLike) wrapper.appendChild(label);
    if (descEl && !descBelowField) wrapper.appendChild(descEl);
    wrapper.appendChild(control);
    if (label && isCheckLike) wrapper.appendChild(label);
    if (descEl && descBelowField) wrapper.appendChild(descEl);
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
  applyColSpan(wrapper, group);
  const label = buildLabel(form, group as unknown as FieldState, false, scope);
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
    applyColSpan(details, group);
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
  applyColSpan(fieldset, group);
  if (typeof title === "string") {
    const legend = h("legend", { class: "fw-legend" });
    legend.textContent = title;
    fieldset.appendChild(legend);
  }
  renderFields(form, group.children, scope, fieldset);
  bindHidden(scope, fieldset, () => !group.visible.get());
  return fieldset;
}

/** A multi-step wizard: progress indicator, one step panel at a time, Back/Next/Submit. */
function renderSteps(form: Form, steps: StepsNode, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const schema = steps.schema;
  const wrapper = h("div", { class: "fw-steps", "data-field": steps.id });
  applyColSpan(wrapper, steps);

  const title = resolve(schema.label, providers);
  if (typeof title === "string") {
    const heading = h("div", { class: "fw-steps-title" });
    heading.textContent = title;
    wrapper.appendChild(heading);
  }

  const showProgress = schema.showProgress !== false;
  const progressStyle = schema.layout ?? "bar";
  const progress = h("div", { class: `fw-steps-progress fw-steps-progress-${progressStyle}` });
  if (!showProgress) progress.hidden = true;
  wrapper.appendChild(progress);

  const panelsHost = h("div", { class: "fw-steps-panels" });
  wrapper.appendChild(panelsHost);

  const nav = h("div", { class: "fw-steps-nav" });
  const backBtn = h("button", { type: "button", class: "fw-steps-back" });
  const nextBtn = h("button", { type: "button", class: "fw-steps-next fw-action-primary" });
  const submitBtn = h("button", { type: "submit", class: "fw-steps-submit fw-action-primary" });
  nav.append(backBtn, nextBtn, submitBtn);
  wrapper.appendChild(nav);

  const prevLabel = resolve(schema.prevLabel, providers);
  const nextLabel = resolve(schema.nextLabel, providers);
  const submitLabel = resolve(schema.submitLabel, providers);
  backBtn.textContent = typeof prevLabel === "string" ? prevLabel : "Back";
  nextBtn.textContent = typeof nextLabel === "string" ? nextLabel : "Next";
  submitBtn.textContent = typeof submitLabel === "string" ? submitLabel : "Submit";

  on(scope, backBtn, "click", () => steps.prev());
  on(scope, nextBtn, "click", () => steps.next());

  bindDisabledWhileSubmitting(scope, backBtn, form);
  bindDisabledWhileSubmitting(scope, nextBtn, form);
  bindSubmitButton(scope, submitBtn, form, {
    default: typeof submitLabel === "string" ? submitLabel : "Submit",
    ...(typeof submitLabel === "string" ? { loading: `${submitLabel}…` } : {}),
  });

  const urlPattern = schema.urlSync;
  if (urlPattern) {
    scope.add(wireStepUrlSync(form, steps, urlPattern, schema.urlSyncBy ?? "id", scope));
  }

  let stepScope: Scope | null = null;
  scope.bind(() => {
    const index = steps.currentStep.get();
    const total = steps.steps.length;
    const isFirst = index === 0;
    const isLast = index === total - 1;

    backBtn.hidden = isFirst;
    backBtn.style.display = isFirst ? "none" : "";
    nextBtn.hidden = isLast;
    nextBtn.style.display = isLast ? "none" : "";
    submitBtn.hidden = !isLast;
    submitBtn.style.display = isLast ? "" : "none";

    stepScope?.dispose();
    stepScope = new Scope();

    progress.replaceChildren();
    if (showProgress) {
      if (progressStyle === "fill") {
        const fill = h("div", { class: "fw-steps-progress-fill" });
        const track = h("div", { class: "fw-steps-progress-track" });
        const bar = h("div", { class: "fw-steps-progress-bar" });
        bar.style.width = `${Math.round(((index + 1) / total) * 100)}%`;
        track.appendChild(bar);
        fill.appendChild(track);
        const label = h("div", { class: "fw-steps-progress-label" });
        const stepTitle = resolve(steps.steps[index]?.schema.label, providers);
        const name = typeof stepTitle === "string" ? stepTitle : (steps.steps[index]?.id ?? "");
        label.textContent = `Step ${index + 1} of ${total}${name ? ` — ${name}` : ""}`;
        fill.appendChild(label);
        progress.appendChild(fill);
      } else {
        steps.steps.forEach((step, i) => {
          const stepTitle = resolve(step.schema.label, providers);
          const label = typeof stepTitle === "string" ? stepTitle : step.id;
          if (progressStyle === "tabs") {
            const tab = h("button", {
              type: "button",
              class: "fw-steps-tab",
              "data-step": String(i),
            });
            if (i === index) tab.setAttribute("aria-current", "step");
            tab.textContent = label;
            scope.bind(() => {
              tab.disabled = i > index || form.isSubmitting.get();
            });
            on(stepScope!, tab, "click", () => {
              if (i <= index) steps.goTo(i);
            });
            progress.appendChild(tab);
          } else if (progressStyle === "numbers") {
            const item = h("div", {
              class: "fw-steps-number",
              "data-step": String(i),
            });
            if (i === index) item.setAttribute("aria-current", "step");
            item.textContent = String(i + 1);
            progress.appendChild(item);
            if (i < total - 1) {
              const sep = h("div", { class: "fw-steps-sep", "aria-hidden": "true" });
              sep.textContent = "→";
              progress.appendChild(sep);
            }
          } else {
            const item = h("div", {
              class: "fw-steps-bar-item",
              "data-step": String(i),
            });
            if (i === index) item.setAttribute("aria-current", "step");
            item.textContent = label;
            progress.appendChild(item);
          }
        });
      }
    }

    panelsHost.replaceChildren();
    const step = steps.steps[index];
    if (step) {
      const panel = h("section", {
        class: "fw-step-panel",
        "data-step": String(index),
        "aria-labelledby": `fw-step-${steps.id}-${index}`,
      });
      const stepTitle = resolve(step.schema.label, providers);
      if (typeof stepTitle === "string") {
        const head = h("h3", {
          class: "fw-step-heading",
          id: `fw-step-${steps.id}-${index}`,
        });
        head.textContent = stepTitle;
        panel.appendChild(head);
      }
      const desc = resolve(step.schema.description, providers);
      if (typeof desc === "string") {
        const descEl = h("p", { class: "fw-step-description" });
        descEl.textContent = desc;
        panel.appendChild(descEl);
      }
      renderFields(form, step.children, stepScope!, panel);
      panelsHost.appendChild(panel);
    }
  });
  scope.add(() => stepScope?.dispose());

  bindHidden(scope, wrapper, () => !steps.visible.get());
  return wrapper;
}

/** True when the form tree contains a top-level steps container (nav replaces default actions). */
function hasTopLevelSteps(form: Form): boolean {
  return form.tree.some((node) => node.kind === "steps");
}

/** A `collection`: a repeatable list of rows with add/remove honouring min/max. */
function renderCollection(form: Form, collection: CollectionNode, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const layout = collection.schema.layout ?? "list";
  const wrapper = h("div", {
    class: `fw-collection fw-collection-${layout}`,
    "data-field": collection.id,
  });
  applyColSpan(wrapper, collection);

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

  // An explicit empty `actions: []` opts out of buttons entirely (e.g. a
  // settings panel that applies instantly or supplies its own Save control).
  if (actions && actions.length === 0) return bar;

  if (!actions) {
    const submit = h("button", { type: "submit", class: "fw-submit" });
    bindSubmitButton(scope, submit, form, { default: "Submit" });
    bar.appendChild(submit);
    return bar;
  }

  for (const def of actions) {
    const role = def.role ?? "button";
    const btn = h("button", { type: role === "submit" ? "submit" : "button", class: "fw-action" });
    if (def.variant) btn.classList.add(`fw-action-${def.variant}`);
    if (def.fullWidth) btn.classList.add("fw-action-block");
    const label = resolve(def.label, providers);
    const labelText = typeof label === "string" ? label : def.name;
    btn.textContent = labelText;
    if (role === "submit") {
      bindSubmitButton(scope, btn, form, { default: labelText });
    } else {
      bindDisabledWhileSubmitting(scope, btn, form);
    }
    if (role === "reset") {
      on(scope, btn, "click", () => form.reset());
    } else if (role !== "submit") {
      on(scope, btn, "click", () => form.action(def.name));
    }
    bar.appendChild(wrapNode(btn, def.wrapper));
  }
  return bar;
}

/** Mount a form into `host`. Returns a disposer that removes the form and tears down bindings. */
export function mount(
  form: Form,
  host: Element,
  options?: import("@formwright/core").DomRendererOptions,
): Dispose {
  const scope = new Scope();
  const formEl = h("form", { class: "fw-form", novalidate: "" });
  const body = h("div", { class: "fw-form-body" });
  const skeletonOverlay = h("div", { class: "fw-skeleton-overlay", hidden: "" });

  const title = resolve(form.schema.title, form.options.providers);
  if (typeof title === "string") {
    const heading = h("h2", { class: "fw-title" });
    heading.textContent = title;
    formEl.appendChild(heading);
  }

  if (form.options.persistKey) {
    formEl.appendChild(renderResumeBanner(form, scope));
    if (form.schema.persist?.mode === "consent") {
      formEl.appendChild(renderPersistConsentBanner(form, scope));
    }
  }

  formEl.appendChild(renderAlert(form, scope));
  for (const node of form.tree) body.appendChild(renderNode(form, node, scope));
  if (!hasTopLevelSteps(form)) body.appendChild(renderActions(form, scope));
  body.appendChild(skeletonOverlay);
  formEl.appendChild(body);

  scope.bind(() => {
    const submitting = form.isSubmitting.get();
    const showSkeleton = submitting && form.schema.loading?.onSubmit !== false;
    body.classList.toggle("fw-form-body-loading", submitting);
    body.setAttribute("aria-busy", submitting ? "true" : "false");
    if (showSkeleton) {
      skeletonOverlay.replaceChildren(renderSkeleton(buildSkeletonPlanFromForm(form)));
      skeletonOverlay.hidden = false;
    } else {
      skeletonOverlay.hidden = true;
      skeletonOverlay.replaceChildren();
    }
  });

  const successHost = h("div", { class: "fw-success-host" });
  let customSuccessDispose: Dispose | null = null;
  if (options?.renderSuccess) {
    scope.bind(() => {
      if (!form.showSuccessScreen.get()) {
        customSuccessDispose?.();
        customSuccessDispose = null;
        successHost.replaceChildren();
        return;
      }
      customSuccessDispose?.();
      successHost.replaceChildren();
      customSuccessDispose = options.renderSuccess!(form.successContext(), successHost) ?? null;
    });
    scope.add(() => customSuccessDispose?.());
  } else if (form.schema.success) {
    successHost.appendChild(renderSuccessScreen(form, scope));
  }
  formEl.appendChild(successHost);

  scope.bind(() => {
    const showSuccess = form.showSuccessScreen.get();
    body.hidden = showSuccess;
    body.style.display = showSuccess ? "none" : "";
  });

  on(scope, formEl, "submit", (ev) => {
    ev.preventDefault();
    if (form.showSuccessScreen.peek()) return;
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
