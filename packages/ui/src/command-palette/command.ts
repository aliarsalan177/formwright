import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.75rem; border-radius: var(--_radius-sm);
  font-size: var(--_text-size); line-height: 1.25; cursor: pointer; user-select: none;
}
:host([data-active]) { background: var(--_surface-2); }
:host([disabled]) { opacity: 0.5; cursor: not-allowed; }
:host([data-filtered]) { display: none !important; }
.prefix { display: inline-flex; flex: none; color: var(--_muted); }
.label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.suffix { display: inline-flex; align-items: center; gap: 0.375rem; flex: none; color: var(--_muted); }
.shortcut {
  font: inherit; font-size: 0.75rem; padding: 0.0625rem 0.375rem;
  border: 1px solid var(--_border); border-radius: var(--_radius-sm); background: var(--_surface);
}
`;

/**
 * `<fw-command>` — one runnable entry in `<fw-command-palette>`.
 *
 * ```html
 * <fw-command value="new-invoice" keywords="bill, create" shortcut="⌘ N">
 *   <svg slot="prefix" …></svg>
 *   New invoice
 * </fw-command>
 * ```
 *
 * Its label is its text (prefix and suffix slots excluded), which is what
 * the palette searches along with the comma-separated `keywords`. `value`
 * defaults to the label. `shortcut` is only a hint shown at the end — the
 * palette does not bind it.
 *
 * Slots: default (label), `prefix` (icon), `suffix`.
 * Parts: `prefix`, `label`, `suffix`, `shortcut`.
 */
export class FwCommand extends FwElement {
  static override props: PropMap = {
    value: { type: "string", default: "" },
    keywords: { type: "string" },
    disabled: { type: "boolean", reflect: true },
    shortcut: { type: "string" },
  };
  static override styles = styles;

  declare value: string;
  declare keywords: string | null;
  declare disabled: boolean;
  declare shortcut: string | null;

  #shortcut!: HTMLElement;
  #prefix!: HTMLElement;

  /** The visible label text, without slotted icons or suffixes. */
  get label(): string {
    let text = "";
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? "";
      else if (node instanceof Element && !node.hasAttribute("slot"))
        text += node.textContent ?? "";
    }
    return text.replace(/\s+/g, " ").trim();
  }

  /** `value`, or the label when no value is set. What `fw-select` reports. */
  get commandValue(): string {
    return this.prop<string | null>("value").peek() || this.label;
  }

  /** Extra search terms from `keywords`. */
  get keywordList(): string[] {
    return (this.prop<string | null>("keywords").peek() ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  protected render(root: ShadowRoot): void {
    const prefix = document.createElement("span");
    prefix.className = "prefix";
    prefix.setAttribute("part", "prefix");
    const prefixSlot = document.createElement("slot");
    prefixSlot.name = "prefix";
    prefix.append(prefixSlot);
    this.#prefix = prefix;

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));

    const suffix = document.createElement("span");
    suffix.className = "suffix";
    suffix.setAttribute("part", "suffix");
    const suffixSlot = document.createElement("slot");
    suffixSlot.name = "suffix";
    this.#shortcut = document.createElement("kbd");
    this.#shortcut.className = "shortcut";
    this.#shortcut.setAttribute("part", "shortcut");
    suffix.append(suffixSlot, this.#shortcut);

    root.append(prefix, label, suffix);
  }

  protected override connected(scope: Scope): void {
    // In the page, not the palette's shadow root, so its own role and
    // state are what assistive technology reads.
    if (!this.hasAttribute("role")) this.setAttribute("role", "option");
    if (!this.id) this.id = nextId("fw-command");
    if (!this.hasAttribute("aria-selected")) this.setAttribute("aria-selected", "false");

    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });
    scope.bind(() => {
      const shortcut = this.prop<string | null>("shortcut").get();
      this.#shortcut.textContent = shortcut ?? "";
      this.#shortcut.hidden = !shortcut;
    });

    // No icon, no gap where it would be.
    const prefixSlot = this.#prefix.querySelector("slot")!;
    const onPrefix = () => {
      this.#prefix.hidden = prefixSlot.assignedNodes().length === 0;
    };
    onPrefix();
    prefixSlot.addEventListener("slotchange", onPrefix);
    scope.add(() => prefixSlot.removeEventListener("slotchange", onPrefix));
  }
}
