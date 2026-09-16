import { untrack } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type MenuItemType = "normal" | "checkbox" | "radio";

const styles = /* css */ `
:host {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.625rem; border-radius: var(--_radius-sm);
  font-size: var(--_text-size); line-height: 1.25; cursor: pointer; outline: none;
  user-select: none; white-space: nowrap;
}
:host(:focus), :host([data-active]) { background: var(--_surface-2); }
:host(:focus-visible) { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--_accent) 45%, transparent); }
:host([danger]) { color: var(--_danger); }
:host([danger]:focus), :host([danger][data-active]) {
  background: color-mix(in srgb, var(--_danger) 10%, transparent);
}
:host([disabled]) { opacity: 0.5; cursor: not-allowed; }

.check { width: 1rem; flex: none; display: none; color: var(--_accent); }
:host([type="checkbox"]) .check, :host([type="radio"]) .check { display: inline-flex; visibility: hidden; }
:host([checked]) .check { visibility: visible; }
.dot, :host([type="radio"]) .tick { display: none; }
:host([type="radio"]) .dot { display: block; }
.label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.suffix { margin-inline-start: auto; padding-inline-start: 1rem; color: var(--_muted); font-size: 0.8125em; }
::slotted([slot="prefix"]) { display: inline-flex; flex: none; }
`;

const CHECK = `<svg class="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
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
 * <fw-menu-item type="checkbox" value="archived" checked>Show archived</fw-menu-item>
 * <fw-menu-item type="radio" group="sort" value="name" checked>Sort by name</fw-menu-item>
 * <fw-menu-item type="radio" group="sort" value="joined">Sort by join date</fw-menu-item>
 * ```
 *
 * `type="checkbox"` items toggle `checked` when chosen; `type="radio"`
 * items become checked and uncheck every other radio item with the same
 * `group` in the same dropdown. The item is the page's own element, so its
 * role, `aria-checked` and `aria-disabled` are set on it directly and it
 * receives real focus while the menu is open.
 *
 * Slots: default (label), `prefix` (icon), `suffix` (shortcut hint).
 * Parts: `check`, `label`, `suffix`.
 */
export class FwMenuItem extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    value: { type: "string", default: "" },
    disabled: { type: "boolean", reflect: true },
    danger: { type: "boolean", reflect: true },
    type: { type: "string", reflect: true, default: "normal" },
    checked: { type: "boolean", reflect: true },
    group: { type: "string" },
  };
  static override styles = styles;

  declare value: string;
  declare disabled: boolean;
  declare danger: boolean;
  declare type: MenuItemType;
  declare checked: boolean;
  declare group: string | null;

  /** The label text, without the prefix icon or shortcut hint. Used for typeahead. */
  get text(): string {
    let text = "";
    for (const node of this.childNodes) {
      if (node instanceof Element && node.hasAttribute("slot")) continue;
      text += node.textContent ?? "";
    }
    return text.trim();
  }

  protected render(root: ShadowRoot): void {
    const check = document.createElement("span");
    check.className = "check";
    check.setAttribute("part", "check");
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK + DOT;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));

    const suffix = document.createElement("span");
    suffix.className = "suffix";
    suffix.setAttribute("part", "suffix");
    const suffixSlot = document.createElement("slot");
    suffixSlot.name = "suffix";
    suffix.append(suffixSlot);

    root.append(check, prefix, label, suffix);
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      const type = this.#type(this.prop<string>("type").get());
      this.setAttribute("role", ROLE[type]);
      if (type === "normal") this.removeAttribute("aria-checked");
      else this.setAttribute("aria-checked", String(this.prop<boolean>("checked").get()));
    });

    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });

    // A radio item that becomes checked, however it happened, unchecks
    // the rest of its group — like a native radio button.
    scope.bind(() => {
      const checked = this.prop<boolean>("checked").get();
      const type = this.#type(this.prop<string>("type").get());
      const group = this.prop<string | null>("group").get();
      if (!checked || type !== "radio") return;
      const container = this.closest("fw-dropdown") ?? this.parentElement;
      if (!container) return;
      // Untracked: reading the others' state must not subscribe this item
      // to them, or their becoming checked would re-run this and fight.
      untrack(() => {
        for (const other of container.querySelectorAll<FwMenuItem>("fw-menu-item")) {
          if (other === this || !other.checked) continue;
          if (other.type !== "radio" || (other.group ?? null) !== (group ?? null)) continue;
          if (other.closest("fw-dropdown") !== this.closest("fw-dropdown")) continue;
          other.checked = false;
        }
      });
    });
  }

  #type(value: string | null): MenuItemType {
    return value === "checkbox" || value === "radio" ? value : "normal";
  }
}
