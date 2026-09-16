import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host { display: block; outline: none; border-radius: var(--_radius-sm); }
:host(:focus-visible) { box-shadow: var(--_ring); }
.base { display: block; padding-block: 1rem; }
`;

/**
 * `<fw-tab-panel>` — the content one `<fw-tab>` shows.
 *
 * ```html
 * <fw-tab-panel name="general"><p>General settings</p></fw-tab-panel>
 * ```
 *
 * `<fw-tabs>` sets `role="tabpanel"`, `aria-labelledby` pointing at its
 * tab, `hidden` while another tab is selected, and `tabindex="0"` when the
 * panel holds nothing focusable of its own, so keyboard users can still
 * reach and scroll it.
 *
 * Slots: default. Parts: `base`.
 */
export class FwTabPanel extends FwElement {
  static override props: PropMap = {
    name: { type: "string" },
  };
  static override styles = styles;

  declare name: string | null;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");
    base.append(document.createElement("slot"));
    root.append(base);
  }

  protected override connected(_scope: Scope): void {
    this.setAttribute("role", "tabpanel");
    if (!this.id) this.id = nextId("fw-tab-panel");
  }
}
