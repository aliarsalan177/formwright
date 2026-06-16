import type { Form } from "@formwright/core";
import type { Scope } from "./internal.js";

function setDisabled(el: HTMLElement, disabled: boolean): void {
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = disabled;
    return;
  }
  el.toggleAttribute("disabled", disabled);
  el.setAttribute("aria-disabled", disabled ? "true" : "false");
  el.classList.toggle("fw-action-disabled", disabled);
}

/** Submit control: disabled + loading class + label swap while `form.isSubmitting`. */
export function bindSubmitControl(
  scope: Scope,
  el: HTMLElement,
  form: Form,
  labels: { default: string; loading?: string },
): void {
  scope.bind(() => {
    const loading = form.isSubmitting.get();
    setDisabled(el, loading);
    el.classList.toggle("fw-action-loading", loading);
    el.setAttribute("aria-busy", loading ? "true" : "false");
    el.textContent = loading ? (labels.loading ?? `${labels.default}…`) : labels.default;
  });
}

/** @deprecated Use {@link bindSubmitControl}. */
export function bindSubmitButton(
  scope: Scope,
  btn: HTMLButtonElement,
  form: Form,
  labels: { default: string; loading?: string },
): void {
  bindSubmitControl(scope, btn, form, labels);
}

/** Non-submit controls: disabled while a submit is in flight. */
export function bindDisabledWhileSubmitting(scope: Scope, el: HTMLElement, form: Form): void {
  scope.bind(() => {
    setDisabled(el, form.isSubmitting.get());
  });
}
