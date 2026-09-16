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

const styles = /* css */ `
:host { display: contents; }

.menu {
  margin: 0; inset: auto; padding: 0.25rem;
  min-width: 10rem;
  max-height: min(24rem, var(--fw-available-height, 24rem));
  overflow: auto; overscroll-behavior: contain;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
  outline: none;
}
`;

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

export interface DropdownSelectDetail {
  value: string;
  item: FwMenuItem;
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
 * Choosing an item fires `fw-select` with `{ value, item }`, toggles a
 * checkbox item or checks a radio item, and closes the menu unless
 * `close-on-select="false"`.
 *
 * Accessibility note. Focus moves onto the items themselves: they are in
 * the page and the menu is in the shadow root, so `aria-activedescendant`
 * could not reach them. `aria-haspopup="menu"` and `aria-expanded` are set
 * on the slotted trigger, and the menu is named after the trigger's text.
 * Submenus are not supported.
 *
 * Events: `fw-select` (detail `{ value, item }`), `fw-show`, `fw-hide`.
 * Slots: `trigger`, default (menu items, dividers and labels).
 * Parts: `menu`.
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

  /** The slotted trigger element, if there is one. */
  get triggerElement(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  /** This dropdown's items, in document order — not those of a dropdown nested inside it. */
  get items(): FwMenuItem[] {
    return [...this.querySelectorAll<FwMenuItem>("fw-menu-item")].filter(
      (item) => item.closest("fw-dropdown") === this && !item.closest('[slot="trigger"]'),
    );
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
      textOf: (item) => (item as FwMenuItem).text,
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

    const inTrigger = (node: EventTarget | null) => {
      const trigger = this.triggerElement;
      return Boolean(trigger && node instanceof Node && trigger.contains(node));
    };
    const itemFrom = (node: EventTarget | null): FwMenuItem | null => {
      const item = (node as Element | null)?.closest?.("fw-menu-item") as FwMenuItem | null;
      return item && item.closest("fw-dropdown") === this ? item : null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const collection = this.#collection;
      if (!collection) return;

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
      const item = itemFrom(event.target);
      if (!item) return;
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
      if (collection.handleKey(event)) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (inTrigger(event.target)) {
        if (this.prop<boolean>("open").peek()) this.#close(false);
        else this.#openAt("first");
        return;
      }
      const item = itemFrom(event.target);
      if (item) this.#activate(item);
    };

    const onPointerMove = (event: Event) => {
      if (!this.prop<boolean>("open").peek()) return;
      const item = itemFrom(event.target);
      if (item && !item.disabled && this.#collection?.active() !== item) {
        this.#collection?.setActive(item);
      }
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

  #activate(item: FwMenuItem): void {
    if (item.disabled) return;
    if (item.type === "checkbox") item.checked = !item.checked;
    else if (item.type === "radio") item.checked = true;
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
