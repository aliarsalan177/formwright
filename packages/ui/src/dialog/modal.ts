import { signal, untrack } from "@formwright/reactive";
import {
  focusableWithin,
  lockScroll,
  trapFocus,
  unlockScroll,
  type FocusTrap,
  type Scope,
} from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";

/** What asked a modal to close. */
export type CloseSource = "escape" | "backdrop" | "close-button" | "method";

/** `detail` of `fw-request-close`. */
export interface RequestCloseDetail {
  source: CloseSource;
}

const CLOSE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

/**
 * Checked on every open rather than once at import, so a polyfill loaded
 * after this module still counts, and so a test can take it away.
 */
function supportsModal(): boolean {
  return typeof HTMLDialogElement !== "undefined" && "showModal" in HTMLDialogElement.prototype;
}

function parseTimes(value: string): number[] {
  if (!value) return [];
  return value.split(",").map((part) => {
    const text = part.trim();
    const n = parseFloat(text);
    if (Number.isNaN(n)) return 0;
    return text.endsWith("ms") ? n : n * 1000;
  });
}

/**
 * The longest transition on any of `elements`, in ms.
 *
 * Read from computed style rather than hard-coded, so a theme that slows
 * the animation down does not have it cut off, and reduced motion — which
 * zeroes every duration in the base styles — finishes synchronously with no
 * timer at all.
 */
export function transitionMs(...elements: Element[]): number {
  let longest = 0;
  for (const el of elements) {
    const style = getComputedStyle(el);
    const durations = parseTimes(style.transitionDuration);
    const delays = parseTimes(style.transitionDelay);
    durations.forEach((duration, i) => {
      const delay = delays.length > 0 ? (delays[i % delays.length] ?? 0) : 0;
      longest = Math.max(longest, duration + delay);
    });
  }
  return longest;
}

/** Rules both `<fw-dialog>` and `<fw-drawer>` are built from. */
export const modalStyles = /* css */ `
:host {
  display: contents;
  --_overlay-duration: var(--fw-overlay-duration, 200ms);
}

.dialog {
  position: fixed; inset: 0; z-index: var(--fw-overlay-z, 1000);
  box-sizing: border-box;
  width: 100%; height: 100%; max-width: none; max-height: none;
  margin: 0; padding: 1rem; border: 0;
  background: var(--fw-backdrop, rgb(0 0 0 / 0.5));
  color: var(--_text); font-family: var(--_font);
  overflow: hidden; overscroll-behavior: contain;
  opacity: 1;
  transition: opacity var(--_overlay-duration) ease;
}
/* The UA hides a closed <dialog> with display:none; only lay it out open. */
.dialog[open] { display: flex; align-items: center; justify-content: center; }
.dialog::backdrop { background: transparent; }
.dialog[data-closing] { opacity: 0; }
@starting-style { .dialog[open] { opacity: 0; } }

.panel {
  position: relative; display: flex; flex-direction: column;
  width: 100%; max-height: 100%; min-height: 0;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
  outline: none;
  transition: transform var(--_overlay-duration) ease;
}
.panel:focus-visible { box-shadow: var(--_shadow), var(--_ring); }

.header {
  flex: none; display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 1rem 1.25rem 0.75rem;
}
.title {
  flex: 1; min-width: 0; margin: 0;
  font-size: 1rem; font-weight: 600; line-height: 1.5;
}
.header-actions { display: flex; align-items: center; gap: 0.25rem; }
.close {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; margin: -0.25rem -0.5rem -0.25rem 0; padding: 0;
  border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: var(--_muted); cursor: pointer;
  transition: background-color var(--_duration), color var(--_duration);
}
.close:hover { background: var(--_surface-2); color: var(--_text); }
.close:focus-visible { outline: none; box-shadow: var(--_ring); }

/* The body scrolls; header and footer stay pinned. */
.body {
  flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 0.25rem 1.25rem 1.25rem;
  font-size: 0.875rem; line-height: 1.5;
}
:host([no-header]) .body { padding-top: 1.25rem; }
.footer {
  flex: none; display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1.25rem; border-top: 1px solid var(--_border);
}
`;

/**
 * The shared engine behind `<fw-dialog>` and `<fw-drawer>`.
 *
 * Built on a native `<dialog>` opened with `showModal()`: the top layer,
 * an inert page behind it and focus containment all come from the browser.
 * Where `showModal` is missing it falls back to an `open` attribute and
 * `trapFocus`. Either way:
 *
 * - Escape, the backdrop and the close button all go through one
 *   cancelable `fw-request-close`, so an unsaved form can say no.
 * - Page scroll is locked exactly once per open and released exactly once,
 *   including when the element is removed while open.
 * - Focus moves in on open and goes back where it came from on close.
 * - A backdrop press dismisses only when it both starts and ends outside
 *   the panel, so a text selection dragged past the edge does not.
 *
 * Not registered; not exported from the package entry.
 */
export abstract class FwModal extends FwElement {
  static override props: PropMap = {
    ...FwElement.props,
    open: { type: "boolean", reflect: true },
    heading: { type: "string" },
    // JSON so that `dismissible="false"` works from HTML: a boolean
    // attribute that defaults to true could never be switched off in markup.
    dismissible: { type: "json", default: true },
    noHeader: { type: "boolean", reflect: true },
  };

  declare open: boolean;
  declare heading: string | null;
  declare dismissible: boolean;
  declare noHeader: boolean;

  /** The native `<dialog>`. */
  protected dialog!: HTMLDialogElement;
  /** The visible box inside it. Presses outside this are backdrop presses. */
  protected panel!: HTMLElement;

  #header!: HTMLElement;
  #title!: HTMLElement;
  #headingText!: HTMLSpanElement;
  #headerActions!: HTMLElement;
  #closeButton!: HTMLButtonElement;
  #footer!: HTMLElement;

  #phase: "closed" | "open" | "closing" = "closed";
  #native = false;
  #trap: FocusTrap | null = null;
  #addedTabIndex = false;
  #locked = false;
  #previousFocus: HTMLElement | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #syncing = false;
  #resync = false;
  #pressedOutside = false;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId(this.localName);

    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.setAttribute("part", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("part", "panel");
    panel.tabIndex = -1;

    const header = document.createElement("header");
    header.className = "header";
    header.setAttribute("part", "header");

    // The header slot sits inside the heading, so slotted content still
    // names the dialog through aria-labelledby.
    const title = document.createElement("h2");
    title.id = `${id}-title`;
    title.className = "title";
    title.setAttribute("part", "title");
    const headerSlot = document.createElement("slot");
    headerSlot.name = "header";
    this.#headingText = document.createElement("span");
    headerSlot.append(this.#headingText);
    title.append(headerSlot);

    const actions = document.createElement("div");
    actions.className = "header-actions";
    actions.setAttribute("part", "header-actions");
    const actionsSlot = document.createElement("slot");
    actionsSlot.name = "header-actions";
    actions.append(actionsSlot);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("part", "close-button");
    close.setAttribute("aria-label", "Close");
    close.innerHTML = CLOSE_ICON;

    header.append(title, actions, close);

    const body = document.createElement("div");
    body.className = "body";
    body.setAttribute("part", "body");
    body.append(document.createElement("slot"));

    const footer = document.createElement("footer");
    footer.className = "footer";
    footer.setAttribute("part", "footer");
    const footerSlot = document.createElement("slot");
    footerSlot.name = "footer";
    footer.append(footerSlot);

    panel.append(header, body, footer);
    dialog.append(panel);
    root.append(dialog);

    this.dialog = dialog;
    this.panel = panel;
    this.#header = header;
    this.#title = title;
    this.#headerActions = actions;
    this.#closeButton = close;
    this.#footer = footer;
  }

  protected override connected(scope: Scope): void {
    const dialog = this.dialog;

    // Chrome. Runs before the open binding, so the first focus decision
    // sees the right things hidden.
    scope.bind(() => {
      this.#slots.get();
      const heading = this.prop<string | null>("heading").get();
      const dismissible = this.#isDismissible(true);
      this.#headingText.textContent = heading ?? "";
      const labelled = Boolean(heading) || slotHasContent(this.root, "header");
      if (labelled) {
        dialog.setAttribute("aria-labelledby", this.#title.id);
        dialog.removeAttribute("aria-label");
      } else {
        dialog.removeAttribute("aria-labelledby");
        const label = this.getAttribute("aria-label");
        if (label) dialog.setAttribute("aria-label", label);
      }
      this.#title.toggleAttribute("aria-hidden", !labelled);
      this.#header.hidden = this.prop<boolean>("noHeader").get();
      this.#headerActions.hidden = !slotHasContent(this.root, "header-actions");
      this.#closeButton.hidden = !dismissible;
      this.#footer.hidden = !slotHasContent(this.root, "footer");
      // Without a way to dismiss it, it is an alert dialog: the user has to
      // answer it.
      if (dismissible) dialog.removeAttribute("role");
      else dialog.setAttribute("role", "alertdialog");
    });

    // `open` → the dialog. The work is done untracked, so an event listener
    // that reads a signal does not subscribe this binding to it.
    scope.bind(() => {
      this.prop<boolean>("open").get();
      untrack(() => this.#sync());
    });
    // Removed while open: give back the lock, the trap and focus, cancel any
    // pending transition — and announce nothing, since nothing was closed.
    scope.add(() => this.#finishHide(false));

    // Escape on a native modal arrives as `cancel`. Always prevented, so the
    // browser never closes it behind our back; whether it closes is decided
    // by the same cancelable request as every other path.
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (this.#phase === "open") this.#dismiss("escape");
    };

    // A browser may still force a native modal shut (Chrome does on a
    // repeated Escape with no user activation in between). Follow it.
    const onClose = () => {
      if (!this.#native || this.#phase !== "open" || dialog.open) return;
      this.#native = false;
      this.open = false;
    };

    // Without showModal there is no `cancel`, so Escape is handled here.
    // Prevented either way, so a dialog stacked under this one does not also
    // take it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (this.#native || this.#phase !== "open") return;
      event.preventDefault();
      this.#dismiss("escape");
    };

    const outside = (event: Event) => !event.composedPath().includes(this.panel);
    const onPointerDown = (event: MouseEvent) => {
      this.#pressedOutside = this.#phase === "open" && event.button === 0 && outside(event);
    };
    const onPointerUp = (event: MouseEvent) => {
      const pressedOutside = this.#pressedOutside;
      this.#pressedOutside = false;
      if (pressedOutside && outside(event)) this.#dismiss("backdrop");
    };

    const onCloseClick = () => {
      if (this.#isDismissible()) this.#requestClose("close-button");
    };
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);
    dialog.addEventListener("keydown", onKeyDown);
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    this.#closeButton.addEventListener("click", onCloseClick);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("keydown", onKeyDown);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
      this.#closeButton.removeEventListener("click", onCloseClick);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Open it. */
  show(): void {
    this.open = true;
  }

  /**
   * Ask it to close. Goes through `fw-request-close` with source `"method"`,
   * so a listener can still refuse; set `open = false` to close
   * unconditionally.
   */
  hide(): void {
    if (!this.prop<boolean>("open").peek()) return;
    if (this.#phase !== "open") {
      this.open = false;
      return;
    }
    this.#requestClose("method");
  }

  #isDismissible(track = false): boolean {
    const s = this.prop<unknown>("dismissible");
    const value = track ? s.get() : s.peek();
    return value !== false && value !== "false";
  }

  /** Escape and backdrop: only when dismissible. */
  #dismiss(source: CloseSource): void {
    if (this.#isDismissible()) this.#requestClose(source);
  }

  #requestClose(source: CloseSource): void {
    if (this.#phase !== "open") return;
    const detail: RequestCloseDetail = { source };
    if (this.emit("fw-request-close", detail, { cancelable: true })) this.open = false;
  }

  /**
   * Bring the dialog in line with `open`.
   *
   * Re-entrant by design: a `fw-show` listener that closes the dialog again
   * sets `open` while we are still inside this call, so the change is noted
   * and handled on the next turn of the loop instead of recursing.
   */
  #sync(): void {
    if (this.#syncing) {
      this.#resync = true;
      return;
    }
    this.#syncing = true;
    try {
      do {
        this.#resync = false;
        const want = this.prop<boolean>("open").peek();
        if (want && this.#phase !== "open") {
          if (this.#phase === "closing") this.#finishHide();
          this.#beginShow();
        } else if (!want && this.#phase === "open") {
          this.#beginHide();
        }
      } while (this.#resync);
    } finally {
      this.#syncing = false;
    }
  }

  #beginShow(): void {
    if (!this.isConnected) return;
    this.#clearTimer();
    const active = document.activeElement;
    this.#previousFocus = active instanceof HTMLElement && active !== document.body ? active : null;

    const dialog = this.dialog;
    dialog.removeAttribute("data-closing");
    this.#phase = "open";

    this.#native = false;
    if (supportsModal()) {
      try {
        if (!dialog.open) dialog.showModal();
        this.#native = true;
      } catch {
        // Already open non-modally, or not in a document: fall back.
      }
    }
    if (!this.#native) {
      dialog.setAttribute("open", "");
      // Trapped on the host, not the panel: slotted content lives in the
      // light DOM, where a trap on the shadow panel could not see it. The
      // host also sits in the page, so its siblings are what gets inerted.
      this.#addedTabIndex = !this.hasAttribute("tabindex");
      this.#trap = trapFocus(this);
    }

    if (!this.#locked) {
      lockScroll();
      this.#locked = true;
    }

    this.#focusInitial();

    const ms = transitionMs(dialog, this.panel);
    if (ms > 0) {
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        if (this.#phase === "open") this.emit("fw-after-show");
      }, ms);
    }
    this.emit("fw-show");
    if (ms <= 0 && this.#phase === "open") this.emit("fw-after-show");
  }

  #beginHide(): void {
    this.#clearTimer();
    this.#phase = "closing";
    this.#pressedOutside = false;
    this.dialog.setAttribute("data-closing", "");
    const ms = transitionMs(this.dialog, this.panel);
    if (ms > 0) {
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        this.#finishHide();
      }, ms);
    }
    this.emit("fw-hide");
    if (ms <= 0 && this.#phase === "closing") this.#finishHide();
  }

  /** Close for real: the dialog, the trap, the lock, then focus. */
  #finishHide(announce = true): void {
    this.#clearTimer();
    if (this.#phase === "closed") return;
    this.#phase = "closed";
    this.#pressedOutside = false;

    const dialog = this.dialog;
    dialog.removeAttribute("data-closing");
    if (this.#native) {
      this.#native = false;
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    if (this.#trap) {
      this.#trap.release();
      this.#trap = null;
      if (this.#addedTabIndex) this.removeAttribute("tabindex");
      this.#addedTabIndex = false;
    }
    if (this.#locked) {
      this.#locked = false;
      unlockScroll();
    }

    // Only take focus back if it is still ours to give — inside the dialog,
    // or dropped to <body> because what held it was removed. Someone who
    // clicked elsewhere as it closed is left where they are.
    const previous = this.#previousFocus;
    this.#previousFocus = null;
    if (previous?.isConnected) {
      const active = document.activeElement;
      if (!active || active === document.body || active === this || this.contains(active)) {
        previous.focus({ preventScroll: true });
      }
    }

    if (announce) this.emit("fw-after-hide");
  }

  #clearTimer(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  /**
   * `[autofocus]`, then the first focusable thing in reading order — header
   * content, the close button, the body, the footer — then the panel.
   */
  #focusInitial(): void {
    const auto = this.querySelector<HTMLElement>("[autofocus]");
    const target = auto ?? this.#firstFocusable() ?? this.panel;
    target.focus({ preventScroll: true });
  }

  #firstFocusable(): HTMLElement | null {
    const native = new Set(focusableWithin(this));
    const buckets = new Map<string, HTMLElement>();
    for (const el of this.querySelectorAll<HTMLElement>("*")) {
      const focusHost =
        (el.shadowRoot as (ShadowRoot & { delegatesFocus?: boolean }) | null)?.delegatesFocus ===
          true && !el.hasAttribute("disabled");
      if (!native.has(el) && !focusHost) continue;
      let top: Element = el;
      while (top.parentElement && top.parentElement !== this) top = top.parentElement;
      const slot = top.getAttribute("slot") ?? "";
      if (!buckets.has(slot)) buckets.set(slot, el);
    }
    const headerShown = !this.#header.hidden;
    const order: Array<HTMLElement | undefined> = [
      headerShown ? buckets.get("header") : undefined,
      headerShown ? buckets.get("header-actions") : undefined,
      headerShown && !this.#closeButton.hidden ? this.#closeButton : undefined,
      buckets.get(""),
      buckets.get("footer"),
    ];
    return order.find((el): el is HTMLElement => el !== undefined) ?? null;
  }
}
