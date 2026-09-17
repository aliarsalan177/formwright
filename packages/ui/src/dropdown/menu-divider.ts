import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host { display: block; margin: 0.25rem -0.25rem; }
.line { height: 1px; background: var(--_border); }
`;

/**
 * `<fw-menu-divider>` — a line between groups of items in `<fw-dropdown>`.
 *
 * ```html
 * <fw-menu-item value="edit">Edit</fw-menu-item>
 * <fw-menu-divider></fw-menu-divider>
 * <fw-menu-item value="delete" danger>Delete</fw-menu-item>
 * ```
 *
 * Has `role="separator"`, so a screen reader announces the break.
 *
 * Parts: `line`.
 */
export class FwMenuDivider extends FwElement {
  static override props: PropMap = { ...FwElement.props };
  static override styles = styles;

  protected render(root: ShadowRoot): void {
    const line = document.createElement("div");
    line.className = "line";
    line.setAttribute("part", "line");
    root.append(line);
  }

  protected override connected(_scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "separator");
  }
}
