/**
 * Freeze the page behind an overlay, and put it back exactly as it was.
 *
 * `overflow: hidden` on <body> is the usual one-liner and it does not
 * work on iOS Safari: the page keeps rubber-banding, and once the
 * overlay closes the document has silently scrolled somewhere else. The
 * only approach that holds is to take the body out of flow at a
 * negative offset equal to the current scroll, then restore both the
 * styles and the scroll position on release.
 *
 * Reference-counted, because a modal opened from inside a drawer must
 * not release a lock the drawer still needs when it closes. The store
 * already derives `locksScroll` across the whole stack; the counter
 * here guards against two independent hosts on one page.
 */

interface Saved {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  scrollY: number;
}

let depth = 0;
let saved: Saved | null = null;

/** Width of the classic desktop scrollbar, so removing it does not shift
 *  the page sideways under the overlay. Zero for overlay scrollbars. */
function scrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

export function lockScroll(): void {
  depth += 1;
  if (depth > 1) return;

  const body = document.body;
  const style = body.style;
  const gap = scrollbarWidth();
  saved = {
    overflow: style.overflow,
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    paddingRight: style.paddingRight,
    scrollY: window.scrollY,
  };

  style.overflow = "hidden";
  style.position = "fixed";
  style.top = `-${saved.scrollY}px`;
  style.left = "0";
  style.right = "0";
  style.width = "100%";
  if (gap > 0) {
    // Preserve whatever padding the page already had.
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    style.paddingRight = `${current + gap}px`;
  }
}

export function unlockScroll(): void {
  depth = Math.max(0, depth - 1);
  if (depth > 0 || !saved) return;

  const style = document.body.style;
  const { scrollY } = saved;
  style.overflow = saved.overflow;
  style.position = saved.position;
  style.top = saved.top;
  style.left = saved.left;
  style.right = saved.right;
  style.width = saved.width;
  style.paddingRight = saved.paddingRight;
  saved = null;

  // Restoring position also restores flow, which sends the document back
  // to the top — so the scroll has to be put back by hand, and without
  // smooth behaviour or the user watches it fly.
  window.scrollTo({ top: scrollY, left: 0, behavior: "instant" as ScrollBehavior });
}

/** Test seam: drop any lock and forget the saved styles. */
export function resetScrollLock(): void {
  depth = 0;
  saved = null;
}
