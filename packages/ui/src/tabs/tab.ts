import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: inline-flex; align-items: center; flex: none;
  outline: none; cursor: pointer; user-select: none;
  font-size: var(--_text-size); line-height: 1.25; white-space: nowrap;
  color: var(--_muted);
  transition: color var(--_duration), background-color var(--_duration), border-color var(--_duration), box-shadow var(--_duration);
}
:host(:hover) { color: var(--_text); }
:host([selected]) { color: var(--_text); }
:host(:focus-visible) { box-shadow: var(--_ring); }
:host([disabled]) { opacity: 0.5; cursor: not-allowed; }
.base { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; }
::slotted([slot="prefix"]), ::slotted([slot="suffix"]) { display: inline-flex; flex: none; }
`;

/**
 * `<fw-tab>` — one tab inside `<fw-tabs>`, naming the panel it shows.
 *
 * ```html
 * <fw-tabs value="general">
 *   <fw-tab slot="nav" panel="general">General</fw-tab>
 *   <fw-tab slot="nav" panel="billing" disabled>Billing</fw-tab>
 *   <fw-tab-panel name="general">…</fw-tab-panel>
 *   <fw-tab-panel name="billing">…</fw-tab-panel>
 * </fw-tabs>
 * ```
 *
 * The tab lives in the page, so its `role="tab"`, `aria-selected` and
 * `aria-controls` are what assistive technology reads; `<fw-tabs>` keeps
 * them — and `selected` and the roving `tabindex` — up to date. A tab
 * without a `slot` is moved to `slot="nav"` for you.
 *
 * Slots: default (label), `prefix`, `suffix`.
 * Parts: `base`.
 */
export class FwTab extends FwElement {
  static override props: PropMap = {
    panel: { type: "string" },
    disabled: { type: "boolean", reflect: true },
    /** Set by `<fw-tabs>`. */
    selected: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare panel: string | null;
  declare disabled: boolean;
  declare selected: boolean;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("span");
    base.className = "base";
    base.setAttribute("part", "base");
    const prefix = document.createElement("slot");
    prefix.name = "prefix";
    const suffix = document.createElement("slot");
    suffix.name = "suffix";
    base.append(prefix, document.createElement("slot"), suffix);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    this.setAttribute("role", "tab");
    if (!this.id) this.id = nextId("fw-tab");
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      this.setAttribute("aria-selected", String(this.prop<boolean>("selected").get()));
    });
    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });
  }
}
