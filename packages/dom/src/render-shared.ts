import type { FormAction } from "@formwright/schema";
import type { Form } from "@formwright/core";
import { resolve } from "@formwright/core";
import { h, on, Scope } from "./internal.js";

/** Render action buttons for a success screen (or other chrome). */
export function renderActionBar(
  form: Form,
  scope: Scope,
  actions: readonly FormAction[],
  align: "start" | "end" | "between" = "start",
): HTMLElement {
  const bar = h("div", { class: `fw-actions fw-actions-${align}` });
  const providers = form.options.providers;
  for (const def of actions) {
    const role = def.role ?? "button";
    const btn = h("button", { type: "button", class: "fw-action" });
    if (def.variant) btn.classList.add(`fw-action-${def.variant}`);
    if (def.fullWidth) btn.classList.add("fw-action-block");
    const label = resolve(def.label, providers);
    btn.textContent = typeof label === "string" ? label : def.name;
    if (role === "reset") {
      on(scope, btn, "click", () => form.dismissSuccess());
    } else {
      on(scope, btn, "click", () => form.action(def.name));
    }
    bar.appendChild(btn);
  }
  return bar;
}
