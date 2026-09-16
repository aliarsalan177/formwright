import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import type { FwBreadcrumbItem } from "./breadcrumb-item.js";

const styles = /* css */ `
:host { display: block; }
.list {
  display: flex; flex-wrap: wrap; align-items: center; row-gap: 0.25rem;
  margin: 0; padding: 0; list-style: none;
}
.separator-source { display: none; }
`;

/**
 * `<fw-breadcrumbs>` — where the current page sits in the site's
 * hierarchy, as a trail of links.
 *
 * ```html
 * <fw-breadcrumbs max="4">
 *   <fw-breadcrumb-item href="/">Home</fw-breadcrumb-item>
 *   <fw-breadcrumb-item href="/gym">Gym</fw-breadcrumb-item>
 *   <fw-breadcrumb-item href="/gym/members">Members</fw-breadcrumb-item>
 *   <fw-breadcrumb-item href="/gym/members/42">Ali Arsalan</fw-breadcrumb-item>
 *   <fw-breadcrumb-item current>Payments</fw-breadcrumb-item>
 * </fw-breadcrumbs>
 *
 * <fw-breadcrumbs>
 *   <span slot="separator">/</span>
 *   …
 * </fw-breadcrumbs>
 * ```
 *
 * Follows the WAI-ARIA breadcrumb pattern: a `<nav>` landmark named by
 * `label` (default "Breadcrumb") around an ordered list, the current page
 * marked `aria-current="page"`, and separators hidden from assistive
 * technology. A `separator` slot replaces the default chevron, which is
 * copied into each item.
 *
 * With `max`, a trail longer than that keeps the first item and the last
 * `max - 1`, and puts an ellipsis button in place of the rest; pressing it
 * reveals them and moves focus to the first one revealed.
 *
 * Slots: default (the items), `separator`.
 * Parts: `base` (the nav), `list`.
 */
export class FwBreadcrumbs extends FwElement {
  static override props: PropMap = {
    label: { type: "string", default: "Breadcrumb" },
    max: { type: "number" },
  };
  static override styles = styles;

  declare label: string;
  declare max: number | null;

  #nav!: HTMLElement;
  #separatorSlot!: HTMLSlotElement;
  /** Bumped when items are added or removed, or the separator changes. */
  readonly #version = signal(0);
  /** The user asked to see the whole trail. */
  readonly #expanded = signal(false);

  /** The items, in document order. */
  get items(): FwBreadcrumbItem[] {
    return [...this.querySelectorAll<FwBreadcrumbItem>(":scope > fw-breadcrumb-item")];
  }

  protected render(root: ShadowRoot): void {
    const nav = document.createElement("nav");
    nav.setAttribute("part", "base");
    const list = document.createElement("ol");
    list.className = "list";
    list.setAttribute("part", "list");
    list.append(document.createElement("slot"));
    nav.append(list);
    this.#nav = nav;

    const source = document.createElement("div");
    source.className = "separator-source";
    source.setAttribute("aria-hidden", "true");
    this.#separatorSlot = document.createElement("slot");
    this.#separatorSlot.name = "separator";
    source.append(this.#separatorSlot);

    root.append(nav, source);
  }

  protected override connected(scope: Scope): void {
    const bump = () => this.#version.set(this.#version.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      // Direct children only: the separators copied into items below must
      // not look like a change to observe.
      const observer = new MutationObserver(bump);
      observer.observe(this, { childList: true });
      scope.add(() => observer.disconnect());
    }
    this.#separatorSlot.addEventListener("slotchange", bump);
    scope.add(() => this.#separatorSlot.removeEventListener("slotchange", bump));

    scope.bind(() => {
      this.#nav.setAttribute("aria-label", this.prop<string | null>("label").get() || "Breadcrumb");
    });

    // A new max starts collapsed again.
    scope.bind(() => {
      this.prop<number | null>("max").get();
      this.#expanded.set(false);
    });

    scope.bind(() => {
      this.#version.get();
      const items = this.items;
      const count = items.length;
      const rawMax = this.prop<number | null>("max").get();
      const max = rawMax === null ? null : Math.max(2, Math.floor(rawMax));
      const collapse = !this.#expanded.get() && max !== null && count > max;
      const lastHidden = max === null ? 0 : count - max;

      items.forEach((item, i) => {
        item.toggleAttribute("collapsed", collapse && i === 1);
        item.hidden = collapse && i >= 2 && i <= lastHidden;
      });
    });

    // A custom separator, copied into every item.
    scope.bind(() => {
      this.#version.get();
      const custom = this.#separatorSlot
        .assignedNodes()
        .filter((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
      for (const item of this.items) {
        for (const old of item.querySelectorAll(":scope > [data-fw-separator]")) old.remove();
        if (custom.length === 0) continue;
        const copy = document.createElement("span");
        copy.slot = "separator";
        copy.setAttribute("data-fw-separator", "");
        copy.setAttribute("aria-hidden", "true");
        for (const node of custom) copy.append(node.cloneNode(true));
        item.append(copy);
      }
    });

    const onExpand = (event: Event) => {
      const item = event.target as Element | null;
      if (!item || item.parentElement !== this) return;
      event.stopPropagation();
      this.#expanded.set(true);
      (item as HTMLElement).focus();
    };
    this.addEventListener("fw-breadcrumb-expand", onExpand);
    scope.add(() => this.removeEventListener("fw-breadcrumb-expand", onExpand));
  }
}
