import { Scope } from "./dom.js";
import { observeResize } from "./resize.js";

/**
 * Place a floating element against the element it belongs to.
 *
 * Ten components on the plan are blocked on this one behaviour — popover,
 * tooltip, dropdown menu, context menu, select, combobox, autocomplete,
 * date picker, mega menu, colour picker. Written once here, each of them
 * gets flipping at the viewport edge, clamping, RTL and live updates for
 * free, and a fix lands in all ten.
 *
 * Two layers. `computePosition` is pure arithmetic over rectangles, so it
 * can be tested exhaustively without a layout engine. `anchorTo` reads the
 * DOM, writes the result, and keeps it current as things scroll and resize.
 */

export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";
export type Placement = Side | `${Side}-start` | `${Side}-end`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PositionOptions {
  /** Preferred side and alignment. Default `bottom-start`. */
  placement?: Placement;
  /** Gap between the anchor and the floating element, in px. Default 4. */
  offset?: number;
  /** Closest the floating element may come to the viewport edge. Default 8. */
  padding?: number;
  /** Move to the opposite side when that side has more room. Default true. */
  flip?: boolean;
  /** Slide along the anchor to stay inside the viewport. Default true. */
  shift?: boolean;
  /**
   * Text direction. `start` and `end` alignment follow it, so a menu
   * under a button in an Arabic or Urdu page lines up with the button's
   * right edge. Physical sides — top, right, bottom, left — do not flip.
   */
  dir?: "ltr" | "rtl";
}

export interface Position {
  x: number;
  y: number;
  /** Where it actually went, after any flip. */
  placement: Placement;
  /** Room on the chosen side — size a scrolling list to this. */
  available: Size;
  /**
   * The anchor's centre along the cross axis, measured from the floating
   * element's own edge and kept inside it. Where a tooltip's arrow points.
   */
  arrow: number;
}

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function clamp(value: number, min: number, max: number): number {
  // When the element is wider than the room, max < min: pin to min so it
  // at least starts on screen rather than being pushed off the far edge.
  return max < min ? min : Math.min(Math.max(value, min), max);
}

function parse(placement: Placement): [Side, Align] {
  const [side, align] = placement.split("-") as [Side, Align | undefined];
  return [side, align ?? "center"];
}

function isVertical(side: Side): boolean {
  return side === "top" || side === "bottom";
}

export function computePosition(
  anchor: Rect,
  floating: Size,
  viewport: Size,
  options: PositionOptions = {},
): Position {
  const offset = options.offset ?? 4;
  const padding = options.padding ?? 8;
  const rtl = options.dir === "rtl";
  let [side, align] = parse(options.placement ?? "bottom-start");

  const space: Record<Side, number> = {
    top: anchor.y - offset - padding,
    bottom: viewport.height - (anchor.y + anchor.height) - offset - padding,
    left: anchor.x - offset - padding,
    right: viewport.width - (anchor.x + anchor.width) - offset - padding,
  };

  if (options.flip !== false) {
    const needed = isVertical(side) ? floating.height : floating.width;
    const other = OPPOSITE[side];
    // Only when it does not fit AND the other side is roomier — if neither
    // fits, staying put beats bouncing to a side that is just as cramped.
    if (space[side] < needed && space[other] > space[side]) side = other;
  }

  let x: number;
  let y: number;

  if (isVertical(side)) {
    y = side === "bottom" ? anchor.y + anchor.height + offset : anchor.y - floating.height - offset;
    const alignStart = rtl ? align === "end" : align === "start";
    const alignEnd = rtl ? align === "start" : align === "end";
    x = alignStart
      ? anchor.x
      : alignEnd
        ? anchor.x + anchor.width - floating.width
        : anchor.x + (anchor.width - floating.width) / 2;
    if (options.shift !== false) {
      x = clamp(x, padding, viewport.width - floating.width - padding);
    }
  } else {
    x = side === "right" ? anchor.x + anchor.width + offset : anchor.x - floating.width - offset;
    y =
      align === "start"
        ? anchor.y
        : align === "end"
          ? anchor.y + anchor.height - floating.height
          : anchor.y + (anchor.height - floating.height) / 2;
    if (options.shift !== false) {
      y = clamp(y, padding, viewport.height - floating.height - padding);
    }
  }

  const vertical = isVertical(side);
  return {
    x,
    y,
    placement: align === "center" ? side : `${side}-${align}`,
    available: vertical
      ? { width: Math.max(0, viewport.width - padding * 2), height: Math.max(0, space[side]) }
      : { width: Math.max(0, space[side]), height: Math.max(0, viewport.height - padding * 2) },
    arrow: vertical
      ? clamp(anchor.x + anchor.width / 2 - x, 0, floating.width)
      : clamp(anchor.y + anchor.height / 2 - y, 0, floating.height),
  };
}

export interface AnchorOptions extends PositionOptions {
  /**
   * Make the floating element at least as wide as its anchor — what a
   * select's list or a combobox's suggestions want.
   */
  sameWidth?: boolean;
  /** Told the result after every placement. */
  onPosition?: (position: Position) => void;
}

export interface Anchored {
  /** Recompute now, for a change nothing else would notice. */
  update(): void;
  /** Stop tracking. Removes every listener and observer it added. */
  dispose(): void;
}

/**
 * Pin `floating` to `anchor` and keep it there.
 *
 * Positioned `fixed` in viewport coordinates, which escapes any
 * `overflow: hidden` ancestor — the usual reason a dropdown gets clipped
 * inside a table cell or a card.
 *
 * Writes `left`/`top` rather than `transform`, so an enter animation that
 * uses `transform` does not fight it. Exposes the result to CSS too:
 * `data-placement` for choosing an animation direction, and
 * `--fw-available-width`, `--fw-available-height` and `--fw-arrow` custom
 * properties for sizing a list and pointing an arrow.
 *
 * Re-places on any scroll (captured, so a scrolling container counts, not
 * just the window), on viewport resize, and when either element changes
 * size — batched to one placement per frame.
 */
export function anchorTo(
  anchor: Element,
  floating: HTMLElement,
  options: AnchorOptions = {},
): Anchored {
  const scope = new Scope();
  const style = floating.style;
  style.position = "fixed";
  style.top = "0px";
  style.left = "0px";

  let frame = 0;

  const update = () => {
    const a = anchor.getBoundingClientRect();
    if (options.sameWidth) style.minWidth = `${a.width}px`;
    // Measured after min-width is applied, or the first placement would
    // use the narrower size and be off by the difference.
    const f = floating.getBoundingClientRect();
    const root = document.documentElement;
    const dir = options.dir ?? (getComputedStyle(anchor).direction === "rtl" ? "rtl" : "ltr");

    const position = computePosition(
      { x: a.left, y: a.top, width: a.width, height: a.height },
      { width: f.width, height: f.height },
      {
        // clientWidth leaves out the scrollbar; a layout-less environment
        // reports 0, where the window size is the only answer available.
        width: root.clientWidth || window.innerWidth,
        height: root.clientHeight || window.innerHeight,
      },
      { ...options, dir },
    );

    style.left = `${Math.round(position.x)}px`;
    style.top = `${Math.round(position.y)}px`;
    floating.dataset.placement = position.placement;
    style.setProperty("--fw-available-width", `${Math.floor(position.available.width)}px`);
    style.setProperty("--fw-available-height", `${Math.floor(position.available.height)}px`);
    style.setProperty("--fw-arrow", `${Math.round(position.arrow)}px`);
    options.onPosition?.(position);
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  // Scroll does not bubble, so a container scrolling under the anchor is
  // only seen by a capturing listener on the window.
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  scope.add(() => window.removeEventListener("scroll", schedule, { capture: true }));
  window.addEventListener("resize", schedule, { passive: true });
  scope.add(() => window.removeEventListener("resize", schedule));
  scope.add(observeResize(anchor, schedule));
  scope.add(observeResize(floating, schedule));
  scope.add(() => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });

  // Synchronously, so the first paint is already in place rather than
  // flashing at the top-left corner for a frame.
  update();

  return { update, dispose: () => scope.dispose() };
}
