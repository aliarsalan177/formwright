import type { FieldSchema } from "@formwright/schema";
import type { Scope } from "./internal.js";
import { bindHidden, h } from "./internal.js";

export interface AccordionWidgetSpec {
  readonly tag?: string;
  readonly headerTag?: string;
  readonly bodyTag?: string;
  readonly titleProp?: string;
  readonly openProp?: string;
  readonly attrs?: Record<string, string>;
  readonly headerAttrs?: Record<string, string>;
  readonly bodyAttrs?: Record<string, string>;
}

const accordionRegistry = new Map<string, AccordionWidgetSpec>();

/** Register a named accordion shell (used when `widget` is a string or `widget.component`). */
export function registerAccordionWidget(name: string, spec: AccordionWidgetSpec): void {
  accordionRegistry.set(name, spec);
}

function setElementProp(el: HTMLElement, name: string, value: unknown): void {
  (el as HTMLElement & Record<string, unknown>)[name] = value;
}

function applyAttrs(el: HTMLElement, attrs?: Record<string, string>): void {
  if (!attrs) return;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
}

function resolveAccordionSpec(schema: FieldSchema): AccordionWidgetSpec {
  const ref = schema.widget;
  if (!ref) return {};
  if (typeof ref === "string") return accordionRegistry.get(ref) ?? {};
  const registered = ref.component ? accordionRegistry.get(ref.component) : undefined;
  return {
    ...registered,
    ...(ref.tag !== undefined ? { tag: ref.tag } : {}),
    ...(ref.headerTag !== undefined ? { headerTag: ref.headerTag } : {}),
    ...(ref.bodyTag !== undefined ? { bodyTag: ref.bodyTag } : {}),
    ...(ref.titleProp !== undefined ? { titleProp: ref.titleProp } : {}),
    ...(ref.openProp !== undefined ? { openProp: ref.openProp } : {}),
    attrs: { ...registered?.attrs, ...ref.attrs },
    headerAttrs: { ...registered?.headerAttrs, ...ref.headerAttrs },
    bodyAttrs: { ...registered?.bodyAttrs, ...ref.bodyAttrs },
  };
}

export interface RenderAccordionOptions {
  readonly title: string;
  readonly hostClass: string;
  readonly bodyClass: string;
  readonly dataField?: string;
  readonly open?: boolean;
  readonly onHidden?: () => boolean;
}

/** Render an accordion shell (native `<details>` or custom tags via `widget`). */
export function renderAccordion(
  schema: FieldSchema,
  scope: Scope,
  options: RenderAccordionOptions,
  fillBody: (body: HTMLElement) => void,
): HTMLElement {
  const spec = resolveAccordionSpec(schema);
  const hostTag = spec.tag ?? "details";
  const headerTag = spec.headerTag ?? "summary";
  const bodyTag = spec.bodyTag ?? "div";
  const open = options.open !== false;
  const nativeDetails = hostTag === "details";

  const host = nativeDetails
    ? h("details", {
        class: `fw-accordion ${options.hostClass}`.trim(),
        ...(options.dataField ? { "data-field": options.dataField } : {}),
        ...(open ? { open: "" } : {}),
      })
    : (() => {
        const el = document.createElement(hostTag);
        el.classList.add("fw-accordion", ...options.hostClass.split(/\s+/).filter(Boolean));
        if (options.dataField) el.setAttribute("data-field", options.dataField);
        applyAttrs(el, spec.attrs);
        if (spec.openProp) setElementProp(el, spec.openProp, open);
        else if (open) el.setAttribute("open", "");
        return el;
      })();

  if (nativeDetails && spec.attrs) applyAttrs(host, spec.attrs);

  if (spec.titleProp) {
    setElementProp(host, spec.titleProp, options.title);
  } else {
    const header = document.createElement(headerTag);
    header.className = "fw-accordion-head";
    applyAttrs(header, spec.headerAttrs);
    header.textContent = options.title;
    host.appendChild(header);
  }

  const body = document.createElement(bodyTag);
  body.className = options.bodyClass;
  applyAttrs(body, spec.bodyAttrs);
  fillBody(body);
  host.appendChild(body);

  if (options.onHidden) bindHidden(scope, host, options.onHidden);
  return host;
}
