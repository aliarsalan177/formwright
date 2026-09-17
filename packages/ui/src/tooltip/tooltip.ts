import { signal } from "@formwright/reactive";
import { anchorTo, type Anchored, type Placement, type Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host { display: contents; }

.tooltip {
  margin: 0; inset: auto; padding: 0.375rem 0.625rem;
  overflow: visible;
  max-width: min(20rem, calc(100vw - 16px));
  background: var(--fw-tooltip-background, var(--_text));
  color: var(--fw-tooltip-color, var(--_surface));
  border: none; border-radius: min(var(--_radius-sm), 0.75rem);
  box-shadow: var(--_shadow);
  font-family: var(--_font); font-size: 0.8125rem; font-weight: 500; line-height: 1.35;
  pointer-events: auto;
  overflow-wrap: break-word;
}

.arrow {
  position: absolute; width: 8px; height: 8px;
  background: inherit;
  transform: rotate(45deg);
  pointer-events: none;
}
.tooltip[data-placement^="top"] .arrow { bottom: -4px; left: calc(var(--fw-arrow, 50%) - 4px); }
.tooltip[data-placement^="bottom"] .arrow { top: -4px; left: calc(var(--fw-arrow, 50%) - 4px); }
.tooltip[data-placement^="left"] .arrow { right: -4px; top: calc(var(--fw-arrow, 50%) - 4px); }
.tooltip[data-placement^="right"] .arrow { left: -4px; top: calc(var(--fw-arrow, 50%) - 4px); }
`;

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** The element that really has focus, looking through shadow roots. */
function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** Focus from the keyboard, not from a click. Unsupported → assume keyboard. */
function isFocusVisible(el: Element | null): boolean {
  if (!el) return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

/**
 * `<fw-tooltip>` — a short, plain-text hint for the element it wraps.
 *
 * ```html
 * <fw-tooltip content="Freeze membership">
 *   <fw-button variant="ghost" aria-label="Freeze">❄</fw-button>
 * </fw-tooltip>
 *
 * <fw-tooltip placement="right" delay="200">
 *   <abbr>PT</abbr>
 *   <span slot="content">Personal training session</span>
 * </fw-tooltip>
 * ```
 *
 * Shows after the pointer rests on the trigger for `delay` ms and at once
 * when the trigger receives keyboard focus. Hides `hide-delay` ms after the
 * pointer leaves — hovering the tooltip itself keeps it open — and
 * immediately on blur or Escape. `disabled` suppresses it. It never takes
 * focus and holds nothing interactive; use `<fw-popover>` for that.
 *
 * Accessibility. The tooltip sits in the shadow root and the trigger in
 * the page, so `aria-describedby` cannot point across. Instead its plain
 * text is mirrored into `aria-description` on the first slotted element,
 * and removed again when the tooltip leaves the page.
 *
 * Events: `fw-show`, `fw-hide`.
 * Slots: default (the trigger), `content` (rich tooltip text).
 * Parts: `body`, `content`, `arrow`.
 */
export class FwTooltip extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    content: { type: "string" },
    placement: { type: "string", default: "top" },
    delay: { type: "number", default: 400 },
    hideDelay: { type: "number", default: 100 },
    open: { type: "boolean", reflect: true },
    disabled: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare content: string | null;
  declare placement: Placement;
  declare delay: number;
  declare hideDelay: number;
  declare open: boolean;
  declare disabled: boolean;

  #body!: HTMLElement;
  #text!: HTMLElement;
  #anchored: Anchored | null = null;
  #shown = false;
  #hovering = false;
  #showTimer: ReturnType<typeof setTimeout> | null = null;
  #hideTimer: ReturnType<typeof setTimeout> | null = null;
  /** The element carrying `aria-description`, and the value set on it. */
  #described: { el: Element; text: string } | null = null;
  readonly #version = signal(0);

  /** The element the tooltip describes: the first slotted element. */
  get triggerElement(): HTMLElement | null {
    for (const child of this.children) {
      if (!child.hasAttribute("slot") && child instanceof HTMLElement) return child;
    }
    return null;
  }

  /** The tooltip's text as a screen reader should hear it. */
  get text(): string {
    const slotted = [...this.children]
      .filter((child) => child.getAttribute("slot") === "content")
      .map((child) => child.textContent ?? "")
      .join(" ")
      .trim();
    return slotted || (this.prop<string | null>("content").peek() ?? "").trim();
  }

  protected render(root: ShadowRoot): void {
    this.#body = document.createElement("div");
    this.#body.className = "tooltip";
    this.#body.setAttribute("part", "body");
    this.#body.setAttribute("role", "tooltip");
    if (hasPopover) this.#body.setAttribute("popover", "manual");
    else this.#body.hidden = true;

    const content = document.createElement("slot");
    content.name = "content";
    content.setAttribute("part", "content");
    this.#text = document.createElement("span");
    content.append(this.#text);

    const arrow = document.createElement("div");
    arrow.className = "arrow";
    arrow.setAttribute("part", "arrow");
    arrow.setAttribute("aria-hidden", "true");

    this.#body.append(content, arrow);
    root.append(document.createElement("slot"), this.#body);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#text.textContent = this.prop<string | null>("content").get() ?? "";
    });

    // Trigger and text → aria-description on the trigger.
    scope.bind(() => {
      this.#version.get();
      this.prop<string | null>("content").get();
      this.#describe(this.triggerElement, this.text);
    });
    scope.add(() => this.#describe(null, ""));

    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => this.#version.set(this.#version.peek() + 1));
      observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["slot"],
      });
      scope.add(() => observer.disconnect());
    }

    scope.bind(() => {
      if (this.prop<boolean>("disabled").get() && this.prop<boolean>("open").peek()) {
        this.#close();
      }
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      this.prop<Placement>("placement").get();
      if (open && !this.prop<boolean>("disabled").peek()) this.#show();
      else this.#hide();
    });
    scope.add(() => {
      this.#clearTimers();
      this.#hovering = false;
      this.#hide(false);
    });

    const onPointerEnter = () => {
      this.#hovering = true;
      this.#scheduleShow();
    };
    const onPointerLeave = () => {
      this.#hovering = false;
      this.#scheduleHide();
    };

    const onFocusIn = () => {
      if (this.prop<boolean>("disabled").peek()) return;
      if (!isFocusVisible(deepActiveElement())) return;
      this.#clearTimers();
      this.open = true;
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && this.contains(next)) return;
      if (this.#hovering) return;
      this.#close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !this.prop<boolean>("open").peek()) return;
      // Dismiss the tooltip only: the dialog around the trigger stays open.
      event.stopPropagation();
      this.#close();
    };
    // Hover-shown content must be dismissable without moving the pointer
    // or focus (WCAG 1.4.13), so Escape anywhere hides it.
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && this.prop<boolean>("open").peek()) this.#close();
    };

    const onOutside = (event: Event) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.#close();
    };

    const onSlotChange = () => this.#version.set(this.#version.peek() + 1);

    const body = this.#body;
    this.addEventListener("pointerenter", onPointerEnter);
    this.addEventListener("pointerleave", onPointerLeave);
    body.addEventListener("pointerenter", onPointerEnter);
    body.addEventListener("pointerleave", onPointerLeave);
    this.addEventListener("focusin", onFocusIn);
    this.addEventListener("focusout", onFocusOut);
    this.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    document.addEventListener("pointerdown", onOutside, true);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      this.removeEventListener("pointerenter", onPointerEnter);
      this.removeEventListener("pointerleave", onPointerLeave);
      body.removeEventListener("pointerenter", onPointerEnter);
      body.removeEventListener("pointerleave", onPointerLeave);
      this.removeEventListener("focusin", onFocusIn);
      this.removeEventListener("focusout", onFocusOut);
      this.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("pointerdown", onOutside, true);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Move `aria-description` to `el`, leaving no stale copy on a previous trigger. */
  #describe(el: Element | null, text: string): void {
    const prev = this.#described;
    if (prev && (prev.el !== el || !text)) {
      // Only undo our own write; an author's later change is theirs.
      if (prev.el.getAttribute("aria-description") === prev.text) {
        prev.el.removeAttribute("aria-description");
      }
      this.#described = null;
    }
    if (el && text) {
      el.setAttribute("aria-description", text);
      this.#described = { el, text };
    }
  }

  #clearTimers(): void {
    if (this.#showTimer) clearTimeout(this.#showTimer);
    if (this.#hideTimer) clearTimeout(this.#hideTimer);
    this.#showTimer = null;
    this.#hideTimer = null;
  }

  #scheduleShow(): void {
    if (this.#hideTimer) clearTimeout(this.#hideTimer);
    this.#hideTimer = null;
    if (this.prop<boolean>("disabled").peek()) return;
    if (this.prop<boolean>("open").peek() || this.#showTimer) return;
    const delay = Math.max(0, this.prop<number>("delay").peek() ?? 400);
    this.#showTimer = setTimeout(() => {
      this.#showTimer = null;
      this.open = true;
    }, delay);
  }

  #scheduleHide(): void {
    if (this.#showTimer) clearTimeout(this.#showTimer);
    this.#showTimer = null;
    if (!this.prop<boolean>("open").peek() || this.#hideTimer) return;
    // Focus from the keyboard keeps it: only blur should hide it then.
    const focused = document.activeElement;
    if (focused && this.contains(focused) && isFocusVisible(deepActiveElement())) return;
    const delay = Math.max(0, this.prop<number>("hideDelay").peek() ?? 100);
    this.#hideTimer = setTimeout(() => {
      this.#hideTimer = null;
      this.open = false;
    }, delay);
  }

  #close(): void {
    this.#clearTimers();
    this.open = false;
  }

  #show(): void {
    const body = this.#body;
    const wasShown = this.#shown;
    if (!wasShown) {
      if (hasPopover) {
        if (!body.matches(":popover-open")) body.showPopover();
      } else {
        body.hidden = false;
      }
      this.#shown = true;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.triggerElement ?? this, body, {
      placement: this.prop<Placement>("placement").peek() ?? "top",
      offset: 8,
    });
    if (!wasShown) this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#anchored?.dispose();
    this.#anchored = null;
    if (!this.#shown) return;
    this.#shown = false;
    const body = this.#body;
    if (hasPopover) {
      if (body.matches(":popover-open")) body.hidePopover();
    } else {
      body.hidden = true;
    }
    if (emit) this.emit("fw-hide");
  }
}
