import type { OverlaySide } from "@formwright/overlay-schema";

/**
 * Drag-to-dismiss, and snap points for sheets.
 *
 * The behaviour worth getting right is the interaction with scrolling.
 * A bottom sheet usually contains a scrollable list, and the naive
 * implementation makes it undraggable (every gesture scrolls) or the
 * list unscrollable (every gesture drags). The rule that feels correct
 * on a phone: a downward gesture drags the sheet only while its content
 * is already scrolled to the top; otherwise the content scrolls, and the
 * sheet takes over once the content can go no further.
 *
 * Pointer events throughout — one code path for touch, mouse and pen,
 * with capture so a fast drag that leaves the element still tracks.
 */

/** Past the fully-open edge the sheet still moves, but grudgingly, so
 *  the gesture feels attached to something rather than dead. */
const RUBBER_BAND = 0.35;
/** px/ms past which a flick dismisses regardless of distance travelled. */
const FLICK_VELOCITY = 0.5;
/** Fraction of the panel that must be dragged away to dismiss on release. */
const DISMISS_FRACTION = 0.45;

export interface DragOptions {
  panel: HTMLElement;
  side: OverlaySide;
  /** Ascending fractions of the viewport a sheet may rest at. Empty for
   *  a plain drawer, which only has "open" and "dismissed". */
  snapPoints: readonly number[];
  /** Current index into snapPoints. */
  snap: number;
  /** Restricts the gesture to a handle. Without one the whole panel
   *  drags, which fights any scrollable content inside it. */
  handle?: HTMLElement | null;
  onSnap(index: number): void;
  onDismiss(): void;
}

interface Axis {
  /** Which pointer coordinate moves the panel. */
  coord: "clientX" | "clientY";
  /** +1 when dragging towards larger coordinates dismisses. */
  sign: 1 | -1;
  size(panel: HTMLElement): number;
  transform(offset: number): string;
}

const AXES: Record<OverlaySide, Axis> = {
  bottom: {
    coord: "clientY",
    sign: 1,
    size: (p) => p.offsetHeight,
    transform: (o) => `translate3d(0, ${o}px, 0)`,
  },
  top: {
    coord: "clientY",
    sign: -1,
    size: (p) => p.offsetHeight,
    transform: (o) => `translate3d(0, ${-o}px, 0)`,
  },
  right: {
    coord: "clientX",
    sign: 1,
    size: (p) => p.offsetWidth,
    transform: (o) => `translate3d(${o}px, 0, 0)`,
  },
  left: {
    coord: "clientX",
    sign: -1,
    size: (p) => p.offsetWidth,
    transform: (o) => `translate3d(${-o}px, 0, 0)`,
  },
};

/** The nearest scrollable ancestor inside the panel, which decides
 *  whether a gesture belongs to the content or to the sheet. */
function scrollableUnder(panel: HTMLElement, target: EventTarget | null): HTMLElement | null {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== panel.parentElement) {
    const style = getComputedStyle(node);
    const scrolls = /auto|scroll|overlay/.test(style.overflowY + style.overflowX);
    if (scrolls && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

export function enableDrag(options: DragOptions): () => void {
  const { panel, side, snapPoints } = options;
  const axis = AXES[side];
  const grip = options.handle ?? panel;

  let pointerId: number | null = null;
  let startCoord = 0;
  let startTime = 0;
  let lastCoord = 0;
  let lastTime = 0;
  let dragging = false;
  let scroller: HTMLElement | null = null;

  const setOffset = (offset: number) => {
    panel.style.transform = axis.transform(offset);
  };

  const clearOffset = () => {
    panel.style.transform = "";
    panel.style.transition = "";
  };

  const onPointerDown = (event: PointerEvent) => {
    if (pointerId !== null || event.button !== 0) return;
    // A gesture starting inside scrolled content belongs to the content.
    scroller = options.handle ? null : scrollableUnder(panel, event.target);
    pointerId = event.pointerId;
    startCoord = lastCoord = event[axis.coord];
    startTime = lastTime = event.timeStamp;
    dragging = false;
    panel.style.transition = "none";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const delta = (event[axis.coord] - startCoord) * axis.sign;
    lastCoord = event[axis.coord];
    lastTime = event.timeStamp;

    if (!dragging) {
      // Hand the gesture to the content until it can go no further.
      if (scroller && scroller.scrollTop > 0) return;
      if (Math.abs(delta) < 4) return;
      // Dragging back into the page is the content's business, not ours.
      if (delta < 0 && scroller) return;
      dragging = true;
      grip.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    setOffset(delta >= 0 ? delta : delta * RUBBER_BAND);
  };

  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const wasDragging = dragging;
    pointerId = null;
    dragging = false;
    scroller = null;
    if (grip.hasPointerCapture(event.pointerId)) {
      grip.releasePointerCapture(event.pointerId);
    }
    panel.style.transition = "";
    if (!wasDragging) {
      clearOffset();
      return;
    }

    const travelled = (event[axis.coord] - startCoord) * axis.sign;
    const elapsed = Math.max(1, (event.timeStamp || lastTime) - startTime);
    const velocity = ((event[axis.coord] - lastCoord) * axis.sign || travelled) / elapsed;
    const extent = axis.size(panel) || 1;

    if (snapPoints.length > 1) {
      // Where the sheet would come to rest, as a fraction of the
      // viewport, then the nearest declared stop.
      const viewport = axis.coord === "clientY" ? window.innerHeight : window.innerWidth;
      const current = snapPoints[options.snap] ?? snapPoints[snapPoints.length - 1]!;
      const projected = current - (travelled + velocity * 120) / viewport;
      if (projected < snapPoints[0]! * DISMISS_FRACTION) {
        options.onDismiss();
        return;
      }
      let nearest = 0;
      for (let i = 1; i < snapPoints.length; i += 1) {
        if (Math.abs(snapPoints[i]! - projected) < Math.abs(snapPoints[nearest]! - projected)) {
          nearest = i;
        }
      }
      clearOffset();
      options.onSnap(nearest);
      return;
    }

    if (velocity > FLICK_VELOCITY || travelled > extent * DISMISS_FRACTION) {
      options.onDismiss();
      return;
    }
    clearOffset();
  };

  grip.addEventListener("pointerdown", onPointerDown);
  grip.addEventListener("pointermove", onPointerMove);
  grip.addEventListener("pointerup", finish);
  grip.addEventListener("pointercancel", finish);

  return () => {
    grip.removeEventListener("pointerdown", onPointerDown);
    grip.removeEventListener("pointermove", onPointerMove);
    grip.removeEventListener("pointerup", finish);
    grip.removeEventListener("pointercancel", finish);
    clearOffset();
  };
}
