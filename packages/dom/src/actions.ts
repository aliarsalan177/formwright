import type { Form } from "@formwright/core";
import type { Scope } from "./internal.js";

/** Submit button: disabled + loading class + label swap while `form.isSubmitting`. */
export function bindSubmitButton(
  scope: Scope,
  btn: HTMLButtonElement,
  form: Form,
  labels: { default: string; loading?: string },
): void {
  scope.bind(() => {
    const loading = form.isSubmitting.get();
    btn.disabled = loading;
    btn.classList.toggle("fw-action-loading", loading);
    btn.setAttribute("aria-busy", loading ? "true" : "false");
    btn.textContent = loading ? (labels.loading ?? `${labels.default}…`) : labels.default;
  });
}

/** Non-submit controls: disabled while a submit is in flight. */
export function bindDisabledWhileSubmitting(
  scope: Scope,
  btn: HTMLButtonElement,
  form: Form,
): void {
  scope.bind(() => {
    btn.disabled = form.isSubmitting.get();
  });
}
