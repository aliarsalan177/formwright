import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: inline-flex; align-items: flex-start; gap: 0.5rem;
  font-size: var(--_text-size); line-height: 1.25rem;
  cursor: pointer; user-select: none; outline: none;
  --_dot: 1rem;
}
.control {
  position: relative; display: inline-block; flex: none;
  width: var(--_dot); height: var(--_dot); margin-block-start: calc((1.25rem - var(--_dot)) / 2);
  border: 1px solid var(--_border); border-radius: 50%; background: var(--_surface);
  transition: border-color var(--_duration), box-shadow var(--_duration);
}
.control::after {
  content: ""; position: absolute; inset: 0; margin: auto;
  width: 45%; height: 45%; border-radius: 50%;
  background: var(--_accent-contrast); transform: scale(0);
  transition: transform var(--_duration);
}
:host([checked]) .control { background: var(--_accent); border-color: var(--_accent); }
:host([checked]) .control::after { transform: scale(1); }
:host(:hover:not([disabled])) .control { border-color: var(--_accent); }
:host(:focus-visible) .control { box-shadow: var(--_ring); }
:host([disabled]) { cursor: not-allowed; opacity: 0.6; }
.label { color: var(--_text); }
`;

/**
 * `<fw-radio>` — one choice inside `<fw-radio-group>`.
 *
 * ```html
 * <fw-radio value="monthly">Monthly</fw-radio>
 * <fw-radio value="yearly" disabled>Yearly</fw-radio>
 * ```
 *
 * Its `checked` state and `tabindex` are managed by the group: set the
 * group's `value` rather than a radio's `checked`. A `checked` radio in the
 * initial markup is honoured when the group has no `value` of its own.
 * Role and state live on the element itself, in the page, so assistive
 * technology reads them directly.
 *
 * Slots: default (label). Parts: `control`, `label`.
 */
export class FwRadio extends FwElement {
  static override props: PropMap = {
    value: { type: "string", default: "" },
    disabled: { type: "boolean", reflect: true },
    checked: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare value: string;
  declare disabled: boolean;
  declare checked: boolean;

  protected render(root: ShadowRoot): void {
    const control = document.createElement("span");
    control.className = "control";
    control.setAttribute("part", "control");
    control.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));
    root.append(control, label);
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "radio");
    // The group decides which radio is tabbable; until it does, none is.
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      this.setAttribute("aria-checked", String(this.prop<boolean>("checked").get()));
    });
    scope.bind(() => {
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });
  }
}
