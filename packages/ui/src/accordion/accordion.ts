import { signal } from "@formwright/reactive";
import { createCollection, type Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import type { FwAccordionItem } from "./accordion-item.js";

const styles = /* css */ `
:host { display: block; }
.base { display: block; border-block-start: 1px solid var(--_border); }
`;

/**
 * `<fw-accordion>` — a stack of `<fw-accordion-item>`s, each a header
 * that shows and hides a section.
 *
 * ```html
 * <fw-accordion heading-level="2">
 *   <fw-accordion-item heading="Membership" open>…</fw-accordion-item>
 *   <fw-accordion-item heading="Opening hours">…</fw-accordion-item>
 *   <fw-accordion-item heading="Personal training" disabled>…</fw-accordion-item>
 * </fw-accordion>
 * ```
 *
 * Follows the WAI-ARIA accordion pattern. Tab and Shift+Tab go through
 * the headers; Arrow Down and Up move between them, wrapping, and Home
 * and End jump to the first and last, skipping disabled items. By default
 * opening one item closes the rest; set `multiple` to let several stay
 * open. `heading-level` (2–6, default 3) sets the heading level every
 * item's header is announced at, so the accordion fits the page's
 * outline.
 *
 * Events: `change` whenever an item opens or closes — once per action,
 * even when opening one closed another. Items emit `fw-show` / `fw-hide`.
 * Slots: default (the items).
 * Parts: `base`.
 */
export class FwAccordion extends FwElement {
  static override props: PropMap = {
    multiple: { type: "boolean", reflect: true },
    headingLevel: { type: "number", default: 3 },
  };
  static override styles = styles;

  declare multiple: boolean;
  declare headingLevel: number;

  /** Bumped when items are added or removed. */
  readonly #version = signal(0);

  /** The items, in document order. */
  get items(): FwAccordionItem[] {
    return [...this.querySelectorAll<FwAccordionItem>(":scope > fw-accordion-item")];
  }

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");
    base.append(document.createElement("slot"));
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    const bump = () => this.#version.set(this.#version.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(bump);
      observer.observe(this, { childList: true });
      scope.add(() => observer.disconnect());
    }

    scope.bind(() => {
      this.#version.get();
      const raw = Math.round(this.prop<number>("headingLevel").get() || 3);
      const level = String(Math.min(6, Math.max(2, raw)));
      // An attribute rather than the property, so it lands whether or not
      // the item has upgraded yet.
      for (const item of this.items) item.setAttribute("heading-level", level);
    });

    // Set while a key is being handled, so telling the collection which
    // header has focus does not itself move focus.
    let moving = false;
    const collection = createCollection({
      items: () => this.items,
      orientation: "vertical",
      typeahead: false,
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => {
        if (moving && item) item.focus();
      },
    });
    scope.add(() => collection.dispose());

    const onKey = (event: KeyboardEvent) => {
      // Only from a header: arrow keys inside an item's content belong to
      // whatever is there.
      const origin = event.composedPath()[0] as Element | undefined;
      if (!origin || origin.getAttribute?.("part") !== "header") return;
      const item = (event.target as Element | null)?.closest?.("fw-accordion-item");
      if (!item || item.parentElement !== this) return;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      collection.setActive(item as HTMLElement);
      moving = true;
      try {
        if (collection.handleKey(event)) event.preventDefault();
      } finally {
        moving = false;
      }
    };

    // Items this accordion is closing because another opened. Their fw-hide
    // is part of that one change, not a change of its own. A set rather
    // than a flag: the item's binding may run after this handler returns.
    const closing = new Set<Element>();
    const onToggle = (event: Event) => {
      const item = event.target as Element | null;
      if (!item || item.localName !== "fw-accordion-item" || item.parentElement !== this) return;
      if (event.type === "fw-hide" && closing.delete(item)) return;
      if (event.type === "fw-show" && !this.prop<boolean>("multiple").peek()) {
        for (const other of this.items) {
          if (other === item || !other.hasAttribute("open")) continue;
          closing.add(other);
          other.removeAttribute("open");
        }
      }
      this.emit("change");
    };
    scope.add(() => closing.clear());

    this.addEventListener("keydown", onKey);
    this.addEventListener("fw-show", onToggle);
    this.addEventListener("fw-hide", onToggle);
    scope.add(() => {
      this.removeEventListener("keydown", onKey);
      this.removeEventListener("fw-show", onToggle);
      this.removeEventListener("fw-hide", onToggle);
    });
  }
}
