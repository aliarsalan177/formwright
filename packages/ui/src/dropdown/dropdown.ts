import { signal } from "@formwright/reactive";
import {
  anchorTo,
  createCollection,
  type Anchored,
  type Collection,
  type Placement,
  type Scope,
} from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import type { FwMenuItem } from "./menu-item.js";
import {
  MENU,
  hasPopover,
  isRtl,
  menuStyles,
  ownItems,
  submenuOf,
  type FwSubmenu,
  type MenuEntry,
} from "./submenu.js";

const styles = menuStyles;

/** Hovering an item waits this long before opening its submenu. */
const HOVER_OPEN_MS = 100;
/** And this long before closing a submenu the pointer left, so a diagonal move into it survives. */
const HOVER_CLOSE_MS = 200;

export interface DropdownSelectDetail {
  value: string;
  /** The chosen item: a `<fw-menu-item>`, or a `<fw-list-item>` used as a menu item. */
  item: MenuEntry;
}

/**
 * `<fw-dropdown>` — a menu button: a trigger that opens a list of actions.
 *
 * ```html
 * <fw-dropdown placement="bottom-end">
 *   <fw-button slot="trigger" variant="secondary">Member</fw-button>
 *   <fw-menu-label>Membership</fw-menu-label>
 *   <fw-menu-item value="renew">Renew<kbd slot="suffix">R</kbd></fw-menu-item>
 *   <fw-menu-item value="freeze">Freeze</fw-menu-item>
 *   <fw-menu-item>
 *     Move to
 *     <fw-submenu slot="submenu">
 *       <fw-menu-item value="gold">Gold plan</fw-menu-item>
 *       <fw-menu-item value="silver">Silver plan</fw-menu-item>
 *     </fw-submenu>
 *   </fw-menu-item>
 *   <fw-menu-divider></fw-menu-divider>
 *   <fw-menu-item type="checkbox" value="vip">VIP</fw-menu-item>
 *   <fw-menu-divider></fw-menu-divider>
 *   <fw-menu-item value="delete" danger>Delete</fw-menu-item>
 * </fw-dropdown>
 * ```
 *
 * Keyboard, per the WAI-ARIA menu button pattern: Enter, Space or
 * ArrowDown on the trigger opens it on the first item, ArrowUp on the last.
 * In the menu the arrows move (wrapping), Home and End jump, typing a
 * letter jumps to the next item starting with it, Enter or Space
 * activates, Escape closes and returns focus to the trigger, and Tab closes
 * and lets focus move on. A press outside closes it.
 *
 * Submenus (`<fw-submenu slot="submenu">` inside an item) nest to any
 * depth. On an item with one, ArrowRight (ArrowLeft right-to-left), Enter
 * or Space opens it on its first item; inside it, ArrowLeft (ArrowRight
 * right-to-left) or Escape closes just that submenu and returns to its
 * item, the arrows, Home, End and typeahead stay within it, and Tab closes
 * the whole tree. Hovering an item opens its submenu after a moment;
 * moving to another item closes it after a short grace period, which
 * moving into the submenu cancels. Clicking the item toggles it.
 *
 * A plain `<fw-list-item>` works as a normal menu item — arrows, typeahead
 * and `fw-select` treat it exactly like a `<fw-menu-item>` — for richer
 * rows with an avatar or description. Checkbox, radio and submenu items
 * stay `<fw-menu-item>`. Import `@formwright/ui/list` to register
 * `<fw-list-item>`.
 *
 * Choosing an item, at any depth, fires `fw-select` from the dropdown with `{ value, item }`, toggles a
 * checkbox item or checks a radio item, and closes the menu unless
 * `close-on-select="false"`.
 *
 * Accessibility note. Focus moves onto the items themselves: they are in
 * the page and the menu is in the shadow root, so `aria-activedescendant`
 * could not reach them. `aria-haspopup="menu"` and `aria-expanded` are set
 * on the slotted trigger, and the menu is named after the trigger's text;
 * a submenu is named after its item.
 *
 * Events: `fw-select` (detail `{ value, item }`), `fw-show`, `fw-hide`.
 * Slots: `trigger`, default (menu items, dividers and labels).
 * Parts: `menu` (and `menu` on each `<fw-submenu>`, `chevron` on its item).
 */
export class FwDropdown extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    open: { type: "boolean", reflect: true },
    placement: { type: "string", default: "bottom-start" },
    // JSON so the attribute can say `close-on-select="false"`; a plain
    // boolean attribute that defaults to true could never be turned off.
    closeOnSelect: { type: "json", default: true },
  };
  static override styles = styles;

  declare open: boolean;
  declare placement: Placement;
  declare closeOnSelect: boolean;

  #menu!: HTMLElement;
  #anchored: Anchored | null = null;
  #collection: Collection | null = null;
  #shown = false;
  #ariaTarget: Element | null = null;
  readonly #slots = signal(0);
  #hoverTimer: ReturnType<typeof setTimeout> | null = null;
  #hoverMenu: Element | null = null;
  #hoverFor: FwSubmenu | null = null;

  /** The slotted trigger element, if there is one. */
  get triggerElement(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  /** This dropdown's items, in document order — not those of a dropdown nested inside it. */
  get items(): MenuEntry[] {
    return ownItems(this);
  }

  protected render(root: ShadowRoot): void {
    const trigger = document.createElement("slot");
    trigger.name = "trigger";

    this.#menu = document.createElement("div");
    this.#menu.className = "menu";
    this.#menu.setAttribute("part", "menu");
    this.#menu.setAttribute("role", "menu");
    if (hasPopover) this.#menu.setAttribute("popover", "manual");
    else this.#menu.hidden = true;
    this.#menu.append(document.createElement("slot"));

    root.append(trigger, this.#menu);
  }

  protected override connected(scope: Scope): void {
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
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    scope.bind(() => {
      this.#slots.get();
      const open = this.prop<boolean>("open").get();
      const trigger = this.triggerElement;
      if (this.#ariaTarget && this.#ariaTarget !== trigger) this.#clearAria(this.#ariaTarget);
      this.#ariaTarget = trigger;
      if (trigger) {
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", String(open));
      }
    });
    scope.add(() => {
      if (this.#ariaTarget) this.#clearAria(this.#ariaTarget);
      this.#ariaTarget = null;
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      this.prop<Placement>("placement").get();
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));
    scope.add(() => this.#clearHover());

    const inTrigger = (node: EventTarget | null) => {
      const trigger = this.triggerElement;
      return Boolean(trigger && node instanceof Node && trigger.contains(node));
    };
    // The item an event is on, and the menu — this or a submenu — it is in.
    // Walked outward, so a press on a submenu's padding is not taken for
    // the item that opened it.
    const locate = (event: Event): { item: MenuEntry | null; menu: Element | null } => {
      for (const node of event.composedPath()) {
        if (node === this) break;
        if (!(node instanceof Element)) continue;
        const name = node.localName;
        if (name !== "fw-menu-item" && name !== "fw-list-item" && name !== "fw-submenu") continue;
        if (node.closest("fw-dropdown") !== this) break;
        if (node.localName === "fw-submenu") return { item: null, menu: node };
        return { item: node as MenuEntry, menu: node.closest(MENU) };
      }
      return { item: null, menu: null };
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!this.#collection) return;

      if (inTrigger(event.target)) {
        switch (event.key) {
          case "Enter":
          case " ":
          case "ArrowDown":
            event.preventDefault();
            this.#openAt("first");
            return;
          case "ArrowUp":
            event.preventDefault();
            this.#openAt("last");
            return;
          case "Escape":
            if (!this.prop<boolean>("open").peek()) return;
            event.preventDefault();
            event.stopPropagation();
            this.#close(false);
            return;
        }
        return;
      }

      if (!this.prop<boolean>("open").peek()) return;
      const { item, menu } = locate(event);
      if (!item || !menu) return;

      const rtl = isRtl(item);
      const submenu = submenuOf(item);
      if (
        submenu &&
        (event.key === (rtl ? "ArrowLeft" : "ArrowRight") ||
          event.key === "Enter" ||
          event.key === " ")
      ) {
        event.preventDefault();
        if (!item.disabled) this.#openSubmenu(submenu, true);
        return;
      }
      if (
        menu !== this &&
        (event.key === (rtl ? "ArrowRight" : "ArrowLeft") || event.key === "Escape")
      ) {
        event.preventDefault();
        // Only this submenu closes: the dropdown, and whatever it sits in, stay open.
        event.stopPropagation();
        this.#closeSubmenu(menu as FwSubmenu, true);
        return;
      }

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          // Stop here, so the dialog or drawer the menu sits in stays open.
          event.stopPropagation();
          this.#close(true);
          return;
        case "Tab":
          // Back to the trigger and let Tab run on from there, rather than
          // off an item that is about to be hidden.
          this.#close(true);
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          this.#activate(item);
          return;
      }
      const moved = this.#collectionOf(menu);
      if (moved?.handleKey(event)) {
        event.preventDefault();
        this.#closeChildren(menu, moved.active());
      }
    };

    const onClick = (event: MouseEvent) => {
      if (inTrigger(event.target)) {
        if (this.prop<boolean>("open").peek()) this.#close(false);
        else this.#openAt("first");
        return;
      }
      const { item } = locate(event);
      if (!item) return;
      const submenu = submenuOf(item);
      if (!submenu) this.#activate(item);
      else if (item.disabled) return;
      else if (submenu.open) this.#closeSubmenu(submenu, false);
      else this.#openSubmenu(submenu, false);
    };

    const onPointerMove = (event: Event) => {
      if (!this.prop<boolean>("open").peek()) return;
      const { item, menu } = locate(event);
      if (!menu) return;
      // In a submenu, so a pending change to a menu above would close it.
      if (this.#hoverMenu && this.#hoverMenu !== menu && this.#hoverMenu.contains(menu)) {
        this.#clearHover();
      }
      if (!item || item.disabled) return;

      const parent = (menu as FwSubmenu).parentItem;
      if (menu !== this && parent) {
        const outer = this.#collectionOf(parent.closest(MENU));
        if (outer && outer.active() !== parent) outer.setActive(parent);
      }
      const collection = this.#collectionOf(menu);
      if (collection?.active() !== item) collection?.setActive(item);
      else if (document.activeElement !== item) item.focus({ preventScroll: true });

      const wanted = submenuOf(item);
      const current = this.#openChild(menu);
      if (wanted === current) {
        if (this.#hoverMenu === menu) this.#clearHover();
        return;
      }
      if (this.#hoverMenu === menu && this.#hoverFor === wanted) return;
      this.#clearHover();
      this.#hoverMenu = menu;
      this.#hoverFor = wanted;
      this.#hoverTimer = setTimeout(
        () => {
          this.#clearHover();
          if (wanted) this.#openSubmenu(wanted, false);
          else this.#closeChildren(menu, null);
        },
        current ? HOVER_CLOSE_MS : HOVER_OPEN_MS,
      );
    };

    // `composedPath` sees into shadow roots, so a press inside the menu —
    // in this element's own shadow root — is not mistaken for outside.
    const onOutside = (event: Event) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.#close(false);
    };

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    this.addEventListener("keydown", onKeyDown);
    this.addEventListener("click", onClick);
    this.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerdown", onOutside, true);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      this.removeEventListener("keydown", onKeyDown);
      this.removeEventListener("click", onClick);
      this.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerdown", onOutside, true);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #clearAria(el: Element): void {
    el.removeAttribute("aria-haspopup");
    el.removeAttribute("aria-expanded");
  }

  /** Open and put focus on the first or last enabled item. */
  #openAt(where: "first" | "last"): void {
    this.open = true;
    const collection = this.#collection;
    if (!collection || !this.prop<boolean>("open").peek()) return;
    collection.setActive(null);
    if (where === "first") collection.first();
    else collection.last();
  }

  #collectionOf(menu: Element | null): Collection | null {
    if (menu === this) return this.#collection;
    return menu?.localName === "fw-submenu" ? (menu as FwSubmenu).collection : null;
  }

  /** The open submenu among a menu's own items. */
  #openChild(menu: Element): FwSubmenu | null {
    for (const item of ownItems(menu)) {
      const submenu = submenuOf(item);
      if (submenu?.open) return submenu;
    }
    return null;
  }

  /** Close a menu's open submenus, except the one belonging to `keep`. */
  #closeChildren(menu: Element, keep: HTMLElement | null): void {
    for (const item of ownItems(menu)) {
      const submenu = submenuOf(item);
      if (submenu?.open && item !== keep) submenu.open = false;
    }
  }

  #openSubmenu(submenu: FwSubmenu, focusFirst: boolean): void {
    this.#clearHover();
    const parent = submenu.parentItem;
    if (parent) this.#closeChildren(parent.closest(MENU) ?? this, parent);
    submenu.open = true;
    const collection = submenu.collection;
    if (!focusFirst || !collection) return;
    collection.setActive(null);
    collection.first();
  }

  #closeSubmenu(submenu: FwSubmenu, returnFocus: boolean): void {
    this.#clearHover();
    submenu.open = false;
    const parent = submenu.parentItem;
    if (!returnFocus || !parent) return;
    const outer = this.#collectionOf(parent.closest(MENU));
    if (outer?.active() !== parent) outer?.setActive(parent);
    if (document.activeElement !== parent) parent.focus();
  }

  #clearHover(): void {
    if (this.#hoverTimer) clearTimeout(this.#hoverTimer);
    this.#hoverTimer = null;
    this.#hoverMenu = null;
    this.#hoverFor = null;
  }

  #activate(item: MenuEntry): void {
    if (item.disabled) return;
    if (item.localName === "fw-menu-item") {
      const menuItem = item as FwMenuItem;
      if (menuItem.type === "checkbox") menuItem.checked = !menuItem.checked;
      else if (menuItem.type === "radio") menuItem.checked = true;
    }
    this.emit<DropdownSelectDetail>("fw-select", { value: item.value, item });
    if (this.prop<boolean | null>("closeOnSelect").peek() !== false) this.#close(true);
  }

  #show(): void {
    const menu = this.#menu;
    const wasShown = this.#shown;
    if (!wasShown) {
      if (hasPopover) {
        if (!menu.matches(":popover-open")) menu.showPopover();
      } else {
        menu.hidden = false;
      }
      this.#shown = true;
    }
    const trigger = this.triggerElement;
    // Named after its trigger, as text: an id reference could not cross
    // from the shadow root to the page.
    const name = (trigger?.getAttribute("aria-label") ?? trigger?.textContent ?? "").trim();
    if (name) menu.setAttribute("aria-label", name);
    else menu.removeAttribute("aria-label");

    this.#anchored?.dispose();
    this.#anchored = anchorTo(trigger ?? this, menu, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom-start",
      offset: 4,
    });
    if (!wasShown) this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#clearHover();
    for (const submenu of this.querySelectorAll<FwSubmenu>("fw-submenu")) {
      if (submenu.closest("fw-dropdown") === this) submenu.open = false;
    }
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
    if (emit) this.emit("fw-hide");
  }

  /** Close, optionally putting focus back on the trigger. */
  #close(returnFocus: boolean): void {
    if (!this.prop<boolean>("open").peek()) return;
    this.open = false;
    if (returnFocus) this.triggerElement?.focus();
  }

  #focusInMenu(): boolean {
    const active = document.activeElement;
    return Boolean(active && this.items.some((item) => item === active || item.contains(active)));
  }

  /** Open the menu and focus its first item. */
  show(): void {
    this.#openAt("first");
  }

  /** Close the menu, returning focus to the trigger if it was in the menu. */
  hide(): void {
    this.#close(this.#focusInMenu());
  }

  /** Open it if closed, close it if open. */
  toggle(): void {
    if (this.prop<boolean>("open").peek()) this.hide();
    else this.show();
  }
}
