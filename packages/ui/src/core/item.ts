import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "./element.js";
import { slotHasContent } from "./field.js";

/**
 * The row every list-like element shares: `<fw-option>`, `<fw-menu-item>`
 * and `<fw-list-item>`. One anatomy and one set of styles, so an option in
 * a select, an action in a menu and a row in a page list line up and
 * highlight the same way.
 */
export const itemStyles = /* css */ `
:host {
  --_item-min-height: 2rem;
  --_item-pad-block: 0.375rem;
  --_item-pad-inline: 0.5rem;
  display: flex; align-items: center; gap: 0.5rem;
  min-height: var(--_item-min-height);
  padding: var(--_item-pad-block) var(--_item-pad-inline);
  border-radius: min(var(--_radius-sm), 0.5rem);
  font-size: var(--_text-size); line-height: 1.25rem; color: var(--_text); text-align: start;
  cursor: pointer; outline: none; user-select: none;
  scroll-margin-block: 0.25rem;
  transition: background-color var(--_duration), color var(--_duration);
}
:host([size="sm"]) { --_item-min-height: 1.75rem; --_item-pad-block: 0.25rem; }
:host([size="lg"]) { --_item-min-height: 2.5rem; --_item-pad-block: 0.5rem; --_item-pad-inline: 0.625rem; }

:host(:hover), :host([data-active]), :host(:focus-visible), :host([aria-expanded="true"]) {
  background: var(--_surface-2);
}
:host(:active) { background: var(--_accent-soft); }
:host([selected]) { font-weight: 500; }

:host([danger]) { color: var(--_danger); }
:host([danger]:hover), :host([danger][data-active]), :host([danger]:focus-visible) {
  background: color-mix(in srgb, var(--_danger) 10%, transparent);
}
:host([danger]:active) { background: color-mix(in srgb, var(--_danger) 16%, transparent); }

/* A row that does nothing when pressed: a plain entry in a page list. */
:host([data-static]) { cursor: default; user-select: auto; }
:host([data-static]:hover), :host([data-static]:active) { background: transparent; }

:host([disabled]) { color: var(--_muted); opacity: 0.7; cursor: not-allowed; }
:host([disabled]:hover), :host([disabled][data-active]), :host([disabled]:focus-visible),
:host([disabled]:active) { background: transparent; }

/* The check only takes room when the container says rows are selectable.
   It trails there, so option text lines up with the text in a trigger. */
.check { display: none; flex: none; width: 1rem; color: var(--_accent); }
.check svg { display: block; }
:host([data-selectable]) .check { display: inline-flex; order: 1; visibility: hidden; }
:host([data-selectable][selected]) .check { visibility: visible; }

::slotted([slot="prefix"]) {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
}
.text { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; }
.label { overflow-wrap: anywhere; }
.description {
  font-size: 0.8125em; line-height: 1.125rem; font-weight: 400;
  color: var(--_muted); overflow-wrap: anywhere;
}
.suffix {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; flex: none;
  margin-inline-start: auto; padding-inline-start: 0.5rem;
  color: var(--_muted); font-size: 0.75rem; font-weight: 400; white-space: nowrap;
}
::slotted(kbd[slot="suffix"]) { font: inherit; letter-spacing: 0.04em; }
:host([danger]) .description, :host([danger]) .suffix {
  color: color-mix(in srgb, var(--_danger) 70%, var(--_muted));
}
:host([disabled]) .description, :host([disabled]) .suffix { color: inherit; }

.chevron { display: none; order: 2; flex: none; margin-inline-end: -0.25rem; color: var(--_muted); }
.chevron svg { display: block; }
:host([aria-haspopup="menu"]) .chevron { display: inline-flex; }
:host(:dir(rtl)) .chevron svg { transform: scaleX(-1); }
`;

/** @internal */
export const CHECK_ICON = `<svg class="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
/** @internal */
export const CHEVRON_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;

export type ItemSize = "sm" | "md" | "lg";

/** @internal The shadow nodes a subclass may rearrange or extend. */
export interface ItemParts {
  check: HTMLSpanElement;
  prefix: HTMLSlotElement;
  text: HTMLSpanElement;
  label: HTMLSpanElement;
  description: HTMLSpanElement;
  descriptionText: HTMLSpanElement;
  suffix: HTMLSpanElement;
  chevron: HTMLSpanElement;
}

/**
 * `FwItemBase` — the shared row behind `<fw-option>`, `<fw-menu-item>` and
 * `<fw-list-item>`. Not registered itself; extend it.
 *
 * ```html
 * <fw-list-item value="sana" description="Head trainer">
 *   <fw-avatar slot="prefix" name="Sana Malik" size="sm"></fw-avatar>
 *   Sana Malik
 *   <fw-badge slot="suffix">12</fw-badge>
 * </fw-list-item>
 * ```
 *
 * Anatomy, in order: a check indicator (shown only when the container
 * marks rows `data-selectable`), a `prefix` slot for an icon or avatar, a
 * text column with the label and an optional description, a `suffix` slot
 * for a badge, count or shortcut, and a chevron for rows that open
 * something. The description comes from the `description` slot, or the
 * `description` attribute when nothing is slotted, and takes no room when
 * both are empty.
 *
 * `text` is what the row is called in a closed select and for
 * type-to-find: `label` if set, else the default-slot text alone — the
 * prefix, suffix and description do not count.
 *
 * Slots: default (label), `prefix`, `description`, `suffix`.
 * Parts: `check`, `label`, `description`, `suffix`, `chevron`.
 */
export abstract class FwItemBase extends FwElement {
  static override props: PropMap = {
    value: { type: "string", default: "" },
    label: { type: "string" },
    description: { type: "string" },
    disabled: { type: "boolean", reflect: true },
    selected: { type: "boolean", reflect: true },
    danger: { type: "boolean", reflect: true },
    size: { type: "string", reflect: true },
  };
  static override styles = itemStyles;

  declare value: string;
  declare label: string | null;
  declare description: string | null;
  declare disabled: boolean;
  declare selected: boolean;
  declare danger: boolean;
  declare size: ItemSize | null;

  /** @internal Set by render(). */
  protected itemParts!: ItemParts;
  readonly #slots = signal(0);

  /** The row's plain text: `label`, or the default-slot text without prefix, suffix or description. */
  get text(): string {
    const label = this.prop<string | null>("label").peek();
    if (label !== null) return label.trim();
    let text = "";
    for (const node of this.childNodes) {
      if (node instanceof Element && node.hasAttribute("slot")) continue;
      text += node.textContent ?? "";
    }
    return text.replace(/\s+/g, " ").trim();
  }

  protected render(root: ShadowRoot): void {
    const check = document.createElement("span");
    check.className = "check";
    check.setAttribute("part", "check");
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK_ICON;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));

    const description = document.createElement("span");
    description.className = "description";
    description.setAttribute("part", "description");
    const descriptionSlot = document.createElement("slot");
    descriptionSlot.name = "description";
    const descriptionText = document.createElement("span");
    descriptionSlot.append(descriptionText);
    description.append(descriptionSlot);
    description.hidden = true;

    const text = document.createElement("span");
    text.className = "text";
    text.append(label, description);

    const suffix = document.createElement("span");
    suffix.className = "suffix";
    suffix.setAttribute("part", "suffix");
    const suffixSlot = document.createElement("slot");
    suffixSlot.name = "suffix";
    suffix.append(suffixSlot);
    suffix.hidden = true;

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.setAttribute("part", "chevron");
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = CHEVRON_ICON;

    this.itemParts = { check, prefix, text, label, description, descriptionText, suffix, chevron };
    root.append(check, prefix, text, suffix, chevron);
  }

  protected override connected(scope: Scope): void {
    const parts = this.itemParts;

    // Empty description and suffix take no room, so a plain row has no gap.
    scope.bind(() => {
      this.#slots.get();
      const description = this.prop<string | null>("description").get() ?? "";
      parts.descriptionText.textContent = description;
      parts.description.hidden =
        description.trim() === "" && !slotHasContent(this.root, "description");
      parts.suffix.hidden = !slotHasContent(this.root, "suffix");
    });

    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => this.root.removeEventListener("slotchange", onSlotChange));
  }
}
