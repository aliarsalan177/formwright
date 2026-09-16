import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { srOnly } from "../core/styles.js";

export type SpinnerSize = "sm" | "md" | "lg";

const styles =
  srOnly +
  /* css */ `
:host {
  --_size: 1.5rem;
  display: inline-flex; vertical-align: middle; color: var(--_accent);
}
:host([size="sm"]) { --_size: 1rem; }
:host([size="lg"]) { --_size: 2.25rem; }

.base { display: inline-flex; }
.indicator {
  width: var(--_size); height: var(--_size); border-radius: 50%;
  border: max(2px, calc(var(--_size) * 0.12)) solid color-mix(in srgb, currentColor 20%, transparent);
  border-block-start-color: currentColor;
  animation: fw-spin 0.7s linear infinite;
}
@keyframes fw-spin { to { transform: rotate(360deg); } }
/* A zero-length animation still resolves to some frame; stop it outright so
   the ring rests as a static arc rather than wherever a browser lands. */
@media (prefers-reduced-motion: reduce) {
  .indicator { animation: none; }
}
`;

/**
 * `<fw-spinner>` — an indeterminate loading indicator.
 *
 * ```html
 * <fw-spinner></fw-spinner>
 * <fw-spinner size="lg" label="Loading members"></fw-spinner>
 * <fw-spinner style="color: var(--fw-muted)" size="sm"></fw-spinner>
 * ```
 *
 * A `role="status"` region whose visually hidden text — `label`, "Loading"
 * by default — is read by screen readers. The ring takes `currentColor`
 * (the accent by default). Under `prefers-reduced-motion` it stops
 * spinning and rests as a static arc.
 *
 * Parts: `base`, `indicator`, `label`.
 */
export class FwSpinner extends FwElement {
  static override props: PropMap = {
    size: { type: "string", reflect: true, default: "md" },
    label: { type: "string", default: "Loading" },
  };
  static override styles = styles;

  declare size: SpinnerSize;
  declare label: string;

  #label!: HTMLSpanElement;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("span");
    base.className = "base";
    base.setAttribute("part", "base");
    base.setAttribute("role", "status");

    const indicator = document.createElement("span");
    indicator.className = "indicator";
    indicator.setAttribute("part", "indicator");
    indicator.setAttribute("aria-hidden", "true");

    this.#label = document.createElement("span");
    this.#label.className = "sr-only";
    this.#label.setAttribute("part", "label");

    base.append(indicator, this.#label);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#label.textContent = this.prop<string | null>("label").get() || "Loading";
    });
  }
}
