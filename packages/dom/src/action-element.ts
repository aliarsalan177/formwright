import type { FormAction } from "@formwright/schema";
import type { WidgetRef } from "@formwright/schema";
import type { Form } from "@formwright/core";
import { resolve } from "@formwright/core";
import { h, on, Scope } from "./internal.js";
import { bindDisabledWhileSubmitting, bindSubmitControl } from "./actions.js";
import type { WidgetSpec } from "./widgets.js";

export interface ActionWidgetContext {
  readonly form: Form;
  readonly scope: Scope;
  readonly def: FormAction;
  readonly labelText: string;
  readonly options: RenderActionOptions;
}

export type ActionWidget = ((ctx: ActionWidgetContext) => HTMLElement) | WidgetSpec;

const actionRegistry = new Map<string, ActionWidget>();

/** Register a named action widget (used when `widget` is a string or `widget.component`). */
export function registerActionWidget(name: string, widget: ActionWidget): void {
  actionRegistry.set(name, widget);
}

export interface RenderActionOptions {
  /** Success-screen actions never use native `type="submit"`. */
  readonly successScreen?: boolean;
}

function specFromRef(ref: Exclude<WidgetRef, string>): WidgetSpec {
  const spec: WidgetSpec = {};
  if (ref.tag !== undefined) spec.tag = ref.tag;
  if (ref.valueProp !== undefined) spec.valueProp = ref.valueProp;
  if (ref.event !== undefined) spec.event = ref.event;
  if (ref.attrs !== undefined) spec.attrs = ref.attrs;
  return spec;
}

function buildFromSpec(spec: WidgetSpec): HTMLElement {
  const tag = spec.tag ?? "button";
  const el = document.createElement(tag);
  el.classList.add("fw-action");
  if (spec.attrs) {
    for (const [name, value] of Object.entries(spec.attrs)) el.setAttribute(name, value);
  }
  if (tag !== "button" && el.tagName !== "A") el.setAttribute("role", "button");
  return el;
}

function nativeButton(
  role: NonNullable<FormAction["role"]>,
  options: RenderActionOptions,
): HTMLElement {
  return h("button", {
    type: role === "submit" && !options.successScreen ? "submit" : "button",
    class: "fw-action",
  });
}

function resolveActionHost(
  def: FormAction,
  ctx: ActionWidgetContext,
): { el: HTMLElement; native: boolean } {
  const ref = def.widget;
  if (!ref) {
    const role = def.role ?? "button";
    return { el: nativeButton(role, ctx.options), native: true };
  }

  if (typeof ref === "string") {
    const widget = actionRegistry.get(ref);
    if (!widget) {
      const role = def.role ?? "button";
      return { el: nativeButton(role, ctx.options), native: true };
    }
    if (typeof widget === "function") return { el: widget(ctx), native: false };
    const tag = widget.tag ?? "button";
    return { el: buildFromSpec(widget), native: tag === "button" };
  }

  if (ref.component) {
    const registered = actionRegistry.get(ref.component);
    const spec = registered && typeof registered !== "function" ? registered : {};
    const merged = { ...spec, ...specFromRef(ref) };
    const tag = merged.tag ?? "button";
    return { el: buildFromSpec(merged), native: tag === "button" };
  }

  const tag = ref.tag ?? "button";
  return { el: buildFromSpec(specFromRef(ref)), native: tag === "button" };
}

function wireActionBehavior(
  form: Form,
  scope: Scope,
  def: FormAction,
  el: HTMLElement,
  labelText: string,
  native: boolean,
  options: RenderActionOptions,
): void {
  const role = def.role ?? "button";

  if (options.successScreen) {
    if (role === "reset") {
      on(scope, el, "click", () => form.dismissSuccess());
    } else {
      on(scope, el, "click", () => form.action(def.name));
    }
    return;
  }

  if (role === "submit") {
    bindSubmitControl(scope, el, form, { default: labelText });
    if (!native) {
      on(scope, el, "click", (e) => {
        e.preventDefault();
        if (!form.isSubmitting.get()) void form.submit();
      });
    }
    return;
  }

  bindDisabledWhileSubmitting(scope, el, form);
  if (role === "reset") {
    on(scope, el, "click", () => form.reset());
  } else {
    on(scope, el, "click", () => form.action(def.name));
  }
}

/** Create the action control node, honoring an optional {@link WidgetRef} override. */
export function createActionElement(
  form: Form,
  scope: Scope,
  def: FormAction,
  options: RenderActionOptions = {},
): HTMLElement {
  const providers = form.options.providers;
  const label = resolve(def.label, providers);
  const labelText = typeof label === "string" ? label : def.name;
  const ctx: ActionWidgetContext = { form, scope, def, labelText, options };

  const { el, native } = resolveActionHost(def, ctx);
  if (def.variant) el.classList.add(`fw-action-${def.variant}`);
  if (def.fullWidth) el.classList.add("fw-action-block");
  el.textContent = labelText;

  wireActionBehavior(form, scope, def, el, labelText, native, options);
  return el;
}
