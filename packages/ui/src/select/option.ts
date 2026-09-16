import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.625rem; border-radius: var(--_radius-sm);
  font-size: var(--_text-size); line-height: 1.25; cursor: pointer; outline: none;
  user-select: none;
}
:host(:focus), :host([data-active]) { background: var(--_surface-2); }
:host([selected]) { font-weight: 500; }
:host([disabled]) { opacity: 0.5; cursor: not-allowed; }
.check { width: 1rem; flex: none; visibility: hidden; color: var(--_accent); }
:host([selected]) .check { visibility: visible; }
.label { flex: 1; min-width: 0; }
`;

/**
 * `<fw-option>` — one choice inside `<fw-select>` (and later the combobox
 * and multi-select).
 *
 * ```html
 * <fw-option value="MALE">Male</fw-option>
 * <fw-option value="FEMALE" disabled>Female</fw-option>
 * <fw-option value="pk" label="Pakistan"><img slot="prefix" …> Pakistan</fw-option>
 * ```
 *
 * Its content can be anything; `label` sets the plain text shown in the
 * closed select and used for type-to-find when the content is richer.
 *
 * Slots: default, `prefix`. Parts: `check`, `label`.
 */
export class FwOption extends FwElement {
  static override props: PropMap = {
    value: { type: "string", default: "" },
    label: { type: "string" },
    disabled: { type: "boolean", reflect: true },
    selected: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare value: string;
  declare label: string | null;
  declare disabled: boolean;
  declare selected: boolean;

  /** The text this option shows as, when closed and when typed for. */
  get text(): string {
    return (this.prop<string | null>("label").peek() ?? this.textContent ?? "").trim();
  }

  protected render(root: ShadowRoot): void {
    const check = document.createElement("span");
    check.className = "check";
    check.setAttribute("part", "check");
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    const prefix = document.createElement("slot");
    prefix.name = "prefix";
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));
    root.append(check, prefix, label);
  }

  protected override connected(scope: Scope): void {
    // Options live in the page, not the select's shadow root, so their own
    // role and state are what assistive technology reads.
    if (!this.hasAttribute("role")) this.setAttribute("role", "option");
    if (!this.id) this.id = nextId("fw-option");
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      this.setAttribute("aria-selected", String(this.prop<boolean>("selected").get()));
    });
    scope.bind(() => {
      const disabled = this.prop<boolean>("disabled").get();
      if (disabled) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });
  }
}
