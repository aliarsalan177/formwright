import { describe, expect, it } from "vitest";
import type { OverlaySchema } from "@formwright/overlay-schema";
import { OverlayStore } from "./store.js";
import { getOverlayStore, overlay } from "./overlay.js";

const modal = (id: string): OverlaySchema => ({ id, kind: "modal" });
const drawer = (id: string): OverlaySchema => ({ id, kind: "drawer" });
const popover = (id: string): OverlaySchema => ({ id, kind: "popover" });

describe("stacking", () => {
  it("keeps a drawer mounted underneath a modal opened from it", () => {
    const store = new OverlayStore();
    store.open(drawer("nav"));
    store.open(modal("confirm"));

    expect(store.stack.get().map((e) => e.id)).toEqual(["nav", "confirm"]);
    expect(store.top.get()?.id).toBe("confirm");
  });

  it("escape closes only the top entry", () => {
    const store = new OverlayStore();
    store.open(drawer("nav"));
    store.open(modal("confirm"));

    store.closeTop();

    expect(store.get("confirm")?.open).toBe(false);
    expect(store.get("nav")?.open).toBe(true);
    expect(store.top.get()?.id).toBe("nav");
  });

  it("holds the scroll lock until the last modal entry closes", () => {
    const store = new OverlayStore();
    store.open(drawer("nav"));
    store.open(modal("confirm"));
    expect(store.locksScroll.get()).toBe(true);

    // Closing the modal must not release the lock the drawer still needs.
    store.close("confirm");
    store.remove("confirm");
    expect(store.locksScroll.get()).toBe(true);

    store.close("nav");
    expect(store.locksScroll.get()).toBe(false);
  });

  it("does not let a popover take focus or lock scroll", () => {
    const store = new OverlayStore();
    store.open(popover("menu"));
    expect(store.top.get()).toBeNull();
    expect(store.locksScroll.get()).toBe(false);
  });

  it("indexes entries bottom-up so a renderer can derive z-order", () => {
    const store = new OverlayStore();
    store.open(drawer("nav"));
    store.open(modal("a"));
    store.open(modal("b"));
    expect(store.stack.get().map((e) => e.index)).toEqual([0, 1, 2]);
  });
});

describe("dismissal", () => {
  it("refuses to dismiss an alert from escape or the backdrop", () => {
    const store = new OverlayStore();
    store.open({ ...modal("confirm"), dismiss: "alert" });

    expect(store.closeTop()).toBeNull();
    expect(store.get("confirm")?.open).toBe(true);

    // An action can still close it.
    store.close("confirm", true);
    expect(store.get("confirm")?.open).toBe(false);
  });

  it("keeps a closed entry on the stack until the renderer removes it", () => {
    const store = new OverlayStore();
    store.open(modal("a"));
    store.close("a");
    expect(store.get("a")).not.toBeNull();
    expect(store.get("a")?.open).toBe(false);

    store.remove("a");
    expect(store.get("a")).toBeNull();
  });

  it("resolves the result with the closing value", async () => {
    const store = new OverlayStore();
    const handle = store.open<string>(modal("a"));
    store.close("a", "saved");
    await expect(handle.result).resolves.toBe("saved");
  });

  it("resolves undefined when dismissed rather than answered", async () => {
    const store = new OverlayStore();
    const handle = store.open<string>(modal("a"));
    store.closeTop();
    await expect(handle.result).resolves.toBeUndefined();
  });

  it("ignores a second close so the result cannot be overwritten", async () => {
    const store = new OverlayStore();
    const handle = store.open<string>(modal("a"));
    store.close("a", "first");
    store.close("a", "second");
    await expect(handle.result).resolves.toBe("first");
  });

  it("calls onClose exactly once", async () => {
    const store = new OverlayStore();
    const values: (string | undefined)[] = [];
    const handle = store.open<string>(modal("a"), {
      onClose: (value) => values.push(value),
    });

    handle.close("first");
    handle.close("second");
    store.close("a", "third");
    store.remove("a");

    await expect(handle.result).resolves.toBe("first");
    expect(values).toEqual(["first"]);
  });

  it("does not remove an overlay before it has closed", () => {
    const store = new OverlayStore();
    store.open(modal("a"));

    store.remove("a");

    expect(store.get("a")?.open).toBe(true);
  });
});

describe("reopening the same id", () => {
  it("refreshes in place instead of stacking a duplicate", () => {
    const store = new OverlayStore();
    store.open({ ...modal("edit"), title: "First" });
    store.open({ ...modal("edit"), title: "Second" });

    expect(store.stack.get()).toHaveLength(1);
    expect(store.get("edit")?.schema.title).toBe("Second");
  });

  it("hands back the promise the caller is already awaiting", async () => {
    const store = new OverlayStore();
    const first = store.open<string>(modal("edit"));
    const second = store.open<string>(modal("edit"));
    store.close("edit", "done");

    await expect(first.result).resolves.toBe("done");
    await expect(second.result).resolves.toBe("done");
  });

  it("registers each duplicate opener for the shared close", async () => {
    const store = new OverlayStore();
    const closed: string[] = [];
    const shared = (value: string | undefined) => closed.push(`shared:${value}`);

    const first = store.open<string>(modal("edit"), { onClose: shared });
    const second = store.open<string>(modal("edit"), { onClose: shared });
    const third = store.open<string>(modal("edit"), {
      onClose: (value) => closed.push(`third:${value}`),
    });
    third.close("done");

    await expect(first.result).resolves.toBe("done");
    await expect(second.result).resolves.toBe("done");
    expect(closed).toEqual(["shared:done", "third:done"]);
  });

  it("starts a fresh lifecycle when a closed id reopens before removal", async () => {
    const store = new OverlayStore();
    const closed: string[] = [];
    const first = store.open<string>(modal("edit"), {
      onClose: (value) => closed.push(`first:${value}`),
    });
    first.close("one");

    const second = store.open<string>(
      { ...modal("edit"), title: "Reopened" },
      {
        onClose: (value) => closed.push(`second:${value}`),
      },
    );
    expect(store.stack.get()).toHaveLength(1);
    expect(store.get("edit")?.open).toBe(true);
    expect(store.get("edit")?.schema.title).toBe("Reopened");

    // A delayed exit callback and an old handle belong to the first lifecycle.
    store.remove("edit");
    first.close("stale");
    expect(store.get("edit")?.open).toBe(true);

    second.close("two");
    await expect(first.result).resolves.toBe("one");
    await expect(second.result).resolves.toBe("two");
    expect(closed).toEqual(["first:one", "second:two"]);
  });

  it("can remove a closed id and open it again", async () => {
    const store = new OverlayStore();
    const first = store.open<string>(modal("edit"));
    first.close("one");
    store.remove("edit");

    const second = store.open<string>(modal("edit"));
    second.close("two");

    await expect(first.result).resolves.toBe("one");
    await expect(second.result).resolves.toBe("two");
  });
});

describe("snap points", () => {
  const sheet: OverlaySchema = {
    id: "s",
    kind: "sheet",
    snapPoints: [0.3, 0.6, 1],
    defaultSnap: 1,
  };

  it("opens at the requested snap point", () => {
    const store = new OverlayStore();
    store.open(sheet);
    expect(store.get("s")?.snap).toBe(1);
  });

  it("clamps a snap index to the available points", () => {
    const store = new OverlayStore();
    store.open(sheet);
    store.setSnap("s", 99);
    expect(store.get("s")?.snap).toBe(2);
    store.setSnap("s", -4);
    expect(store.get("s")?.snap).toBe(0);
  });
});

describe("the ambient store", () => {
  it("is the same instance for every importer", () => {
    // What makes `overlay.modal()` work from a module that is nowhere
    // near the renderer. Two instances would mean opening into a store
    // nothing is painting.
    expect(getOverlayStore()).toBe(getOverlayStore());
    expect(overlay.store).toBe(getOverlayStore());
  });

  it("resolves confirm with a boolean either way", async () => {
    const pendingYes = overlay.confirm({ id: "c1", title: "Delete?" });
    overlay.close("c1", true);
    await expect(pendingYes).resolves.toBe(true);

    const pendingNo = overlay.confirm({ id: "c2", title: "Delete?" });
    overlay.close("c2", false);
    await expect(pendingNo).resolves.toBe(false);

    overlay.closeAll();
  });

  it("builds a schema for every sugar call, so nothing bypasses open()", () => {
    const store = getOverlayStore();
    store.closeAll();
    overlay.drawer({ id: "d", title: "Filters", side: "left" });
    const entry = store.get("d");
    expect(entry?.kind).toBe("drawer");
    expect(entry?.side).toBe("left");
    expect(entry?.schema.title).toBe("Filters");
    store.closeAll();
  });
});

describe("groups", () => {
  const sheet = (id: string, group?: string): OverlaySchema => ({
    id,
    kind: "sheet",
    ...(group ? { group } : {}),
  });

  it("closes the previous member when a new one opens", () => {
    const store = new OverlayStore();
    store.open(sheet("create", "forms"));
    store.open(sheet("edit", "forms"));

    expect(store.get("create")?.open).toBe(false);
    expect(store.get("edit")?.open).toBe(true);
  });

  it("cancels one that is still animating in", async () => {
    // The first sheet has opened but its exit has not been reported, so
    // it is still on the stack. Opening the second must still cancel it.
    const store = new OverlayStore();
    const first = store.open<string>(sheet("a", "forms"));
    store.open(sheet("b", "forms"));

    await expect(first.result).resolves.toBeUndefined();
    expect(store.get("a")?.open).toBe(false);
  });

  it("leaves overlays in other groups, and ungrouped ones, alone", () => {
    const store = new OverlayStore();
    store.open(sheet("nav", "navigation"));
    store.open(sheet("loose"));
    store.open(sheet("create", "forms"));
    store.open(sheet("edit", "forms"));

    expect(store.get("nav")?.open).toBe(true);
    expect(store.get("loose")?.open).toBe(true);
    expect(store.get("create")?.open).toBe(false);
    expect(store.get("edit")?.open).toBe(true);
  });
});
