import { signal, untrack } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";

export type ToastTone = "info" | "success" | "warning" | "danger";
/** Why a toast went away. `detail.reason` of `fw-dismiss`. */
export type ToastDismissReason = "timeout" | "close-button" | "method";

export interface ToastDismissDetail {
  reason: ToastDismissReason;
}

const svg = (body: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS: Record<ToastTone, string> = {
  info: svg(`<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>`),
  success: svg(`<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>`),
  warning: svg(
    `<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>`,
  ),
  danger: svg(`<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>`),
};
const CLOSE_ICON = svg(`<path d="M18 6 6 18M6 6l12 12"/>`);

function parseTimes(value: string): number[] {
  if (!value) return [];
  return value.split(",").map((part) => {
    const text = part.trim();
    const n = parseFloat(text);
    if (Number.isNaN(n)) return 0;
    return text.endsWith("ms") ? n : n * 1000;
  });
}

/** The element's longest transition in ms; 0 under reduced motion. */
function transitionMs(el: Element): number {
  const style = getComputedStyle(el);
  const durations = parseTimes(style.transitionDuration);
  const delays = parseTimes(style.transitionDelay);
  let longest = 0;
  durations.forEach((duration, i) => {
    const delay = delays.length > 0 ? (delays[i % delays.length] ?? 0) : 0;
    longest = Math.max(longest, duration + delay);
  });
  return longest;
}

const styles = /* css */ `
:host {
  --_toast-duration: var(--fw-overlay-duration, 200ms);
  --_tone: var(--_info);
  display: block; pointer-events: auto;
  width: var(--fw-toast-width, 22rem); max-width: 100%;
  opacity: 1; transform: none;
  transition: opacity var(--_toast-duration) ease, transform var(--_toast-duration) ease;
}
:host([tone="success"]) { --_tone: var(--_success); }
:host([tone="warning"]) { --_tone: var(--_warning); }
:host([tone="danger"]) { --_tone: var(--_danger); }
@starting-style { :host { opacity: 0; transform: translateY(0.5rem); } }
:host([dismissing]) { opacity: 0; transform: translateY(0.5rem); }

.base {
  position: relative; overflow: hidden;
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding-block: 0.875rem; padding-inline: 1.125rem 0.875rem;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border);
  /* Capped so a pill-shaped theme still gets a card, not a lozenge. */
  border-radius: min(var(--_radius), 1rem); box-shadow: var(--_shadow);
  font-family: var(--_font); font-size: var(--_font-size); line-height: 1.45;
}
/* The tone bar: straight, clipped by the card's rounded corners. */
.base::before {
  content: ""; position: absolute; inset-block: 0; inset-inline-start: 0;
  width: 3px; background: var(--_tone);
}
.icon {
  flex: none; display: inline-flex; align-items: center;
  height: 1.45em; color: var(--_tone);
}
.content { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.heading { font-weight: 600; margin-bottom: 0.125rem; }
.heading:not([hidden]) + .message { color: color-mix(in srgb, var(--_text) 80%, var(--_muted)); }
.action { flex: none; display: flex; align-items: center; gap: 0.25rem; min-height: 1.45em; }
::slotted(button[slot="action"]) {
  font: inherit; font-size: 0.8125rem; font-weight: 500; line-height: 1.25;
  padding: 0.3125rem 0.625rem; margin-block: -0.25rem; cursor: pointer;
  border: 1px solid var(--_border); border-radius: min(var(--_radius-sm), 0.75rem);
  background: var(--_surface); color: var(--_text);
  transition: background-color var(--_duration);
}
::slotted(button[slot="action"]:hover) { background: var(--_surface-2); }
::slotted(button[slot="action"]:focus-visible) { outline: none; box-shadow: var(--_ring); }
.close {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 1.75rem; height: 1.75rem; margin-block: -0.25rem; margin-inline: 0 -0.375rem; padding: 0;
  border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: var(--_muted); cursor: pointer;
  transition: background-color var(--_duration), color var(--_duration);
}
.close:hover { background: var(--_surface-2); color: var(--_text); }
.close:focus-visible { outline: none; box-shadow: var(--_ring); }
`;

/**
 * `<fw-toast>` — a short, self-dismissing notification.
 *
 * ```html
 * <fw-toast-region placement="bottom-end">
 *   <fw-toast tone="success" heading="Payment recorded" duration="4000">
 *     Sara's membership is active until 12 March.
 *     <button slot="action">Undo</button>
 *   </fw-toast>
 * </fw-toast-region>
 * ```
 *
 * Usually created with `showToast()` rather than by hand. Lives inside a
 * `<fw-toast-region>`, which is the polite live region that announces it;
 * `tone="danger"` toasts take `role="alert"` and interrupt.
 *
 * Disappears after `duration` ms (default 5000; `0` stays until
 * dismissed). The countdown pauses while the pointer is over the toast or
 * focus is inside it, and resumes with the time that was left — someone
 * reading it, or reaching for its action, does not have it vanish under
 * them. Removing it, however that happens, cancels the countdown.
 *
 * Props: `tone` — `info` | `success` | `warning` | `danger` (reflected),
 * `heading`, `duration`, `dismissible` (default true; `dismissible="false"`
 * in HTML).
 *
 * Slots: default (message), `action`.
 *
 * Events: `fw-dismiss` (`detail: { reason: "timeout" | "close-button" |
 * "method" }`), fired as it starts leaving.
 *
 * Methods: `dismiss()` — play the exit, then remove it.
 *
 * Parts: `base`, `icon`, `content`, `heading`, `message`, `action`,
 * `close-button`.
 */
export class FwToast extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    tone: { type: "string", reflect: true, default: "info" },
    heading: { type: "string" },
    duration: { type: "number", default: 5000 },
    dismissible: { type: "json", default: true },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open" };

  declare tone: ToastTone;
  declare heading: string | null;
  declare duration: number;
  declare dismissible: boolean;

  #icon!: HTMLElement;
  #heading!: HTMLElement;
  #action!: HTMLElement;
  #close!: HTMLButtonElement;
  readonly #slots = signal(0);

  #timer: ReturnType<typeof setTimeout> | undefined;
  #exitTimer: ReturnType<typeof setTimeout> | undefined;
  /** A countdown is running or paused (duration > 0, not yet fired). */
  #armed = false;
  #remaining = 0;
  #startedAt = 0;
  #hovered = false;
  #focused = false;
  #dismissing = false;
  /** The duration the countdown was started with. */
  #duration: number | undefined;
  /** Taken out of the page mid-countdown; resumes with what was left. */
  #suspended = false;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    this.#icon = document.createElement("span");
    this.#icon.className = "icon";
    this.#icon.setAttribute("part", "icon");
    this.#icon.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "content";
    content.setAttribute("part", "content");
    this.#heading = document.createElement("div");
    this.#heading.className = "heading";
    this.#heading.setAttribute("part", "heading");
    const message = document.createElement("div");
    message.className = "message";
    message.setAttribute("part", "message");
    message.append(document.createElement("slot"));
    content.append(this.#heading, message);

    this.#action = document.createElement("div");
    this.#action.className = "action";
    this.#action.setAttribute("part", "action");
    const actionSlot = document.createElement("slot");
    actionSlot.name = "action";
    this.#action.append(actionSlot);

    this.#close = document.createElement("button");
    this.#close.type = "button";
    this.#close.className = "close";
    this.#close.setAttribute("part", "close-button");
    this.#close.setAttribute("aria-label", "Dismiss");
    this.#close.innerHTML = CLOSE_ICON;

    base.append(this.#icon, content, this.#action, this.#close);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    // Re-inserted after starting to leave: it is a toast again.
    this.#dismissing = false;
    this.removeAttribute("dismissing");
    this.#hovered = false;
    this.#focused = false;

    scope.bind(() => {
      const tone = this.prop<string | null>("tone").get();
      const known = tone === "success" || tone === "warning" || tone === "danger" ? tone : "info";
      this.#icon.innerHTML = ICONS[known];
      // Danger interrupts; everything else waits for the region's polite
      // announcement.
      if (known === "danger") this.setAttribute("role", "alert");
      else if (this.getAttribute("role") === "alert") this.removeAttribute("role");
    });

    scope.bind(() => {
      this.#slots.get();
      const heading = this.prop<string | null>("heading").get();
      this.#heading.textContent = heading ?? "";
      this.#heading.hidden = !heading;
      this.#action.hidden = !slotHasContent(this.root, "action");
      const dismissible = this.prop<unknown>("dismissible").get();
      this.#close.hidden = dismissible === false || dismissible === "false";
    });

    // A new duration starts the countdown over. Moved to another place in
    // the page with the same duration — a region following a dialog open —
    // it carries on with the time it had left.
    scope.bind(() => {
      const duration = this.prop<number | null>("duration").get() ?? 5000;
      untrack(() => {
        if (this.#suspended && duration === this.#duration) {
          this.#suspended = false;
          this.#armed = true;
          this.#syncPause();
        } else {
          this.#suspended = false;
          this.#duration = duration;
          this.#restart(duration);
        }
      });
    });
    scope.add(() => {
      if (this.#timer !== undefined) {
        this.#remaining = Math.max(0, this.#remaining - (Date.now() - this.#startedAt));
      }
      this.#suspended = this.#armed && !this.#dismissing;
      this.#clearTimer();
      this.#armed = false;
      if (this.#exitTimer !== undefined) {
        clearTimeout(this.#exitTimer);
        this.#exitTimer = undefined;
      }
    });

    const onEnter = () => {
      this.#hovered = true;
      this.#syncPause();
    };
    const onLeave = () => {
      this.#hovered = false;
      this.#syncPause();
    };
    const onFocusIn = () => {
      this.#focused = true;
      this.#syncPause();
    };
    const onFocusOut = (event: FocusEvent) => {
      // Retargeted to the host when focus moves into the shadow root.
      const next = event.relatedTarget;
      if (next instanceof Node && (next === this || this.contains(next))) return;
      this.#focused = false;
      this.#syncPause();
    };
    const onClose = () => this.#dismiss("close-button");
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    this.addEventListener("pointerenter", onEnter);
    this.addEventListener("pointerleave", onLeave);
    this.addEventListener("focusin", onFocusIn);
    this.addEventListener("focusout", onFocusOut);
    this.#close.addEventListener("click", onClose);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      this.removeEventListener("pointerenter", onEnter);
      this.removeEventListener("pointerleave", onLeave);
      this.removeEventListener("focusin", onFocusIn);
      this.removeEventListener("focusout", onFocusOut);
      this.#close.removeEventListener("click", onClose);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Play the exit transition, then remove the toast. */
  dismiss(): void {
    this.#dismiss("method");
  }

  #dismiss(reason: ToastDismissReason): void {
    if (this.#dismissing || !this.isConnected) return;
    this.#dismissing = true;
    this.#clearTimer();
    this.#armed = false;
    this.setAttribute("dismissing", "");
    const detail: ToastDismissDetail = { reason };
    this.emit("fw-dismiss", detail);
    if (!this.isConnected) return;
    const ms = transitionMs(this);
    if (ms > 0) {
      this.#exitTimer = setTimeout(() => {
        this.#exitTimer = undefined;
        this.remove();
      }, ms);
    } else {
      this.remove();
    }
  }

  #restart(duration: number): void {
    this.#clearTimer();
    this.#armed = !this.#dismissing && Number.isFinite(duration) && duration > 0;
    this.#remaining = this.#armed ? duration : 0;
    this.#syncPause();
  }

  #syncPause(): void {
    if (!this.#armed || this.#dismissing) return;
    const paused = this.#hovered || this.#focused;
    if (paused && this.#timer !== undefined) {
      this.#clearTimer();
      this.#remaining = Math.max(0, this.#remaining - (Date.now() - this.#startedAt));
    } else if (!paused && this.#timer === undefined) {
      this.#startedAt = Date.now();
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        this.#dismiss("timeout");
      }, this.#remaining);
    }
  }

  #clearTimer(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }
}
