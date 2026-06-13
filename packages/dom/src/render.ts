/**
 * Orchestrates mounting a {@link Form} into the DOM. Each field is rendered once
 * to real elements; reactive bindings then keep individual nodes in sync. Hidden
 * fields toggle via the `hidden` attribute (kept in the DOM so re-showing is O(1)).
 */
import type { Dispose, Form, FormRenderer } from "@formwright/core";
import { resolve } from "@formwright/core";
import { bindHidden, bindText, h, on, Scope } from "./internal.js";
import { getWidget } from "./widgets.js";

function renderField(form: Form, fieldId: string, scope: Scope): HTMLElement {
  const field = form.fields.get(fieldId)!;
  const providers = form.options.providers;

  const wrapper = h("div", { class: "fw-field", "data-field": fieldId });

  const labelText = resolve(field.schema.label, providers);
  if (typeof labelText === "string" && field.schema.type !== "checkbox") {
    const label = h("label", { for: `fw-${fieldId}` });
    label.textContent = labelText;
    wrapper.appendChild(label);
  }

  const control = getWidget(field.schema.type)({ form, field, scope });
  wrapper.appendChild(control);

  // Checkbox: label sits after the control.
  if (typeof labelText === "string" && field.schema.type === "checkbox") {
    const label = h("label", { for: `fw-${fieldId}` });
    label.textContent = ` ${labelText}`;
    wrapper.appendChild(label);
  }

  const help = resolve(field.schema.help, providers);
  if (typeof help === "string") {
    const helpEl = h("small", { class: "fw-help" });
    helpEl.textContent = help;
    wrapper.appendChild(helpEl);
  }

  // Error message — surgical: only this node updates when the field's error changes.
  const errorEl = h("p", { class: "fw-error", role: "alert" });
  bindText(scope, errorEl, () => field.error.get() ?? "");
  scope.bind(() => {
    errorEl.hidden = field.error.get() === null;
    wrapper.classList.toggle("fw-invalid", field.error.get() !== null);
  });
  wrapper.appendChild(errorEl);

  // Conditional visibility.
  bindHidden(scope, wrapper, () => !field.visible.get());

  return wrapper;
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

  for (const fieldId of form.order) {
    formEl.appendChild(renderField(form, fieldId, scope));
  }

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
