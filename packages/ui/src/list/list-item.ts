import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { FwItemBase, itemStyles } from "../core/item.js";

/**
 * Where an item sits decides what it is:
 * - `option` — in `<fw-select>`, `<fw-combobox>` or `<fw-multi-select>`
 * - `menuitem` — in `<fw-dropdown>` or `<fw-submenu>`
 * - `list-option` — in a `<fw-list>` with `selection` single or multiple
 * - `listitem` — in a `<fw-list>` without selection
 * - `standalone` — anywhere else
 */
export type ListItemContext = "option" | "menuitem" | "list-option" | "listitem" | "standalone";

/** @internal Every element that manages `<fw-list-item>` children. */
export const ITEM_CONTAINERS =
  "fw-list, fw-select, fw-combobox, fw-multi-select, fw-dropdown, fw-submenu";

const styles =
  itemStyles +
  /* css */ `
/* A link row: the anchor fills the row, so the whole row is the link. */
:host([href]) { padding: 0; }
.link {
  display: flex; align-items: center; gap: inherit; flex: 1; align-self: stretch; min-width: 0;
  padding: var(--_item-pad-block) var(--_item-pad-inline);
  color: inherit; text-decoration: none; border-radius: inherit; outline: none; cursor: inherit;
}
.link:focus-visible { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--_accent) 45%, transparent); }
:host([href]:not([role="option"]):not([role="menuitem"])) .chevron { display: inline-flex; }
`;

export interface ListItemSelectDetail {
  value: string;
  item: FwListItem;
}

/**
 * `<fw-list-item>` — one row, usable on its own, in `<fw-list>`, and in
 * place of `<fw-option>` or `<fw-menu-item>`.
 *
 * ```html
 * <fw-list variant="outline">
 *   <fw-list-item value="sana" description="Head trainer · 12 members">
 *     <fw-avatar slot="prefix" name="Sana Malik" size="sm"></fw-avatar>
 *     Sana Malik
 *     <fw-badge slot="suffix" tone="success">Active</fw-badge>
 *   </fw-list-item>
 *   <fw-list-item href="/billing">Billing</fw-list-item>
 *   <fw-list-item interactive value="archive">Archive member</fw-list-item>
 * </fw-list>
 *
 * <fw-select label="Trainer">
 *   <fw-list-item value="sana" description="Head trainer">Sana Malik</fw-list-item>
 * </fw-select>
 * ```
 *
 * Its role follows where it is, decided when it connects (so again when
 * it is moved): `option` inside a select, combobox or multi-select, where
 * it behaves exactly like `<fw-option>`; `menuitem` inside a dropdown or
 * submenu, where it behaves like a plain `<fw-menu-item>`; inside
 * `<fw-list>`, `listitem` or `option` depending on the list's `selection`.
 * On its own, an `interactive` row is a `button`.
 *
 * `href` renders the row as a real `<a>` in the shadow root, so middle
 * click, "copy link" and the status bar work; Enter follows it when the
 * row has focus. `interactive` makes a row pressable where it otherwise
 * would not be — in a list without selection, or on its own — and it then
 * emits `fw-select` (from the list, or from the row itself when it is on
 * its own) on click, Enter or Space. A disabled row does neither.
 *
 * Events: `fw-select` (`{ value, item }`), only when on its own; in a
 * container, the container emits.
 * Slots: default (label), `prefix`, `description`, `suffix`.
 * Parts: `check`, `label`, `description`, `suffix`, `chevron`, `link`.
 */
export class FwListItem extends FwItemBase {
  static override props: PropMap = {
    ...FwItemBase.props,
    href: { type: "string", reflect: true },
    target: { type: "string" },
    interactive: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare href: string | null;
  declare target: string | null;
  declare interactive: boolean;

  #link!: HTMLAnchorElement;
  readonly #context = signal<ListItemContext>("standalone");
  #ownTabIndex = false;

  /** What the row currently is, from where it sits. */
  get context(): ListItemContext {
    return this.#context.peek();
  }

  protected override render(root: ShadowRoot): void {
    super.render(root);
    this.#link = document.createElement("a");
    this.#link.className = "link";
    this.#link.setAttribute("part", "link");
  }

  /** @internal Re-read the context; called by `<fw-list>` when its selection mode changes. */
  _syncContext(): void {
    this.#context.set(this.#contextFromPosition());
  }

  #contextFromPosition(): ListItemContext {
    const host = this.parentElement?.closest(ITEM_CONTAINERS);
    if (!host) return "standalone";
    switch (host.localName) {
      case "fw-list": {
        // Read the property once the list is upgraded: during a selection
        // change its attribute is reflected only after its bindings ran.
        const own = (host as HTMLElement & { selection?: unknown }).selection;
        const selection = typeof own === "string" ? own : host.getAttribute("selection");
        return selection === "single" || selection === "multiple" ? "list-option" : "listitem";
      }
      case "fw-dropdown":
      case "fw-submenu":
        return "menuitem";
      default:
        return "option";
    }
  }

  protected override connected(scope: Scope): void {
    super.connected(scope);
    this._syncContext();
    const link = this.#link;
    const parts = this.itemParts;
    const content = [parts.check, parts.prefix, parts.text, parts.suffix, parts.chevron];

    scope.bind(() => {
      const context = this.#context.get();
      const href = this.prop<string | null>("href").get();
      const interactive = this.prop<boolean>("interactive").get();
      const selected = this.prop<boolean>("selected").get();

      let role: string | null;
      if (context === "option" || context === "list-option") role = "option";
      else if (context === "menuitem") role = "menuitem";
      else if (context === "listitem") role = "listitem";
      else role = interactive && href === null ? "button" : null;
      if (role) this.setAttribute("role", role);
      else this.removeAttribute("role");

      if (role === "option") this.setAttribute("aria-selected", String(selected));
      else this.removeAttribute("aria-selected");

      const pressable = interactive || href !== null;
      this.toggleAttribute(
        "data-static",
        (context === "listitem" || context === "standalone") && !pressable,
      );

      if (context === "option" && !this.id) this.id = nextId("fw-list-item");

      // A list roves tabindex itself; a popup focuses rows programmatically.
      if (context === "option" || context === "menuitem") {
        this.tabIndex = -1;
      } else if (context === "standalone") {
        if (role === "button" && !this.hasAttribute("tabindex")) {
          this.tabIndex = 0;
          this.#ownTabIndex = true;
        } else if (role !== "button" && this.#ownTabIndex) {
          this.removeAttribute("tabindex");
          this.#ownTabIndex = false;
        }
      }
      // A link on its own is the tab stop; inside a container the row is.
      if (context === "standalone") link.removeAttribute("tabindex");
      else link.tabIndex = -1;
    });

    // The link wraps the row's content only while there is an href.
    scope.bind(() => {
      const href = this.prop<string | null>("href").get();
      const target = this.prop<string | null>("target").get();
      if (href === null) {
        if (link.parentNode === this.root) link.replaceWith(...content);
        return;
      }
      link.href = href;
      if (target) link.target = target;
      else link.removeAttribute("target");
      if (link.parentNode !== this.root) {
        parts.check.before(link);
        link.append(...content);
      }
    });

    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) link.setAttribute("aria-disabled", "true");
      else link.removeAttribute("aria-disabled");
    });

    const onKeyDown = (event: KeyboardEvent) => {
      // Only keys pressed on the row itself: a focused link on its own
      // follows Enter natively.
      if (event.composedPath()[0] !== this || this.prop<boolean>("disabled").peek()) return;
      const href = this.prop<string | null>("href").peek();
      if (href !== null && event.key === "Enter") {
        // Through the link, so the container sees the same click a pointer makes.
        event.preventDefault();
        event.stopPropagation();
        link.click();
        return;
      }
      if (
        this.#context.peek() === "standalone" &&
        this.prop<boolean>("interactive").peek() &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        this.#emitSelect();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (this.prop<boolean>("disabled").peek()) {
        // Keeps a disabled link row from navigating.
        event.preventDefault();
        return;
      }
      if (
        this.#context.peek() === "standalone" &&
        this.prop<boolean>("interactive").peek() &&
        this.prop<string | null>("href").peek() === null
      ) {
        this.#emitSelect();
      }
    };

    this.addEventListener("keydown", onKeyDown);
    this.addEventListener("click", onClick);
    scope.add(() => {
      this.removeEventListener("keydown", onKeyDown);
      this.removeEventListener("click", onClick);
    });
  }

  #emitSelect(): void {
    this.emit<ListItemSelectDetail>("fw-select", {
      value: this.prop<string | null>("value").peek() ?? "",
      item: this,
    });
  }
}
