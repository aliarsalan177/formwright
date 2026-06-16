import type { FormAction } from "@formwright/schema";
import type { Form } from "@formwright/core";
import { resolve } from "@formwright/core";
import { h, on, Scope } from "./internal.js";

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
  if (wrapper.class) host.className = wrapper.class;
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
    bar.appendChild(wrapNode(btn, def.wrapper));
  }
  return bar;
}
