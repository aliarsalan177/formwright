// The point of the leak harness is that it runs against real code, not a
// toy. This is the package with the most to get wrong — a document-level
// keydown listener, pointer listeners on every layer, a scroll lock that
// rewrites <body>, a focus trap that marks siblings inert, and drag
// handlers on every sheet.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OverlayStore } from "@formwright/overlay-core";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import { mountOverlays } from "./index.js";
import { resetScrollLock } from "./scroll-lock.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  document.getElementById("formwright-overlay-styles")?.remove();
  resetScrollLock();
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

/** Everything a caller of mountOverlays owns, torn down the way an app
 *  would tear it down on unmount. */
function mountAndDispose(work: (store: OverlayStore) => void): LeakTracker {
  const tracker = trackLeaks();
  const store = new OverlayStore();
  const dispose = mountOverlays({ store, exitMs: 0 });
  work(store);
  dispose();
  return tracker;
}

describe("overlay host disposal", () => {
  it("leaves nothing behind after mounting and disposing an empty host", () => {
    leaks = mountAndDispose(() => {});
    leaks.assertClean("mountOverlays() → dispose() leaked");
  });

  it("leaves nothing behind after a modal is opened and closed", () => {
    leaks = mountAndDispose((store) => {
      store.open({
        id: "leak-modal",
        kind: "modal",
        title: "Hello",
        body: [{ type: "text", text: "Body" }],
      });
      store.close("leak-modal");
    });
    leaks.assertClean("open() → close() leaked");
  });

  it("leaves nothing behind when the host is disposed with an overlay still open", () => {
    // The harder case: an app unmounting mid-dialog. Nothing gets a
    // close event, so teardown has to come from the host alone.
    leaks = mountAndDispose((store) => {
      store.open({
        id: "leak-open",
        kind: "drawer",
        side: "left",
        title: "Still open",
        body: [{ type: "text", text: "Body" }],
      });
    });
    leaks.assertClean("dispose() with an overlay still open leaked");
  });

  it("leaves nothing behind after a stack of overlays", () => {
    leaks = mountAndDispose((store) => {
      store.open({ id: "a", kind: "drawer", side: "left", title: "A", body: [] });
      store.open({ id: "b", kind: "modal", title: "B", body: [] });
      store.open({ id: "c", kind: "modal", title: "C", body: [] });
      store.close("b");
    });
    leaks.assertClean("a stack of overlays leaked");
  });

  it("leaves nothing behind after a sheet, which adds drag handlers", () => {
    leaks = mountAndDispose((store) => {
      store.open({
        id: "leak-sheet",
        kind: "sheet",
        side: "bottom",
        title: "Sheet",
        snapPoints: [0.5, 1],
        body: [{ type: "text", text: "Drag me" }],
      });
      store.close("leak-sheet");
    });
    leaks.assertClean("a sheet leaked");
  });

  it("restores <body> after a scroll lock, rather than leaving it fixed", () => {
    const store = new OverlayStore();
    const dispose = mountOverlays({ store, exitMs: 0 });
    store.open({ id: "lock", kind: "modal", title: "Locked", body: [] });
    expect(document.body.style.position).toBe("fixed");

    dispose();

    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("removes its root from the container", () => {
    const store = new OverlayStore();
    const dispose = mountOverlays({ store, exitMs: 0 });
    expect(document.querySelectorAll(".ow-root")).toHaveLength(1);

    dispose();

    expect(document.querySelectorAll(".ow-root")).toHaveLength(0);
  });
});
