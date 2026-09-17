import { untrack } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import type { PropMap } from "../core/element.js";
import { FwItemBase, itemStyles } from "../core/item.js";
import type { FwSubmenu } from "./submenu.js";

export type MenuItemType = "normal" | "checkbox" | "radio";

const styles =
  itemStyles +
  /* css */ `
/* Checkbox and radio items lead with their indicator, as menus do. */
:host([type="checkbox"]) .check, :host([type="radio"]) .check { display: inline-flex; visibility: hidden; }
:host([checked]) .check { visibility: visible; }
.check .dot, :host([type="radio"]) .check .tick { display: none; }
:host([type="radio"]) .check .dot { display: block; }
`;

const DOT = `<svg class="dot" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`;

const ROLE: Record<MenuItemType, string> = {
  normal: "menuitem",
  checkbox: "menuitemcheckbox",
  radio: "menuitemradio",
};

/**
 * `<fw-menu-item>` — one action inside `<fw-dropdown>`.
 *
 * ```html
 * <fw-menu-item value="edit"><svg slot="prefix" …></svg>Edit<kbd slot="suffix">⌘E</kbd></fw-menu-item>
 * <fw-menu-item value="delete" danger>Delete member</fw-menu-item>
 * <fw-menu-item value="export" description="CSV of every member">Export</fw-menu-item>
 * <fw-menu-item type="checkbox" value="archived" checked>Show archived</fw-menu-item>
 * <fw-menu-item type="radio" group="sort" value="name" checked>Sort by name</fw-menu-item>
 * <fw-menu-item type="radio" group="sort" value="joined">Sort by join date</fw-menu-item>
 * <fw-menu-item>
 *   Share
 *   <fw-submenu slot="submenu">
 *     <fw-menu-item value="email">Email</fw-menu-item>
 *   </fw-submenu>
 * </fw-menu-item>
 * ```
 *
 * `type="checkbox"` items toggle `checked` when chosen; `type="radio"`
 * items become checked and uncheck every other radio item with the same
 * `group` in the same dropdown or submenu. An item holding a
 * `<fw-submenu>` gets `aria-haspopup="menu"`, `aria-expanded` and a
 * chevron (mirrored right-to-left), and opens the submenu instead of
 * being chosen. The item is the page's own element, so its
 * role, `aria-checked` and `aria-disabled` are set on it directly and it
 * receives real focus while the menu is open.
 *
 * It is the shared item row (see `FwItemBase`), so it renders exactly like
 * `<fw-option>` and `<fw-list-item>`. A plain `<fw-list-item>` works as a
 * normal menu item too; checkbox, radio and submenu items stay
 * `<fw-menu-item>`.
 *
 * Slots: default (label), `prefix` (icon), `description`, `suffix` (shortcut hint),
 * `submenu` (an `<fw-submenu>`).
 * Parts: `check`, `label`, `description`, `suffix`, `chevron`.
 */
export class FwMenuItem extends FwItemBase {
  static override props: PropMap = {
    ...FwItemBase.props,
    type: { type: "string", reflect: true, default: "normal" },
    checked: { type: "boolean", reflect: true },
    group: { type: "string" },
  };
  static override styles = styles;

  declare type: MenuItemType;
  declare checked: boolean;
  declare group: string | null;

  /** The `<fw-submenu>` this item opens, if it has one. */
  get submenu(): FwSubmenu | null {
    return this.querySelector<FwSubmenu>(":scope > fw-submenu");
  }

  protected override render(root: ShadowRoot): void {
    super.render(root);
    this.itemParts.check.insertAdjacentHTML("beforeend", DOT);
    const submenu = document.createElement("slot");
    submenu.name = "submenu";
    root.append(submenu);
  }

  protected override connected(scope: Scope): void {
    super.connected(scope);
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      const type = this.#type(this.prop<string>("type").get());
      this.setAttribute("role", ROLE[type]);
      if (type === "normal") this.removeAttribute("aria-checked");
      else this.setAttribute("aria-checked", String(this.prop<boolean>("checked").get()));
    });

    // A radio item that becomes checked, however it happened, unchecks
    // the rest of its group — like a native radio button.
    scope.bind(() => {
      const checked = this.prop<boolean>("checked").get();
      const type = this.#type(this.prop<string>("type").get());
      const group = this.prop<string | null>("group").get();
      if (!checked || type !== "radio") return;
      const menu = this.closest("fw-submenu, fw-dropdown");
      const container = menu ?? this.parentElement;
      if (!container) return;
      // Untracked: reading the others' state must not subscribe this item
      // to them, or their becoming checked would re-run this and fight.
      untrack(() => {
        for (const other of container.querySelectorAll<FwMenuItem>("fw-menu-item")) {
          if (other === this || !other.checked) continue;
          if (other.type !== "radio" || (other.group ?? null) !== (group ?? null)) continue;
          if (other.closest("fw-submenu, fw-dropdown") !== menu) continue;
          other.checked = false;
        }
      });
    });
  }

  #type(value: string | null): MenuItemType {
    return value === "checkbox" || value === "radio" ? value : "normal";
  }
}
