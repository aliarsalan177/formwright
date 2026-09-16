import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type DividerOrientation = "horizontal" | "vertical";

const styles = /* css */ `
:host {
  display: block;
  margin-block: var(--fw-divider-spacing, 0);
  color: var(--_muted);
}
:host([orientation="vertical"]) {
  display: inline-block; align-self: stretch; vertical-align: middle;
  min-height: 1em; margin-block: 0; margin-inline: var(--fw-divider-spacing, 0);
}

.base { display: flex; align-items: center; gap: 0.75rem; }
:host([orientation="vertical"]) .base { flex-direction: column; height: 100%; min-height: inherit; }

.line { flex: 1; border: 0; border-block-start: 1px solid var(--_border); }
:host([orientation="vertical"]) .line { border-block-start: 0; border-inline-start: 1px solid var(--_border); }

.label { flex: none; font-size: 0.8125rem; line-height: 1.2; white-space: nowrap; }
.label[hidden] + .line { display: none; }
`;

/**
 * `<fw-divider>` — a line between groups of content, optionally labelled.
 *
 * ```html
 * <fw-divider></fw-divider>
 * <fw-divider>or continue with</fw-divider>
 * <div style="display: flex">Edit <fw-divider orientation="vertical"></fw-divider> Delete</div>
 * ```
 *
 * A `role="separator"` with `aria-orientation`. A label is centred in the
 * line; it is decorative text, since a separator's content is not read as
 * such — do not put information only there. Spacing around it comes from
 * `--fw-divider-spacing`.
 *
 * Slots: default (label).
 * Parts: `base`, `line`, `label`.
 */
export class FwDivider extends FwElement {
  static override props: PropMap = {
    orientation: { type: "string", reflect: true, default: "horizontal" },
  };
  static override styles = styles;

  declare orientation: DividerOrientation;

  #label!: HTMLSpanElement;
  #slot!: HTMLSlotElement;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    const line = () => {
      const el = document.createElement("span");
      el.className = "line";
      el.setAttribute("part", "line");
      return el;
    };

    this.#label = document.createElement("span");
    this.#label.className = "label";
    this.#label.setAttribute("part", "label");
    this.#slot = document.createElement("slot");
    this.#label.append(this.#slot);

    base.append(line(), this.#label, line());
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "separator");

    scope.bind(() => {
      const vertical = this.prop<string | null>("orientation").get() === "vertical";
      this.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
    });

    scope.bind(() => {
      this.#slots.get();
      this.#label.hidden = !hasContent(this.#slot);
    });

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    this.#slot.addEventListener("slotchange", onSlotChange);
    scope.add(() => this.#slot.removeEventListener("slotchange", onSlotChange));
  }
}

function hasContent(slot: HTMLSlotElement): boolean {
  return slot
    .assignedNodes()
    .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
}
