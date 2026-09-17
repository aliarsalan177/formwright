import { signal } from "@formwright/reactive";
import { createCollection, type Collection, type Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivation = "auto" | "manual";
export type TabsVariant = "line" | "pills";

const styles = /* css */ `
:host { display: block; }
.base { display: flex; flex-direction: column; }
:host([orientation="vertical"]) .base { flex-direction: row; align-items: flex-start; }

.tablist { display: flex; flex-direction: row; gap: 0.25rem; overflow-x: auto; scrollbar-width: none; }
:host([orientation="vertical"]) .tablist { flex-direction: column; flex: none; overflow: visible; }
.panels { flex: 1; min-width: 0; }
/* Vertical panels sit beside the tabs: start their text level with the
   first tab's label rather than a panel's full top padding below it. */
:host([orientation="vertical"]) .panels { padding-inline-start: 1.25rem; margin-block-start: -0.5rem; }

/* line */
/* The baseline is painted as a background, not a border: the scrolling
   tablist clips to its padding box, which would cut the indicator in half.
   The padding (taken back by the margin) keeps a focused tab's ring from
   being clipped; the background stays within the content box. */
:host(:not([variant="pills"]):not([orientation="vertical"])) .tablist {
  padding: 0.25rem 0.25rem 0; margin: -0.25rem -0.25rem 0;
  background: linear-gradient(var(--_border), var(--_border)) no-repeat bottom / 100% 1px;
  background-origin: content-box; background-clip: content-box;
}
:host(:not([variant="pills"])) ::slotted(fw-tab) {
  border-block-end: 2px solid transparent;
  border-start-start-radius: var(--_radius-sm); border-start-end-radius: var(--_radius-sm);
}
:host(:not([variant="pills"])) ::slotted(fw-tab:not([selected]):not([disabled]):hover) {
  border-block-end-color: var(--_border);
}
:host(:not([variant="pills"])) ::slotted(fw-tab[selected]) { border-block-end-color: var(--_accent); }
:host(:not([variant="pills"])[orientation="vertical"]) .tablist {
  border-inline-end: 1px solid var(--_border); gap: 0.125rem;
}
:host(:not([variant="pills"])[orientation="vertical"]) ::slotted(fw-tab) {
  margin-block-end: 0; margin-inline-end: -1px;
  border-block-end: 0; border-inline-end: 2px solid transparent;
  border-radius: 0; border-start-start-radius: var(--_radius-sm); border-end-start-radius: var(--_radius-sm);
}
:host(:not([variant="pills"])[orientation="vertical"]) ::slotted(fw-tab:not([selected]):not([disabled]):hover) {
  border-inline-end-color: var(--_border);
}
:host(:not([variant="pills"])[orientation="vertical"]) ::slotted(fw-tab[selected]) {
  border-inline-end-color: var(--_accent);
}

/* pills: a sunken track holding a raised pill for the selected tab */
:host([variant="pills"]) .tablist {
  width: fit-content; max-width: 100%; padding: 0.25rem; gap: 0.25rem;
  background: var(--_surface-2); border-radius: var(--_radius);
}
:host([variant="pills"][orientation="vertical"]) .tablist { width: auto; }
:host([variant="pills"]) ::slotted(fw-tab) {
  border-radius: max(0px, calc(var(--_radius) - 0.125rem));
  --_tab-padding: 0.375rem 0.75rem;
}
:host([variant="pills"]) ::slotted(fw-tab:not([selected]):not([disabled]):hover) {
  background: color-mix(in srgb, var(--_text) 5%, transparent);
}
:host([variant="pills"]) ::slotted(fw-tab[selected]) {
  background: var(--_surface); color: var(--_text);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--_border) 70%, transparent),
    0 1px 2px color-mix(in srgb, var(--_backdrop) 30%, transparent);
}
:host([variant="pills"]) ::slotted(fw-tab[selected]:focus-visible) {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--_border) 70%, transparent), var(--_ring);
}
`;

/** Anything that takes keyboard focus on its own, visible or not. */
const FOCUSABLE =
  "a[href],area[href],button:not([disabled]),input:not([disabled]):not([type='hidden']),select:not([disabled]),textarea:not([disabled]),iframe,summary,[contenteditable]:not([contenteditable='false']),[tabindex]:not([tabindex='-1'])";

/**
 * `<fw-tabs>` — a set of panels, one shown at a time, chosen by a row (or
 * column) of tabs.
 *
 * ```html
 * <fw-tabs value="general" label="Member settings">
 *   <fw-tab slot="nav" panel="general">General</fw-tab>
 *   <fw-tab slot="nav" panel="billing">Billing</fw-tab>
 *   <fw-tab slot="nav" panel="danger" disabled>Danger zone</fw-tab>
 *   <fw-tab-panel name="general">…</fw-tab-panel>
 *   <fw-tab-panel name="billing">…</fw-tab-panel>
 *   <fw-tab-panel name="danger">…</fw-tab-panel>
 * </fw-tabs>
 * ```
 *
 * Follows the WAI-ARIA tabs pattern. Only the selected tab is in the Tab
 * order (roving tabindex); arrow keys move between tabs — Left/Right when
 * horizontal, reversed in right-to-left text, Up/Down when vertical —
 * Home and End jump to the ends, and disabled tabs are stepped over. With
 * `activation="auto"` (the default) moving selects; with `"manual"` it
 * only moves focus, and Enter or Space selects.
 *
 * Tabs and panels are both children of `<fw-tabs>`, so they share a tree
 * scope and are wired to each other with ids: `aria-controls` from tab to
 * panel, `aria-labelledby` from panel to tab. Tabs and panels added later
 * are picked up. With no `value`, the first enabled tab is selected.
 *
 * Events: `change` when the user selects a tab (after `value` updates),
 * `fw-tab-show` with `detail: { name }` just before it.
 * Slots: `nav` (the `<fw-tab>`s), default (the `<fw-tab-panel>`s).
 * Parts: `base`, `tablist`, `panels`.
 */
export class FwTabs extends FwElement {
  static override props: PropMap = {
    value: { type: "string", reflect: true },
    orientation: { type: "string", reflect: true, default: "horizontal" },
    activation: { type: "string", default: "auto" },
    variant: { type: "string", reflect: true, default: "line" },
    label: { type: "string" },
  };
  static override styles = styles;

  declare value: string | null;
  declare orientation: TabsOrientation;
  declare activation: TabsActivation;
  declare variant: TabsVariant;
  declare label: string | null;

  #tablist!: HTMLElement;
  #collection: Collection | null = null;
  /** Bumped when tabs or panels are added, removed or edited. */
  readonly #version = signal(0);

  /** The tabs, in document order. */
  get tabs(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > fw-tab")];
  }

  /** The panels, in document order. */
  get panels(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > fw-tab-panel")];
  }

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    this.#tablist = document.createElement("div");
    this.#tablist.className = "tablist";
    this.#tablist.setAttribute("part", "tablist");
    this.#tablist.setAttribute("role", "tablist");
    const nav = document.createElement("slot");
    nav.name = "nav";
    this.#tablist.append(nav);

    const panels = document.createElement("div");
    panels.className = "panels";
    panels.setAttribute("part", "panels");
    panels.append(document.createElement("slot"));

    base.append(this.#tablist, panels);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    // Set while a key is being handled, so only keyboard movement — not
    // the collection being told where focus already is — moves and selects.
    let moving = false;

    // The collection's orientation is fixed when it is created, so it is
    // rebuilt whenever the orientation changes.
    scope.bind(() => {
      const vertical = this.prop<string>("orientation").get() === "vertical";
      this.#tablist.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
      const collection = createCollection({
        items: () => this.tabs,
        orientation: vertical ? "vertical" : "horizontal",
        typeahead: false,
        isDisabled: (tab) => tab.hasAttribute("disabled"),
        dir: () => (getComputedStyle(this).direction === "rtl" ? "rtl" : "ltr"),
        onActiveChange: (tab) => {
          if (!moving || !tab) return;
          tab.focus();
          if (this.prop<string>("activation").peek() !== "manual") this.#select(tab);
        },
      });
      this.#collection = collection;
      return () => {
        collection.dispose();
        if (this.#collection === collection) this.#collection = null;
      };
    });

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) this.#tablist.setAttribute("aria-label", label);
      else this.#tablist.removeAttribute("aria-label");
    });

    const bump = () => this.#version.set(this.#version.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(bump);
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["panel", "name", "disabled"],
      });
      scope.add(() => observer.disconnect());
    }

    // Value → which tab is selected, which panel shows, and all the ARIA
    // that ties them together.
    scope.bind(() => {
      this.#version.get();
      const value = this.prop<string | null>("value").get();
      const tabs = this.tabs;
      const panels = this.panels;

      let selected = tabs.find((tab) => value !== null && tab.getAttribute("panel") === value);
      if (!selected) {
        const fallback = tabs.find(
          (tab) => !tab.hasAttribute("disabled") && tab.hasAttribute("panel"),
        );
        const name = fallback?.getAttribute("panel") ?? null;
        if (name !== null && name !== value) {
          // Re-runs this binding with a value that matches a tab.
          this.value = name;
          return;
        }
      }

      for (const tab of tabs) {
        if (!tab.hasAttribute("slot")) tab.setAttribute("slot", "nav");
        tab.setAttribute("role", "tab");
        if (!tab.id) tab.id = nextId("fw-tab");
        const on = tab === selected;
        tab.toggleAttribute("selected", on);
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        const name = tab.getAttribute("panel");
        const panel = panels.find((p) => name !== null && p.getAttribute("name") === name);
        if (panel) {
          if (!panel.id) panel.id = nextId("fw-tab-panel");
          tab.setAttribute("aria-controls", panel.id);
        } else {
          tab.removeAttribute("aria-controls");
        }
      }
      // Nothing selectable: keep the tablist reachable anyway.
      if (!selected) {
        const first = tabs.find((tab) => !tab.hasAttribute("disabled"));
        if (first) first.tabIndex = 0;
      }

      for (const panel of panels) {
        panel.setAttribute("role", "tabpanel");
        if (!panel.id) panel.id = nextId("fw-tab-panel");
        const name = panel.getAttribute("name");
        const tab = tabs.find((t) => name !== null && t.getAttribute("panel") === name);
        if (tab) panel.setAttribute("aria-labelledby", tab.id);
        else panel.removeAttribute("aria-labelledby");
        panel.hidden = !selected || tab !== selected;
        if (panel.querySelector(FOCUSABLE)) panel.removeAttribute("tabindex");
        else panel.tabIndex = 0;
      }
    });

    const tabOf = (event: Event): HTMLElement | null => {
      const tab = (event.target as Element | null)?.closest?.("fw-tab") as HTMLElement | null;
      return tab && tab.parentElement === this ? tab : null;
    };

    const onKey = (event: KeyboardEvent) => {
      const tab = tabOf(event);
      const collection = this.#collection;
      if (!tab || !collection) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.#select(tab);
        return;
      }
      collection.setActive(tab);
      moving = true;
      try {
        if (collection.handleKey(event)) event.preventDefault();
      } finally {
        moving = false;
      }
    };

    const onClick = (event: MouseEvent) => {
      const tab = tabOf(event);
      if (!tab || tab.hasAttribute("disabled")) return;
      tab.focus();
      this.#select(tab);
    };

    this.addEventListener("keydown", onKey);
    this.addEventListener("click", onClick);
    scope.add(() => {
      this.removeEventListener("keydown", onKey);
      this.removeEventListener("click", onClick);
    });
  }

  /** Select a tab from a user action, telling listeners if it changed. */
  #select(tab: HTMLElement): void {
    if (tab.hasAttribute("disabled")) return;
    const name = tab.getAttribute("panel");
    if (name === null || name === this.prop<string | null>("value").peek()) return;
    this.value = name;
    this.emit("fw-tab-show", { name });
    this.emit("change");
  }
}
