// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Scope, on } from "./dom.js";
import { trackLeaks, type LeakTracker } from "./testing.js";

let tracker: LeakTracker | null = null;

afterEach(() => {
  tracker?.restore();
  tracker = null;
});

describe("trackLeaks", () => {
  it("passes when a scope cleans up after itself", () => {
    tracker = trackLeaks();
    const el = document.createElement("button");
    const scope = new Scope();
    on(scope, el, "click", () => {});

    scope.dispose();

    expect(tracker.report().clean).toBe(true);
    expect(() => tracker!.assertClean()).not.toThrow();
  });

  it("catches a listener that was never removed, and names it", () => {
    tracker = trackLeaks();
    const el = document.createElement("button");
    el.id = "save";
    // Connected: a listener only outlives the component if its target does.
    document.body.append(el);
    el.addEventListener("click", () => {});

    const report = tracker.report();
    expect(report.clean).toBe(false);
    expect(report.listeners).toEqual(["button#save · click"]);
    expect(() => tracker!.assertClean()).toThrow(/button#save · click/);
  });

  it("distinguishes capture from bubble, since removal has to match", () => {
    tracker = trackLeaks();
    const el = document.createElement("div");
    document.body.append(el);
    const handler = () => {};
    el.addEventListener("scroll", handler, true);
    // The wrong phase: this does not remove it, and must not look like it did.
    el.removeEventListener("scroll", handler, false);

    expect(tracker.report().listeners).toEqual(["div · scroll (capture)"]);
  });

  it("ignores a `once` listener, which removes itself", () => {
    tracker = trackLeaks();
    document.createElement("div").addEventListener("x", () => {}, { once: true });

    expect(tracker.report().clean).toBe(true);
  });

  it("counts an interval until it is cleared", () => {
    vi.useFakeTimers();
    tracker = trackLeaks();
    const id = setInterval(() => {}, 10);
    expect(tracker.report().intervals).toBe(1);

    clearInterval(id);
    expect(tracker.report().intervals).toBe(0);

    tracker.restore();
    tracker = null;
    vi.useRealTimers();
  });

  it("counts a pending timeout but forgives one that already fired", async () => {
    tracker = trackLeaks();
    setTimeout(() => {}, 0);
    expect(tracker.report().timers).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 5));

    // Both the tracked one and the one awaited above have run.
    expect(tracker.report().timers).toBe(0);
  });

  it("catches a timeout that is still pending at teardown", () => {
    vi.useFakeTimers();
    tracker = trackLeaks();
    setTimeout(() => {}, 60_000);

    expect(tracker.report().timers).toBe(1);
    // A timeout fires once and is gone, so it is not a leak by default —
    // only a component claiming a synchronous teardown asks about it.
    expect(() => tracker!.assertClean()).not.toThrow();
    expect(() => tracker!.assertClean("nope", { strict: true })).toThrow(
      /1 timeout\(s\) still pending/,
    );

    tracker.restore();
    tracker = null;
    vi.useRealTimers();
  });

  it("catches an observer left connected", () => {
    // jsdom ships MutationObserver but neither of the other two, so this is
    // the one that can be exercised here.
    tracker = trackLeaks();
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { childList: true });

    expect(tracker.report().observers).toEqual(["MutationObserver"]);

    observer.disconnect();
    expect(tracker.report().clean).toBe(true);
  });

  it("ignores a listener on a node that has left the document", () => {
    // It dies with the node. Demanding removeEventListener for every child
    // of a discarded subtree is busywork, and a harness that asks for it
    // gets switched off.
    tracker = trackLeaks();
    const el = document.createElement("div");
    document.body.append(el);
    el.addEventListener("click", () => {});
    expect(tracker.report().listeners).toHaveLength(1);

    el.remove();

    expect(tracker.report().listeners).toHaveLength(0);
    expect(tracker.report().clean).toBe(true);
  });

  it("still catches a listener on document, which outlives everything", () => {
    tracker = trackLeaks();
    document.addEventListener("keydown", () => {});

    expect(tracker.report().listeners).toEqual(["document · keydown"]);
    expect(tracker.report().clean).toBe(false);
  });

  it("takes an ignore predicate for a host with its own quirks", () => {
    tracker = trackLeaks({ ignore: (r) => r.type === "pointerlockchange" });
    document.addEventListener("pointerlockchange", () => {});
    document.addEventListener("visibilitychange", () => {});

    expect(tracker.report().listeners).toEqual(["document · visibilitychange"]);
  });

  it("puts the globals back, so one test cannot poison the next", () => {
    const addBefore = EventTarget.prototype.addEventListener;
    const timeoutBefore = globalThis.setTimeout;

    const local = trackLeaks();
    expect(EventTarget.prototype.addEventListener).not.toBe(addBefore);
    local.restore();

    expect(EventTarget.prototype.addEventListener).toBe(addBefore);
    expect(globalThis.setTimeout).toBe(timeoutBefore);
  });
});
