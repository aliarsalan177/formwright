import {
  anchorTo,
  createCollection,
  type Anchored,
  type Collection,
  type Scope,
} from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import type { FwListItem } from "../list/list-item.js";
import type { FwMenuItem } from "./menu-item.js";

/** @internal The panel look shared by `<fw-dropdown>` and `<fw-submenu>`. */
export const menuStyles = /* css */ `
:host { display: contents; }

.menu {
  margin: 0; inset: auto; padding: 0.25rem;
  min-width: 10rem;
  max-height: min(24rem, var(--fw-available-height, 24rem));
  overflow: auto; overscroll-behavior: contain;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border);
  /* Capped so a pill-shaped theme still gets a panel, not a lozenge. */
  border-radius: min(var(--_radius), 0.75rem);
  box-shadow: var(--_shadow);
  font-family: var(--_font);
  outline: none;
}
`;

// Up by the panel's padding and border, so the first item lines up with
// the item that opened it.
const styles =
  menuStyles + /* css */ `.menu { margin-top: calc(-0.25rem - 1px); cursor: default; }`;

/** @internal */
export const hasPopover =
  typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** @internal The element whose items an item moves among: its nearest submenu or dropdown. */
export const MENU = "fw-submenu, fw-dropdown";

/** An item a menu moves among and chooses: a `<fw-menu-item>`, or a `<fw-list-item>` acting as a plain one. */
export type MenuEntry = FwMenuItem | FwListItem;

/** @internal The submenu an item opens: only a `<fw-menu-item>` can have one. */
export function submenuOf(item: MenuEntry): FwSubmenu | null {
  return item.localName === "fw-menu-item" ? (item as FwMenuItem).submenu : null;
}

/** @internal A menu's own items — not those of a submenu or dropdown inside it. */
export function ownItems(menu: Element): MenuEntry[] {
  return [...menu.querySelectorAll<MenuEntry>("fw-menu-item, fw-list-item")].filter((item) => {
    if (item.closest(MENU) !== menu) return false;
    const trigger = item.closest('[slot="trigger"]');
    return !trigger || !menu.contains(trigger);
  });
}

/** @internal Right-to-left? Falls back to the nearest `dir` where there is no layout (jsdom). */
export function isRtl(el: Element): boolean {
  const direction = getComputedStyle(el).direction;
  return direction ? direction === "rtl" : el.closest("[dir]")?.getAttribute("dir") === "rtl";
}

/**
 * `<fw-submenu>` — a nested menu, opened from the `<fw-menu-item>` it sits in.
 *
 * ```html
 * <fw-dropdown>
 *   <button slot="trigger">Actions</button>
 *   <fw-menu-item value="edit">Edit</fw-menu-item>
 *   <fw-menu-item>
 *     Share
 *     <fw-submenu slot="submenu">
 *       <fw-menu-item value="email">Email</fw-menu-item>
 *       <fw-menu-item value="link">Copy link</fw-menu-item>
 *     </fw-submenu>
 *   </fw-menu-item>
 * </fw-dropdown>
 * ```
 *
 * It nests to any depth. The item it sits in gets `aria-haspopup="menu"`,
 * `aria-expanded` and a chevron, and opens it rather than being chosen.
 * The panel goes in the top layer beside that item — to its right, or its
 * left in a right-to-left page — flipping at the viewport edge.
 *
 * Keyboard, pointer and `fw-select` are handled by the enclosing
 * `<fw-dropdown>`: choosing an item anywhere in the tree fires `fw-select`
 * from the dropdown. Radio `group`s are scoped to one submenu.
 *
 * Slots: default (menu items, dividers and labels). Parts: `menu`.
 */
export class FwSubmenu extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    open: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare open: boolean;

  #menu!: HTMLElement;
  #anchored: Anchored | null = null;
  #collection: Collection | null = null;
  #shown = false;

  /** The item that opens this submenu. */
  get parentItem(): FwMenuItem | null {
    const parent = this.parentElement;
    return parent?.localName === "fw-menu-item" ? (parent as FwMenuItem) : null;
  }

  /** This submenu's own items, in document order — not those of a submenu inside it. */
  get items(): MenuEntry[] {
    return ownItems(this);
  }

  /** @internal Keyboard movement among the items, driven by `<fw-dropdown>`. */
  get collection(): Collection | null {
    return this.#collection;
  }

  protected render(root: ShadowRoot): void {
    this.#menu = document.createElement("div");
    this.#menu.className = "menu";
    this.#menu.setAttribute("part", "menu");
    this.#menu.setAttribute("role", "menu");
    if (hasPopover) this.#menu.setAttribute("popover", "manual");
    else this.#menu.hidden = true;
    this.#menu.append(document.createElement("slot"));
    root.append(this.#menu);
  }

  protected override connected(scope: Scope): void {
    if (!this.slot) this.slot = "submenu";

    this.#collection = createCollection({
      items: () => this.items,
      textOf: (item) => (item as MenuEntry).text,
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => {
        for (const each of this.items) each.toggleAttribute("data-active", each === item);
        if (item && this.prop<boolean>("open").peek()) {
          item.focus({ preventScroll: true });
          item.scrollIntoView?.({ block: "nearest" });
        }
      },
    });

    const parent = this.parentItem;
    parent?.setAttribute("aria-haspopup", "menu");

    // Added before the binding below, so it runs after that binding is
    // gone: resetting `open` here must not re-run it.
    scope.add(() => {
      this.#hide();
      this.open = false;
      this.#collection?.dispose();
      this.#collection = null;
      parent?.removeAttribute("aria-haspopup");
      parent?.removeAttribute("aria-expanded");
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      parent?.setAttribute("aria-expanded", String(open));
      if (open) this.#show();
      else this.#hide();
    });
  }

  #show(): void {
    const menu = this.#menu;
    if (!this.#shown) {
      if (hasPopover) {
        if (!menu.matches(":popover-open")) menu.showPopover();
      } else {
        menu.hidden = false;
      }
      this.#shown = true;
    }
    const anchor = this.parentItem ?? this;
    const name = this.parentItem?.text ?? "";
    if (name) menu.setAttribute("aria-label", name);
    else menu.removeAttribute("aria-label");

    const rtl = isRtl(anchor);
    this.#anchored?.dispose();
    this.#anchored = anchorTo(anchor, menu, {
      placement: rtl ? "left-start" : "right-start",
      offset: 4,
      dir: rtl ? "rtl" : "ltr",
    });
  }

  #hide(): void {
    for (const child of this.querySelectorAll<FwSubmenu>("fw-submenu")) child.open = false;
    this.#anchored?.dispose();
    this.#anchored = null;
    if (!this.#shown) return;
    this.#shown = false;
    const menu = this.#menu;
    if (hasPopover) {
      if (menu.matches(":popover-open")) menu.hidePopover();
    } else {
      menu.hidden = true;
    }
    this.#collection?.setActive(null);
    for (const item of this.items) item.removeAttribute("data-active");
  }
}
