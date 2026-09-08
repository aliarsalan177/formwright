/**
 * Keep the keyboard inside the top overlay, and hand it back afterwards.
 *
 * Three jobs, and skipping any one of them makes a dialog unusable for
 * someone on a keyboard or a screen reader:
 *
 *  1. Move focus in when it opens — to the first focusable control, or
 *     the panel itself when there is nothing to focus.
 *  2. Keep Tab and Shift+Tab cycling within the panel.
 *  3. Return focus to whatever opened it, so the user is not dumped at
 *     the top of the document.
 *
 * Everything outside the panel is marked `inert` while it is trapped,
 * which is what actually hides it from a screen reader's virtual
 * cursor — a focus trap alone still lets the reader walk the page
 * behind the dialog. `inert` is set on the panel's *siblings* rather
 * than on <body>, so the overlay itself stays reachable.
 */

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

/**
 * Visible enough to receive focus.
 *
 * Computed style rather than geometry. `offsetParent` is null inside any
 * position:fixed ancestor — which every panel here is — and a
 * zero-size box can still be legitimately focusable (a skip link, a
 * control sized by its content before layout). Walking display and
 * visibility up to the panel answers the question the browser actually
 * asks, and does not depend on layout having run.
 */
function isVisible(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node.hidden) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (node === document.body) break;
  }
  return true;
}

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      isVisible(el),
  );
}

export interface FocusTrap {
  /** Re-read the focusable set after the panel's content changes. */
  refresh(): void;
  release(): void;
}

export function trapFocus(panel: HTMLElement): FocusTrap {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Mark every sibling of the panel's container inert. Walking up from
  // the panel means an overlay host mounted mid-document still works.
  const inerted: HTMLElement[] = [];
  // `holder`, not `parent` — the latter shadows window.parent, which
  // makes TypeScript read the initializer as circular.
  for (let node: HTMLElement | null = panel; node; node = node.parentElement) {
    const holder: HTMLElement | null = node.parentElement;
    if (!holder) break;
    for (const child of Array.from(holder.children)) {
      if (child === node || !(child instanceof HTMLElement)) continue;
      if (child.inert) continue; // already inert — leave it alone on release
      child.inert = true;
      inerted.push(child);
    }
    if (holder === document.body) break;
  }

  let focusables = focusableWithin(panel);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    if (focusables.length === 0) {
      // Nothing to tab to: hold focus on the panel rather than letting
      // the browser move it behind the overlay.
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Capture phase: a click that moves focus outside (or a stray
  // programmatic focus()) is pulled straight back.
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (target instanceof Node && panel.contains(target)) return;
    event.stopPropagation();
    (focusables[0] ?? panel).focus();
  };

  panel.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusin", onFocusIn, true);

  if (!panel.hasAttribute("tabindex")) panel.tabIndex = -1;
  // autofocus wins, then the first control, then the panel itself.
  const preferred = panel.querySelector<HTMLElement>("[autofocus]") ?? focusables[0] ?? panel;
  preferred.focus({ preventScroll: true });

  return {
    refresh() {
      focusables = focusableWithin(panel);
    },
    release() {
      panel.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn, true);
      for (const el of inerted) el.inert = false;
      inerted.length = 0;
      // Only take focus back if the overlay still owns it. The user may
      // have clicked elsewhere as it closed, and yanking them back would
      // be worse than leaving them be.
      if (previous?.isConnected && panel.contains(document.activeElement)) {
        previous.focus({ preventScroll: true });
      }
    },
  };
}
