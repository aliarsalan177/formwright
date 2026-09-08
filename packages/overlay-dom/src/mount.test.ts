import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OverlayStore } from "@formwright/overlay-core";
import { mountOverlays } from "./index.js";
import { resetScrollLock } from "./scroll-lock.js";

/** Exit transitions are irrelevant to behaviour and only make the tests
 *  wait, so every mount here removes synchronously. */
function host(store: OverlayStore) {
  return mountOverlays({ store, exitMs: 0 });
}

function panels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".ow-panel"));
}

function press(key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

let dispose: (() => void) | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  resetScrollLock();
});

afterEach(() => {
  dispose?.();
  dispose = null;
  resetScrollLock();
});

describe("mountOverlays", () => {
  it("paints an open entry and removes it once closed", () => {
    const store = new OverlayStore();
    dispose = host(store);
    expect(panels()).toHaveLength(0);

    store.open({ id: "a", kind: "modal", title: "Hello" });
    expect(panels()).toHaveLength(1);
    expect(document.querySelector(".ow-title")?.textContent).toBe("Hello");

    store.close("a");
    expect(panels()).toHaveLength(0);
    expect(store.get("a")).toBeNull(); // the host told the store to drop it
  });

  it("stacks a modal above a drawer and orders them by index", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "nav", kind: "drawer" });
    store.open({ id: "confirm", kind: "modal" });

    const layers = Array.from(document.querySelectorAll<HTMLElement>(".ow-layer"));
    expect(layers).toHaveLength(2);
    expect(layers.map((l) => l.style.zIndex)).toEqual(["0", "1"]);
  });

  it("closes only the top overlay on Escape", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "nav", kind: "drawer" });
    store.open({ id: "confirm", kind: "modal" });

    press("Escape");

    expect(store.get("confirm")).toBeNull();
    expect(store.get("nav")?.open).toBe(true);
    expect(panels()).toHaveLength(1);
  });

  it("ignores Escape for an alert", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "sure",
      kind: "modal",
      dismiss: "alert",
      actions: [{ name: "ok", label: "OK", value: true }],
    });

    press("Escape");
    expect(store.get("sure")?.open).toBe(true);
    expect(panels()).toHaveLength(1);
  });

  it("resolves the result when an action button is clicked", async () => {
    const store = new OverlayStore();
    dispose = host(store);
    const handle = store.open<boolean>({
      id: "sure",
      kind: "modal",
      actions: [
        { name: "cancel", label: "Cancel", role: "cancel", value: false },
        { name: "ok", label: "Delete", role: "danger", value: true },
      ],
    });

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".ow-action"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Delete"]);
    buttons[1]!.click();

    await expect(handle.result).resolves.toBe(true);
  });

  it("renders each body block type", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "b",
      kind: "modal",
      body: [
        { type: "text", text: "A note", tone: "muted" },
        { type: "list", items: ["one", "two"] },
        { type: "fields", items: [{ label: "Total", value: "PKR 3,000" }] },
        { type: "divider" },
      ],
    });

    expect(document.querySelector(".ow-text")?.getAttribute("data-tone")).toBe("muted");
    expect(document.querySelectorAll(".ow-list li")).toHaveLength(2);
    expect(document.querySelector(".ow-field dd")?.textContent).toBe("PKR 3,000");
    expect(document.querySelector(".ow-rule")).not.toBeNull();
  });

  it("escapes text rather than interpreting it as markup", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "x",
      kind: "modal",
      title: "<img src=x onerror=alert(1)>",
      body: [{ type: "text", text: "<script>bad()</script>" }],
    });

    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector(".ow-text")?.textContent).toBe("<script>bad()</script>");
  });

  it("marks a dialog for assistive tech", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "modal", title: "Title", description: "Body" });

    const panel = panels()[0]!;
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("aria-labelledby")).toBe("a-title");
    expect(panel.getAttribute("aria-describedby")).toBe("a-desc");
  });

  it("uses alertdialog and no backdrop dismissal for an alert", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "modal",
      dismiss: "alert",
      actions: [{ name: "ok", label: "OK" }],
    });
    expect(panels()[0]!.getAttribute("role")).toBe("alertdialog");
  });

  it("leaves the page alone for a non-modal popover", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "menu", kind: "popover" });

    expect(panels()[0]!.getAttribute("aria-modal")).toBe("false");
    expect(document.body.style.position).toBe("");
    expect(document.querySelector(".ow-backdrop")).toBeNull();
  });
});

describe("scroll lock", () => {
  it("freezes the body while a modal is open and restores it after", () => {
    const store = new OverlayStore();
    dispose = host(store);

    store.open({ id: "a", kind: "modal" });
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");

    store.close("a");
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("holds the lock while a drawer underneath is still open", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "nav", kind: "drawer" });
    store.open({ id: "confirm", kind: "modal" });

    store.close("confirm");
    expect(document.body.style.position).toBe("fixed");

    store.close("nav");
    expect(document.body.style.position).toBe("");
  });
});

describe("focus", () => {
  it("moves focus into the panel and hands it back on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "modal",
      actions: [{ name: "ok", label: "OK" }],
    });

    expect(document.activeElement).toBe(document.querySelector(".ow-action"));

    store.close("a");
    expect(document.activeElement).toBe(opener);
  });

  it("makes the rest of the page inert while trapped", () => {
    const behind = document.createElement("main");
    document.body.appendChild(behind);

    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "modal" });
    expect(behind.inert).toBe(true);

    store.close("a");
    expect(behind.inert).toBe(false);
  });
});
