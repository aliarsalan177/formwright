import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { LAYER_SLOT, onModalLayerChange, topModalLayer } from "../core/layers.js";

export type ToastPlacement =
  | "top-start"
  | "top-center"
  | "top-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

const styles = /* css */ `
:host {
  inset: auto;
  position: fixed; z-index: var(--fw-toast-z, 1100);
  display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;
  box-sizing: border-box; max-width: 100%; max-height: 100vh;
  padding: 1rem; overflow: hidden;
  bottom: 0; inset-inline-end: 0;
  /* The region spans a corner of the page; only its toasts take clicks. */
  pointer-events: none;
  /* Undo the popover defaults; the region positions itself. */
  margin: 0; border: 0; background: transparent; color: inherit;
}
:host([placement^="top"]) { top: 0; bottom: auto; }
:host([placement$="-start"]) { inset-inline-start: 0; inset-inline-end: auto; align-items: flex-start; }
:host([placement$="-center"]) {
  inset-inline-end: auto; left: 50%; transform: translateX(-50%); align-items: center;
}
::slotted(*) { pointer-events: auto; }
`;

/**
 * `<fw-toast-region>` — where toasts stack, and the live region that
 * announces them.
 *
 * ```html
 * <!-- Optional: showToast() creates one per placement on demand. Putting
 *      it in the page up front lets screen readers register the live
 *      region before the first toast arrives. -->
 * <fw-toast-region placement="top-center" max="3"></fw-toast-region>
 * ```
 *
 * While a `<fw-dialog>`, `<fw-drawer>` or `<fw-command-palette>` is open
 * the region moves inside the innermost one (into its `fw-layer` slot) and
 * back to where it was when that closes. A modal dialog makes everything
 * outside it inert, so a toast left in place would show above the dialog
 * but ignore clicks; inside it, its buttons work. Countdowns carry on
 * across the move.
 *
 * `aria-live="polite"`, `role="region"` and an `aria-label` of
 * "Notifications" are added unless already present. Toasts stack in the
 * order they were added. When more than `max` are showing, the oldest are
 * dismissed.
 *
 * Props: `placement` — `top-start` | `top-center` | `top-end` |
 * `bottom-start` | `bottom-center` | `bottom-end` (default; reflected),
 * `max` (default 5).
 *
 * Slots: default (`<fw-toast>` elements).
 *
 * Custom properties: `--fw-toast-z`, `--fw-toast-width`.
 */
export class FwToastRegion extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    placement: { type: "string", reflect: true, default: "bottom-end" },
    max: { type: "number", default: 5 },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open" };

  declare placement: ToastPlacement;
  declare max: number;

  /** Where it was before moving into a modal. */
  #home: { parent: Node; next: Node | null; slot: string | null } | null = null;

  protected render(root: ShadowRoot): void {
    root.append(document.createElement("slot"));
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("aria-live")) this.setAttribute("aria-live", "polite");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", "Notifications");
    }

    scope.bind(() => {
      const max = this.prop<number | null>("max").get();
      this.#enforceMax(max);
    });

    // In the top layer, so toasts show above an open modal dialog rather
    // than behind its backdrop. Re-shown on each new toast so it stays
    // above a dialog opened after it.
    // A region an app has placed in the page flow (position: static, say
    // to show toasts inline in a panel) stays where it was put: no top
    // layer, and it does not follow modals.
    const inFlow = getComputedStyle(this).position === "static";
    const topLayer = !inFlow && "showPopover" in HTMLElement.prototype;
    if (topLayer) {
      if (!this.hasAttribute("popover")) this.setAttribute("popover", "manual");
      this.#raise();
    }

    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => {
        this.#enforceMax(this.prop<number | null>("max").peek());
        if (topLayer) this.#raise();
      });
      observer.observe(this, { childList: true });
      scope.add(() => observer.disconnect());
    }

    if (inFlow) return;
    scope.add(onModalLayerChange(() => this.#relocate()));
    // Last: moving reconnects this element, which runs all of the above
    // again in the new place.
    this.#relocate();
  }

  /** Follow the innermost open modal in, or go back home when none is. */
  #relocate(): void {
    const top = topModalLayer();
    const target = top && top !== this && !this.contains(top) ? top : null;
    if (target) {
      if (this.parentNode === target) return;
      if (!this.#home && this.parentNode) {
        this.#home = {
          parent: this.parentNode,
          next: this.nextSibling,
          slot: this.getAttribute("slot"),
        };
      }
      this.setAttribute("slot", LAYER_SLOT);
      target.append(this);
      return;
    }
    const home = this.#home;
    if (!home) return;
    this.#home = null;
    if (home.slot === null) this.removeAttribute("slot");
    else this.setAttribute("slot", home.slot);
    const parent = home.parent.isConnected ? home.parent : document.body;
    const next = home.next?.parentNode === parent ? home.next : null;
    parent.insertBefore(this, next);
  }

  #raise(): void {
    if (!this.isConnected || !this.hasAttribute("popover")) return;
    if (this.matches(":popover-open")) this.hidePopover();
    this.showPopover();
  }

  /** The toasts currently showing, oldest first. */
  #toasts(): HTMLElement[] {
    return [...this.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.localName === "fw-toast" && !el.hasAttribute("dismissing"),
    );
  }

  #enforceMax(max: number | null): void {
    if (max === null || !Number.isFinite(max) || max < 1) return;
    const toasts = this.#toasts();
    for (const toast of toasts.slice(0, Math.max(0, toasts.length - Math.floor(max)))) {
      const dismissible = toast as HTMLElement & { dismiss?: () => void };
      if (typeof dismissible.dismiss === "function") dismissible.dismiss();
      else toast.remove();
    }
  }
}
