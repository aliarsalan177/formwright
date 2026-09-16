import { signal } from "@formwright/reactive";
import {
  anchorTo,
  focusableWithin,
  type Anchored,
  type Placement,
  type Scope,
} from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type PopoverTrigger = "click" | "hover" | "focus" | "manual";

const styles = /* css */ `
:host { display: contents; }

.panel {
  margin: 0; inset: auto; padding: 0;
  overflow: visible;
  max-width: min(24rem, calc(100vw - 16px));
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
  font-size: var(--_text-size);
}
.body {
  padding: 0.75rem;
  max-height: var(--fw-available-height, none);
  overflow: auto; overscroll-behavior: contain;
  border-radius: inherit;
}

.arrow {
  position: absolute; width: 10px; height: 10px;
  background: var(--_surface);
  border: 1px solid transparent;
  transform: rotate(45deg);
  pointer-events: none;
}
.panel[data-placement^="bottom"] .arrow {
  top: -6px; left: calc(var(--fw-arrow, 50%) - 5px);
  border-top-color: var(--_border); border-left-color: var(--_border);
}
.panel[data-placement^="top"] .arrow {
  bottom: -6px; left: calc(var(--fw-arrow, 50%) - 5px);
  border-bottom-color: var(--_border); border-right-color: var(--_border);
}
.panel[data-placement^="left"] .arrow {
  right: -6px; top: calc(var(--fw-arrow, 50%) - 5px);
  border-top-color: var(--_border); border-right-color: var(--_border);
}
.panel[data-placement^="right"] .arrow {
  left: -6px; top: calc(var(--fw-arrow, 50%) - 5px);
  border-bottom-color: var(--_border); border-left-color: var(--_border);
}
`;

/** Top layer where the browser has it — above every z-index and outside any
 *  transformed ancestor — and a fixed-position fallback where it does not. */
const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** How long the pointer rests on the trigger before a hover popover opens. */
const HOVER_OPEN_DELAY = 150;
/** Grace period after the pointer leaves, long enough to cross the gap into the panel. */
const HOVER_CLOSE_DELAY = 200;

/**
 * `<fw-popover>` — rich, interactive content anchored to a trigger.
 *
 * ```html
 * <fw-popover placement="bottom" arrow label="Member actions">
 *   <fw-button slot="trigger" variant="secondary">Actions</fw-button>
 *   <p>Freeze this membership until the member returns?</p>
 *   <fw-button size="sm">Freeze</fw-button>
 * </fw-popover>
 *
 * <fw-popover trigger="hover">
 *   <a slot="trigger" href="/members/42">Ayesha Khan</a>
 *   <p>Gold plan · renews 3 Oct</p>
 * </fw-popover>
 * ```
 *
 * `trigger` decides what opens it: `click` (default) toggles on click,
 * `hover` opens after a short rest on the trigger or when it gains focus
 * and closes after a grace period — so the pointer can cross into the
 * panel — `focus` follows focus, and `manual` leaves it to `open`,
 * `show()` and `hide()`. A press outside closes every mode except
 * `manual`; Escape closes every mode.
 *
 * Opened by a click, focus moves to the first focusable control in the
 * content, and goes back to the trigger when it closes. It is a
 * non-modal dialog: focus is not trapped, and tabbing out closes it.
 *
 * The trigger is the page's own element, so `aria-expanded` and
 * `aria-haspopup="dialog"` are set on it directly — no id has to cross
 * the shadow boundary.
 *
 * Events: `fw-show`, `fw-hide`.
 * Slots: `trigger`, default (content).
 * Parts: `panel`, `body`, `arrow`.
 */
export class FwPopover extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    open: { type: "boolean", reflect: true },
    placement: { type: "string", default: "bottom" },
    trigger: { type: "string", default: "click" },
    arrow: { type: "boolean", reflect: true },
    offset: { type: "number", default: 8 },
    label: { type: "string" },
  };
  static override styles = styles;

  declare open: boolean;
  declare placement: Placement;
  declare trigger: PopoverTrigger;
  declare arrow: boolean;
  declare offset: number;
  declare label: string | null;

  #panel!: HTMLElement;
  #arrow!: HTMLElement;
  #anchored: Anchored | null = null;
  #shown = false;
  /** The trigger that currently carries this popover's ARIA state. */
  #ariaTarget: Element | null = null;
  /** Set while a click is opening the popover, so focus moves into it. */
  #openingByClick = false;
  #hovering = false;
  #openTimer: ReturnType<typeof setTimeout> | null = null;
  #closeTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #slots = signal(0);

  /** The slotted trigger element, if there is one. */
  get triggerElement(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }

  protected render(root: ShadowRoot): void {
    const trigger = document.createElement("slot");
    trigger.name = "trigger";

    this.#panel = document.createElement("div");
    this.#panel.className = "panel";
    this.#panel.setAttribute("part", "panel");
    this.#panel.setAttribute("role", "dialog");
    if (hasPopover) this.#panel.setAttribute("popover", "manual");
    else this.#panel.hidden = true;

    this.#arrow = document.createElement("div");
    this.#arrow.className = "arrow";
    this.#arrow.setAttribute("part", "arrow");
    this.#arrow.setAttribute("aria-hidden", "true");
    this.#arrow.hidden = true;

    const body = document.createElement("div");
    body.className = "body";
    body.setAttribute("part", "body");
    body.append(document.createElement("slot"));

    this.#panel.append(this.#arrow, body);
    root.append(trigger, this.#panel);
  }

  protected override connected(scope: Scope): void {
    const panel = this.#panel;

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) panel.setAttribute("aria-label", label);
      else panel.removeAttribute("aria-label");
    });

    scope.bind(() => {
      this.#arrow.hidden = !this.prop<boolean>("arrow").get();
    });

    // ARIA state lives on the slotted trigger, which is in the page's tree.
    scope.bind(() => {
      this.#slots.get();
      const open = this.prop<boolean>("open").get();
      const trigger = this.triggerElement;
      if (this.#ariaTarget && this.#ariaTarget !== trigger) this.#clearAria(this.#ariaTarget);
      this.#ariaTarget = trigger;
      if (trigger) {
        trigger.setAttribute("aria-haspopup", "dialog");
        trigger.setAttribute("aria-expanded", String(open));
      }
    });
    scope.add(() => {
      if (this.#ariaTarget) this.#clearAria(this.#ariaTarget);
      this.#ariaTarget = null;
    });

    // Open state, placement and offset → the panel and its position.
    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      this.prop<Placement>("placement").get();
      this.prop<number>("offset").get();
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => {
      this.#clearTimers();
      this.#hovering = false;
      this.#hide(false);
    });

    const mode = () => (this.prop<string>("trigger").peek() ?? "click") as PopoverTrigger;
    const inTrigger = (node: EventTarget | null) => {
      const trigger = this.triggerElement;
      return Boolean(trigger && node instanceof Node && trigger.contains(node));
    };
    const inside = (node: EventTarget | null) =>
      node instanceof Node && (this.contains(node) || this.root.contains(node));

    const onClick = (event: MouseEvent) => {
      if (mode() !== "click" || !inTrigger(event.target)) return;
      if (this.prop<boolean>("open").peek()) {
        this.#close(true);
      } else {
        this.#openingByClick = true;
        try {
          this.open = true;
        } finally {
          this.#openingByClick = false;
        }
      }
    };

    const onPointerEnter = () => {
      this.#hovering = true;
      if (mode() === "hover") this.#scheduleOpen();
    };
    const onPointerLeave = () => {
      this.#hovering = false;
      if (mode() !== "hover") return;
      // Someone who has tabbed into the content is using it; a stray
      // pointer movement should not snatch it away.
      if (this.#focusInContent()) return;
      this.#scheduleClose();
    };

    const onFocusIn = () => {
      const m = mode();
      if (m === "hover") this.#scheduleOpen();
      else if (m === "focus") {
        this.#clearTimers();
        this.open = true;
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      const next = event.relatedTarget;
      if (inside(next)) return;
      const m = mode();
      if (m === "hover") {
        if (!this.#hovering) this.#scheduleClose();
      } else if (m === "focus") {
        if (!this.#hovering) this.#close(false);
      } else if (m === "click" && next !== null) {
        // Tabbed away. A null relatedTarget is a press on something
        // unfocusable — possibly inside the panel — which the outside
        // press handler judges instead.
        this.#close(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !this.prop<boolean>("open").peek()) return;
      event.preventDefault();
      // Stop here, so the dialog or drawer this sits in stays open.
      event.stopPropagation();
      this.#close(true);
    };
    // Escape still dismisses it when focus is somewhere else entirely —
    // a hover popover must be dismissable without moving the pointer.
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !this.prop<boolean>("open").peek()) return;
      if (event.composedPath().includes(this)) return;
      this.#close(false);
    };

    const onOutside = (event: Event) => {
      if (!this.prop<boolean>("open").peek() || mode() === "manual") return;
      if (!event.composedPath().includes(this)) this.#close(false);
    };

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    this.addEventListener("click", onClick);
    this.addEventListener("pointerenter", onPointerEnter);
    this.addEventListener("pointerleave", onPointerLeave);
    panel.addEventListener("pointerenter", onPointerEnter);
    panel.addEventListener("pointerleave", onPointerLeave);
    this.addEventListener("focusin", onFocusIn);
    this.addEventListener("focusout", onFocusOut);
    this.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    document.addEventListener("pointerdown", onOutside, true);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      this.removeEventListener("click", onClick);
      this.removeEventListener("pointerenter", onPointerEnter);
      this.removeEventListener("pointerleave", onPointerLeave);
      panel.removeEventListener("pointerenter", onPointerEnter);
      panel.removeEventListener("pointerleave", onPointerLeave);
      this.removeEventListener("focusin", onFocusIn);
      this.removeEventListener("focusout", onFocusOut);
      this.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("pointerdown", onOutside, true);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #clearAria(el: Element): void {
    el.removeAttribute("aria-haspopup");
    el.removeAttribute("aria-expanded");
  }

  #clearTimers(): void {
    if (this.#openTimer) clearTimeout(this.#openTimer);
    if (this.#closeTimer) clearTimeout(this.#closeTimer);
    this.#openTimer = null;
    this.#closeTimer = null;
  }

  #scheduleOpen(): void {
    if (this.#closeTimer) clearTimeout(this.#closeTimer);
    this.#closeTimer = null;
    if (this.prop<boolean>("open").peek() || this.#openTimer) return;
    this.#openTimer = setTimeout(() => {
      this.#openTimer = null;
      this.open = true;
    }, HOVER_OPEN_DELAY);
  }

  #scheduleClose(): void {
    if (this.#openTimer) clearTimeout(this.#openTimer);
    this.#openTimer = null;
    if (!this.prop<boolean>("open").peek() || this.#closeTimer) return;
    this.#closeTimer = setTimeout(() => {
      this.#closeTimer = null;
      this.#close(false);
    }, HOVER_CLOSE_DELAY);
  }

  /** Content elements — every light-DOM child that is not the trigger. */
  #focusables(): HTMLElement[] {
    return focusableWithin(this).filter((el) => {
      let top: Element = el;
      while (top.parentElement && top.parentElement !== this) top = top.parentElement;
      return !top.hasAttribute("slot");
    });
  }

  #focusInContent(): boolean {
    const active = document.activeElement;
    if (!active || active === this) return false;
    const trigger = this.triggerElement;
    if (trigger?.contains(active)) return false;
    return this.contains(active);
  }

  #show(): void {
    const panel = this.#panel;
    const wasShown = this.#shown;
    if (!wasShown) {
      if (hasPopover) {
        if (!panel.matches(":popover-open")) panel.showPopover();
      } else {
        panel.hidden = false;
      }
      this.#shown = true;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.triggerElement ?? this, panel, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom",
      offset: this.prop<number>("offset").peek() ?? 8,
    });
    if (wasShown) return;
    if (this.#openingByClick) this.#focusables()[0]?.focus({ preventScroll: true });
    this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#anchored?.dispose();
    this.#anchored = null;
    if (!this.#shown) return;
    this.#shown = false;
    const panel = this.#panel;
    if (hasPopover) {
      if (panel.matches(":popover-open")) panel.hidePopover();
    } else {
      panel.hidden = true;
    }
    if (emit) this.emit("fw-hide");
  }

  /** Close, putting focus back on the trigger if it was inside the content. */
  #close(returnFocus: boolean): void {
    this.#clearTimers();
    if (!this.prop<boolean>("open").peek()) return;
    const refocus = returnFocus && this.#focusInContent();
    this.open = false;
    if (refocus) this.triggerElement?.focus();
  }

  /** Open the popover. */
  show(): void {
    this.#clearTimers();
    this.open = true;
  }

  /** Close the popover, returning focus to the trigger if it was inside. */
  hide(): void {
    this.#close(true);
  }

  /** Open it if closed, close it if open. */
  toggle(): void {
    if (this.prop<boolean>("open").peek()) this.hide();
    else this.show();
  }
}
