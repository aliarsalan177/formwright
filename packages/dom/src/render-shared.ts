import type { FormAction } from "@formwright/schema";
import type { Form } from "@formwright/core";
import { h, Scope } from "./internal.js";
import { createActionElement } from "./action-element.js";
import { wrapNode } from "./wrappers.js";

/** Render action buttons for a success screen (or other chrome). */
export function renderActionBar(
  form: Form,
  scope: Scope,
  actions: readonly FormAction[],
  align: "start" | "end" | "between" = "start",
): HTMLElement {
  const bar = h("div", { class: `fw-actions fw-actions-${align}` });
  for (const def of actions) {
    const el = createActionElement(form, scope, def, { successScreen: true });
    bar.appendChild(wrapNode(el, def.wrapper));
  }
  return bar;
}
