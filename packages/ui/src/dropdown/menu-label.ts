import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: block; padding: 0.375rem 0.625rem 0.25rem;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em;
  color: var(--_muted); user-select: none;
}
`;

/**
 * `<fw-menu-label>` — a heading over a group of items in `<fw-dropdown>`.
 *
 * ```html
 * <fw-menu-label>Sort by</fw-menu-label>
 * <fw-menu-item type="radio" group="sort" value="name" checked>Name</fw-menu-item>
 * <fw-menu-item type="radio" group="sort" value="joined">Join date</fw-menu-item>
 * ```
 *
 * Presentational: it is not focusable and arrow keys pass over it.
 *
 * Slots: default. Parts: `base`.
 */
export class FwMenuLabel extends FwElement {
  static override props: PropMap = { ...FwElement.props };
  static override styles = styles;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("span");
    base.setAttribute("part", "base");
    base.append(document.createElement("slot"));
    root.append(base);
  }

  protected override connected(_scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "presentation");
  }
}
