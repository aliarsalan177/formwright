import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  // The engine's stylesheet is injected once and keyed by id, so it does
  // not need clearing — and wiping <head> takes vitest's own injected
  // scripts with it, which ends in a recursive IPC serialisation crash.
  document.getElementById("formwright-overlay-styles")?.remove();
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

  it("closes when the backdrop is clicked", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "drawer" });

    const backdrop = document.querySelector<HTMLElement>(".ow-backdrop")!;
    // Press and release, both outside — a press alone is the start of a
    // drag, which might still end inside the panel.
    backdrop.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    backdrop.dispatchEvent(new Event("pointerup", { bubbles: true }));

    expect(store.get("a")).toBeNull();
  });

  it("does not close when the click started inside the panel", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "modal", title: "Keep me" });

    const panel = panels()[0]!;
    panel.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    panel.dispatchEvent(new Event("pointerup", { bubbles: true }));

    expect(store.get("a")?.open).toBe(true);
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

  it("pins host footer content outside the scrolling body", () => {
    const store = new OverlayStore();
    dispose = host(store);

    const bar = document.createElement("div");
    bar.id = "submit-bar";
    store.open(
      {
        id: "a",
        kind: "drawer",
        body: [{ type: "slot", name: "content" }],
        footer: [{ type: "slot", name: "footer" }],
        actions: [{ name: "save", label: "Save" }],
      },
      { slots: { content: document.createElement("div"), footer: bar } },
    );

    const panel = panels()[0]!;
    const foot = panel.querySelector(".ow-foot")!;
    // In the footer, not the body — so it stays put while the body scrolls.
    expect(foot.contains(bar)).toBe(true);
    expect(panel.querySelector(".ow-body")!.contains(bar)).toBe(false);
    // Host content sits above the button row.
    expect(foot.querySelector(".ow-foot-content")).not.toBeNull();
    expect(foot.querySelector(".ow-action")!.textContent).toBe("Save");
  });

  it("renders a footer with no actions at all", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "sheet",
      footer: [{ type: "text", text: "Total PKR 5,000" }],
    });

    const foot = panels()[0]!.querySelector(".ow-foot")!;
    expect(foot.textContent).toContain("Total PKR 5,000");
    expect(foot.querySelector(".ow-action")).toBeNull();
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

  it("names a hidden-title dialog without adding to the DOM", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "sheet",
      title: "Register member",
      titleHidden: true,
      body: [{ type: "slot", name: "content" }],
    });

    const panel = panels()[0]!;
    // The host draws its own header inside the slot, so nothing is
    // rendered here — but the dialog still has an accessible name.
    expect(panel.querySelector(".ow-head")).toBeNull();
    expect(panel.getAttribute("aria-label")).toBe("Register member");
  });

  it("appends host classes without dropping its own", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "modal",
      title: "Styled",
      body: [{ type: "text", text: "hi" }],
      actions: [{ name: "ok", label: "OK" }],
      classNames: {
        panel: "rounded-2xl",
        head: "px-6",
        body: "text-sm",
        footer: "justify-start",
        action: "btn",
      },
    });

    const panel = panels()[0]!;
    expect(panel.className).toBe("ow-panel rounded-2xl");
    expect(panel.querySelector(".ow-head")!.className).toBe("ow-head px-6");
    expect(panel.querySelector(".ow-body")!.className).toBe("ow-body text-sm");
    expect(panel.querySelector(".ow-foot")!.className).toBe("ow-foot justify-start");
    expect(panel.querySelector(".ow-action")!.className).toBe("ow-action btn");
  });

  it("closes on a click in the layer outside the panel", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "drawer" });

    const layer = document.querySelector<HTMLElement>(".ow-layer")!;
    layer.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    layer.dispatchEvent(new Event("pointerup", { bubbles: true }));

    expect(store.get("a")).toBeNull();
  });

  it("keeps swallowing pointer events through its exit", () => {
    // The browser hit-tests the `click` after the pointerup that
    // dismissed the drawer. If the layer stopped taking pointer events
    // the moment it started closing, that click would land on the row
    // underneath — closing the drawer and reopening the row in one tap.
    //
    // jsdom neither hit-tests nor honours pointer-events, so the effect
    // itself cannot be observed here; this pins the mechanism that
    // produces it.
    const store = new OverlayStore();
    dispose = mountOverlays({ store, exitMs: 50 });
    store.open({ id: "a", kind: "drawer" });

    const layer = document.querySelector<HTMLElement>(".ow-layer")!;
    layer.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    layer.dispatchEvent(new Event("pointerup", { bubbles: true }));

    expect(layer.dataset.open).toBe("false");
    expect(layer.style.pointerEvents).toBe("auto");
  });

  it("treats a drag that starts inside the panel as a selection", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "modal", body: [{ type: "text", text: "select me" }] });

    const panel = panels()[0]!;
    const layer = document.querySelector<HTMLElement>(".ow-layer")!;
    // Down inside, up outside: selecting text past the edge must not
    // throw away whatever the dialog was holding.
    panel.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    layer.dispatchEvent(new Event("pointerup", { bubbles: true }));

    expect(store.get("a")?.open).toBe(true);
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

describe("backdrop", () => {
  it("writes per-overlay overrides as custom properties", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "a",
      kind: "drawer",
      backdrop: { color: "rgb(2 6 23)", opacity: 0.7, blur: 10 },
    });

    const backdrop = document.querySelector<HTMLElement>(".ow-backdrop")!;
    expect(backdrop.style.getPropertyValue("--ow-backdrop-color")).toBe("rgb(2 6 23)");
    expect(backdrop.style.getPropertyValue("--ow-backdrop-opacity")).toBe("0.7");
    expect(backdrop.style.getPropertyValue("--ow-backdrop-blur")).toBe("10px");
  });

  it("leaves the theme in charge when no override is given", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "modal" });

    const backdrop = document.querySelector<HTMLElement>(".ow-backdrop")!;
    expect(backdrop.getAttribute("style")).toBeNull();
  });

  it("accepts a blur of zero as an explicit opt-out", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "a", kind: "drawer", backdrop: { blur: 0 } });

    const backdrop = document.querySelector<HTMLElement>(".ow-backdrop")!;
    expect(backdrop.style.getPropertyValue("--ow-backdrop-blur")).toBe("0px");
  });
});

describe("toasts", () => {
  it("ships stacking, transition, and theme-token styles", () => {
    const store = new OverlayStore();
    dispose = host(store);

    const styles = document.querySelector<HTMLStyleElement>(
      "#formwright-overlay-styles",
    )?.textContent;
    expect(styles).toContain('.ow-toasts[data-position$="-right"]');
    expect(styles).toContain('.ow-panel[data-kind="toast"][data-open="true"]');
    expect(styles).toContain("var(--ow-success)");
    expect(styles).toContain("var(--ow-danger)");
  });

  it("stacks in a corner region without a backdrop or scroll lock", () => {
    const store = new OverlayStore();
    dispose = host(store);
    store.open({
      id: "t",
      kind: "toast",
      position: "top-center",
      body: [{ type: "text", text: "Saved" }],
    });

    const region = document.querySelector<HTMLElement>(".ow-toasts")!;
    expect(region.dataset.position).toBe("top-center");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(document.querySelector(".ow-backdrop")).toBeNull();
    expect(document.body.style.position).toBe("");
    expect(document.querySelector(".ow-panel")?.textContent).toContain("Saved");
  });

  it("never takes focus away from the page", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "t", kind: "toast", body: [{ type: "text", text: "Saved" }] });

    // A notice that stole the caret mid-typing would be worse than none.
    expect(document.activeElement).toBe(input);
  });

  it("dismisses itself after its duration", () => {
    vi.useFakeTimers();
    try {
      const store = new OverlayStore();
      dispose = host(store);
      store.open({ id: "t", kind: "toast", duration: 3000, body: [] });
      expect(store.get("t")?.open).toBe(true);

      vi.advanceTimersByTime(3000);
      expect(store.get("t")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stays up when the duration is zero", () => {
    vi.useFakeTimers();
    try {
      const store = new OverlayStore();
      dispose = host(store);
      store.open({ id: "t", kind: "toast", duration: 0, body: [] });

      vi.advanceTimersByTime(60_000);
      expect(store.get("t")?.open).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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

  it("lets only the top trap enforce, so two overlays do not fight", () => {
    // Both traps listen on the document. Without a top-most rule, A pulls
    // focus back into A, which fires focusin outside B, which pulls it
    // into B — recursing until the stack gives out and the tab hangs.
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    const store = new OverlayStore();
    dispose = host(store);
    store.open({ id: "nav", kind: "drawer", actions: [{ name: "a", label: "A" }] });
    store.open({ id: "top", kind: "modal", actions: [{ name: "b", label: "B" }] });

    // Focus escaping is pulled back exactly once, into the top overlay.
    expect(() => outside.focus()).not.toThrow();
    const panel = panels()[1]!;
    expect(panel.contains(document.activeElement)).toBe(true);
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
