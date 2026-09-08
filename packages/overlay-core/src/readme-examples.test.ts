import { describe, expect, it } from "vitest";
import { effect } from "@formwright/reactive";
import { validateSchema } from "@formwright/overlay-schema";
import { getOverlayStore, overlay } from "./index.js";

/** Every snippet in the README's Overlaywright section, run for real. A
 *  documented example that does not work is worse than no example. */
describe("README examples", () => {
  it("opens a schema-described drawer", () => {
    const store = getOverlayStore();
    store.closeAll();
    overlay.open({
      id: "edit-member",
      kind: "drawer",
      side: "right",
      size: "md",
      title: "Edit member",
      actions: [
        { name: "cancel", label: "Cancel", role: "cancel" },
        { name: "save", label: "Save", role: "confirm", value: true },
      ],
    });
    const entry = store.get("edit-member");
    expect(entry?.kind).toBe("drawer");
    expect(entry?.side).toBe("right");
    store.closeAll();
  });

  it("stacks a modal over a drawer and closes only the top", () => {
    const store = getOverlayStore();
    store.closeAll();
    for (const e of [...store.stack.get()]) store.remove(e.id);

    overlay.drawer({ id: "nav" });
    overlay.modal({ id: "confirm" });
    expect(store.stack.get().map((e) => e.id)).toEqual(["nav", "confirm"]);

    store.closeTop();
    expect(store.get("confirm")?.open).toBe(false);
    expect(store.get("nav")?.open).toBe(true);
    expect(store.locksScroll.get()).toBe(true);

    store.closeAll();
    for (const e of [...store.stack.get()]) store.remove(e.id);
  });

  it("resolves the result with the action's value", async () => {
    const { id, result } = overlay.modal({
      title: "Assign trainer",
      actions: [{ name: "assign", label: "Assign", value: "trainer-7" }],
    });
    getOverlayStore().close(id, "trainer-7");
    await expect(result).resolves.toBe("trainer-7");
  });

  it("drives a renderer from one effect over the stack", () => {
    const store = getOverlayStore();
    store.closeAll();
    for (const e of [...store.stack.get()]) store.remove(e.id);

    const painted: string[] = [];
    const dispose = effect(() => {
      for (const entry of store.stack.get()) {
        if (entry.open) painted.push(`${entry.id}@${entry.index}`);
      }
    });
    overlay.modal({ id: "a" });
    overlay.modal({ id: "b" });
    expect(painted).toContain("a@0");
    expect(painted).toContain("b@1");
    dispose();
    store.closeAll();
    for (const e of [...store.stack.get()]) store.remove(e.id);
  });

  it("rejects an alert with no way out, as documented", () => {
    const { valid, issues } = validateSchema({
      id: "a",
      kind: "modal",
      dismiss: "alert",
    });
    expect(valid).toBe(false);
    expect(issues[0]?.path).toBe("actions");
    expect(issues[0]?.message).toContain("at least one action");
  });
});
