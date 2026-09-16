// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorTo, computePosition, type Rect } from "./anchor.js";
import { observeResize, resetResizePool } from "./resize.js";
import { trackLeaks, type LeakTracker } from "./testing.js";

const viewport = { width: 1000, height: 800 };
/** A 100×40 button in the middle of the page. */
const button: Rect = { x: 450, y: 380, width: 100, height: 40 };
const menu = { width: 200, height: 150 };

describe("computePosition", () => {
  it("sits below and left-aligned by default, with the gap", () => {
    const p = computePosition(button, menu, viewport);
    expect(p).toMatchObject({ x: 450, y: 424, placement: "bottom-start" });
  });

  it("aligns end and centre along the anchor", () => {
    expect(computePosition(button, menu, viewport, { placement: "bottom-end" }).x).toBe(350);
    expect(computePosition(button, menu, viewport, { placement: "bottom" }).x).toBe(400);
  });

  it("places on each side", () => {
    expect(computePosition(button, menu, viewport, { placement: "top" })).toMatchObject({
      y: 380 - 150 - 4,
      placement: "top",
    });
    expect(computePosition(button, menu, viewport, { placement: "right-start" })).toMatchObject({
      x: 554,
      y: 380,
    });
    expect(computePosition(button, menu, viewport, { placement: "left-end" })).toMatchObject({
      x: 450 - 200 - 4,
      y: 380 + 40 - 150,
    });
  });

  it("flips to the top when there is no room below", () => {
    const low = { ...button, y: 740 };
    const p = computePosition(low, menu, viewport);
    expect(p.placement).toBe("top-start");
    expect(p.y).toBe(740 - 150 - 4);
  });

  it("stays put when neither side fits, rather than bouncing to an equally cramped one", () => {
    const tall = { width: 200, height: 900 };
    const p = computePosition(button, tall, viewport, { placement: "bottom-start" });
    // Below has slightly more room than above for this anchor.
    expect(p.placement).toBe("bottom-start");
  });

  it("does not flip when told not to", () => {
    const low = { ...button, y: 740 };
    expect(computePosition(low, menu, viewport, { flip: false }).placement).toBe("bottom-start");
  });

  it("slides back inside the viewport instead of running off the edge", () => {
    const nearRight = { ...button, x: 950, width: 40 };
    const p = computePosition(nearRight, menu, viewport);
    expect(p.x).toBe(1000 - 200 - 8);

    const nearLeft = { ...button, x: 0 };
    expect(computePosition(nearLeft, menu, viewport, { placement: "bottom-end" }).x).toBe(8);
  });

  it("pins to the padding when the element is wider than the viewport", () => {
    const wide = { width: 1200, height: 100 };
    expect(computePosition(button, wide, viewport).x).toBe(8);
  });

  it("mirrors start and end in right-to-left text", () => {
    const rtl = computePosition(button, menu, viewport, { dir: "rtl" });
    // Start in RTL is the anchor's right edge.
    expect(rtl.x).toBe(450 + 100 - 200);
    expect(computePosition(button, menu, viewport, { dir: "rtl", placement: "bottom-end" }).x).toBe(
      450,
    );
  });

  it("reports the room on the chosen side, for sizing a list", () => {
    const p = computePosition(button, menu, viewport);
    expect(p.available.height).toBe(800 - 420 - 4 - 8);
    expect(p.available.width).toBe(1000 - 16);
  });

  it("points the arrow at the anchor's centre, kept inside the element", () => {
    expect(computePosition(button, menu, viewport).arrow).toBe(50);
    // Shifted left to stay on screen, so the arrow moves along it to keep
    // pointing at the anchor: centre 970, element starts at 792.
    const nearRight = { ...button, x: 950, width: 40 };
    expect(computePosition(nearRight, menu, viewport).arrow).toBe(178);
    // Anchor scrolled past the edge: the arrow stops at the element's end.
    const offscreen = { ...button, x: 1100, width: 40 };
    expect(computePosition(offscreen, menu, viewport).arrow).toBe(200);
  });
});

function rect(el: Element, r: Rect) {
  el.getBoundingClientRect = () =>
    ({
      x: r.x,
      y: r.y,
      left: r.x,
      top: r.y,
      width: r.width,
      height: r.height,
      right: r.x + r.width,
      bottom: r.y + r.height,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("anchorTo", () => {
  let leaks: LeakTracker | null = null;

  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  afterEach(() => {
    leaks?.restore();
    leaks = null;
    vi.useRealTimers();
  });

  function setup() {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    rect(anchor, button);
    rect(floating, { x: 0, y: 0, ...menu });
    return { anchor, floating };
  }

  it("places the element on the first call, before any frame", () => {
    const { anchor, floating } = setup();
    const anchored = anchorTo(anchor, floating);

    expect(floating.style.position).toBe("fixed");
    expect(floating.style.left).toBe("450px");
    expect(floating.style.top).toBe("424px");
    expect(floating.dataset.placement).toBe("bottom-start");
    expect(floating.style.getPropertyValue("--fw-arrow")).toBe("50px");

    anchored.dispose();
  });

  it("matches the anchor's width when asked", () => {
    const { anchor, floating } = setup();
    const anchored = anchorTo(anchor, floating, { sameWidth: true });
    expect(floating.style.minWidth).toBe("100px");
    anchored.dispose();
  });

  it("follows the anchor when something scrolls", async () => {
    const { anchor, floating } = setup();
    const anchored = anchorTo(anchor, floating);

    rect(anchor, { ...button, y: 100 });
    // Any element's scroll counts — the listener captures on the window.
    document.body.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    expect(floating.style.top).toBe("144px");
    anchored.dispose();
  });

  it("batches a burst of scrolls into one placement", async () => {
    const { anchor, floating } = setup();
    const onPosition = vi.fn();
    const anchored = anchorTo(anchor, floating, { onPosition });
    onPosition.mockClear();

    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    expect(onPosition).toHaveBeenCalledTimes(1);
    anchored.dispose();
  });

  it("reads the text direction from the anchor", () => {
    const { anchor, floating } = setup();
    anchor.style.direction = "rtl";
    const anchored = anchorTo(anchor, floating);
    expect(floating.style.left).toBe(`${450 + 100 - 200}px`);
    anchored.dispose();
  });

  it("leaves nothing behind when disposed", () => {
    leaks = trackLeaks();
    const { anchor, floating } = setup();
    const anchored = anchorTo(anchor, floating);
    window.dispatchEvent(new Event("scroll"));

    anchored.dispose();

    // Strict: a frame queued by that scroll must be cancelled too, or it
    // would re-position an element whose owner has moved on.
    leaks.assertClean("anchorTo leaked", { strict: true });
  });
});

describe("observeResize", () => {
  let created = 0;
  let observed: Element[] = [];
  let unobserved: Element[] = [];
  const original = globalThis.ResizeObserver;

  beforeEach(() => {
    created = 0;
    observed = [];
    unobserved = [];
    globalThis.ResizeObserver = class {
      constructor() {
        created++;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve(el: Element) {
        unobserved.push(el);
      }
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    resetResizePool();
  });

  afterEach(() => {
    resetResizePool();
    globalThis.ResizeObserver = original;
  });

  it("shares one observer across every element and watcher", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    const offA1 = observeResize(a, () => {});
    const offA2 = observeResize(a, () => {});
    const offB = observeResize(b, () => {});

    expect(created).toBe(1);
    // An element is observed once, however many things watch it.
    expect(observed).toEqual([a, b]);

    offA1();
    expect(unobserved).toEqual([]);
    offA2();
    expect(unobserved).toEqual([a]);
    offB();
    expect(unobserved).toEqual([a, b]);
  });
});
