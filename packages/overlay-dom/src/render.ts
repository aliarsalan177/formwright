import type { OverlayAction, OverlayBlock, OverlaySchema } from "@formwright/overlay-schema";
import type { OverlayEntry } from "@formwright/overlay-core";

/**
 * Schema to DOM. No framework, no diffing — an overlay is painted once
 * when it opens, so surgical updates would buy nothing.
 *
 * Text goes in through textContent, never innerHTML. The single
 * exception is the `html` block, which is documented as unsanitised and
 * exists for markup the application itself authored.
 */

export interface RenderContext {
  /** Content for `slot` blocks, supplied by the host at open time. */
  slots: Record<string, unknown>;
  /** Renders a `form` block. Absent unless the host wires one up, in
   *  which case form blocks are skipped rather than throwing — the
   *  overlay package must not depend on the form engine. */
  renderForm?: (schema: unknown, host: HTMLElement) => (() => void) | void;
  onAction(action: OverlayAction): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function renderBlock(
  block: OverlayBlock,
  ctx: RenderContext,
  disposers: (() => void)[],
): HTMLElement | null {
  switch (block.type) {
    case "text": {
      const p = el("p", "ow-text");
      if (block.tone) p.dataset.tone = block.tone;
      p.textContent = block.text;
      return p;
    }
    case "list": {
      const list = el(block.ordered ? "ol" : "ul", "ow-list");
      for (const item of block.items) {
        const li = el("li");
        li.textContent = item;
        list.appendChild(li);
      }
      return list;
    }
    case "fields": {
      const dl = el("dl", "ow-fields");
      for (const item of block.items) {
        const row = el("div", "ow-field");
        const dt = el("dt");
        dt.textContent = item.label;
        const dd = el("dd");
        dd.textContent = item.value;
        row.append(dt, dd);
        dl.appendChild(row);
      }
      return dl;
    }
    case "divider":
      return el("hr", "ow-rule");
    case "html": {
      // Documented as trusted: the schema author is the application.
      const div = el("div", "ow-html");
      div.innerHTML = block.html;
      return div;
    }
    case "form": {
      if (!ctx.renderForm) return null;
      const host = el("div", "ow-form");
      const dispose = ctx.renderForm(block.form, host);
      if (typeof dispose === "function") disposers.push(dispose);
      return host;
    }
    case "slot": {
      const supplied = ctx.slots[block.name];
      if (supplied instanceof HTMLElement) return supplied;
      if (typeof supplied === "string") {
        const p = el("p", "ow-text");
        p.textContent = supplied;
        return p;
      }
      return null;
    }
    default:
      return null;
  }
}

export interface RenderedPanel {
  panel: HTMLElement;
  grip: HTMLElement | null;
  dispose(): void;
}

export function renderPanel(entry: OverlayEntry, ctx: RenderContext): RenderedPanel {
  const schema: OverlaySchema = entry.schema;
  const disposers: (() => void)[] = [];

  const panel = el("div", "ow-panel");
  panel.dataset.kind = entry.kind;
  panel.dataset.size = schema.size ?? "md";
  panel.setAttribute("role", schema.dismiss === "alert" ? "alertdialog" : "dialog");
  panel.setAttribute("aria-modal", entry.dismiss === "non-modal" ? "false" : "true");
  panel.tabIndex = -1;
  if (entry.kind !== "modal") panel.dataset.edge = entry.side;

  // A sheet is grabbable by its grip only, so the list inside it can
  // still scroll. A drawer has no grip and drags from anywhere.
  let grip: HTMLElement | null = null;
  if (entry.kind === "sheet") {
    grip = el("div", "ow-grip");
    grip.setAttribute("aria-hidden", "true");
    panel.appendChild(grip);
  }

  if (schema.title || schema.description) {
    const head = el("div", "ow-head");
    if (schema.title) {
      const h = el("h2", "ow-title");
      h.id = `${entry.id}-title`;
      h.textContent = schema.title;
      head.appendChild(h);
      panel.setAttribute("aria-labelledby", h.id);
    }
    if (schema.description) {
      const p = el("p", "ow-desc");
      p.id = `${entry.id}-desc`;
      p.textContent = schema.description;
      head.appendChild(p);
      panel.setAttribute("aria-describedby", p.id);
    }
    panel.appendChild(head);
  }

  const body = el("div", "ow-body");
  for (const block of schema.body ?? []) {
    const node = renderBlock(block, ctx, disposers);
    if (node) body.appendChild(node);
  }
  panel.appendChild(body);

  if (schema.actions?.length) {
    const foot = el("div", "ow-foot");
    for (const action of schema.actions) {
      const button = el("button", "ow-action");
      button.type = "button";
      button.textContent = action.label;
      if (action.role) button.dataset.role = action.role;
      if (action.disabled) button.disabled = true;
      button.addEventListener("click", () => ctx.onAction(action));
      foot.appendChild(button);
    }
    panel.appendChild(foot);
  }

  return {
    panel,
    grip,
    dispose() {
      for (const fn of disposers) fn();
      disposers.length = 0;
    },
  };
}
