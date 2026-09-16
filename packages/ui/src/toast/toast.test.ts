import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import { showToast } from "./index.js";
import type { FwToast, ToastDismissDetail } from "./toast.js";
import type { FwToastRegion } from "./toast-region.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  vi.useFakeTimers();
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount(attrs = "", content = "Saved."): FwToast {
  document.body.innerHTML = `<fw-toast-region><fw-toast ${attrs}>${content}</fw-toast></fw-toast-region>`;
  return document.querySelector("fw-toast")!;
}
/** A toast with no region, so the leak checks see only the toast. */
function mountBare(attrs = ""): FwToast {
  document.body.innerHTML = `<fw-toast ${attrs}>Saved.</fw-toast>`;
  return document.querySelector("fw-toast")!;
}
const part = (el: HTMLElement, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)!;
const reasons = (el: FwToast) => {
  const list: string[] = [];
  el.addEventListener("fw-dismiss", (e) => {
    list.push((e as CustomEvent<ToastDismissDetail>).detail.reason);
  });
  return list;
};
/** jsdom delivers MutationObserver records as a microtask. */
const settle = () => Promise.resolve().then(() => Promise.resolve());
/** Pretend `selector` has a CSS transition, which jsdom never computes. */
function withTransition(localName: string, value = "200ms") {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((node: Element) => {
    const style = real(node);
    if (node.localName !== localName) return style;
    return Object.assign(Object.create(style) as CSSStyleDeclaration, {
      transitionDuration: value,
      transitionDelay: "0s",
    });
  });
}

describe("fw-toast", () => {
  it("renders its heading, message slot and tone", () => {
    const el = mount(`tone="success" heading="Payment recorded"`);
    expect(part(el, "heading").textContent).toBe("Payment recorded");
    expect(part(el, "heading").hidden).toBe(false);
    expect(part(el, "message").querySelector("slot")).not.toBeNull();
    expect(part(el, "action").hidden).toBe(true);
    expect(el.textContent).toBe("Saved.");
    el.tone = "warning";
    expect(el.getAttribute("tone")).toBe("warning");
  });

  it("uses role=alert only for danger", () => {
    const el = mount();
    expect(el.hasAttribute("role")).toBe(false);
    el.tone = "danger";
    expect(el.getAttribute("role")).toBe("alert");
    el.tone = "info";
    expect(el.hasAttribute("role")).toBe(false);
  });

  it("dismisses itself after its duration", () => {
    const el = mount(`duration="3000"`);
    const list = reasons(el);
    vi.advanceTimersByTime(2999);
    expect(el.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.isConnected).toBe(false);
    expect(list).toEqual(["timeout"]);
  });

  it("defaults to 5000ms, and duration 0 is persistent", () => {
    const el = mount();
    vi.advanceTimersByTime(5000);
    expect(el.isConnected).toBe(false);

    const sticky = mount(`duration="0"`);
    vi.advanceTimersByTime(60_000);
    expect(sticky.isConnected).toBe(true);
  });

  it("pauses while hovered and resumes with the time left", () => {
    const el = mount(`duration="1000"`);
    vi.advanceTimersByTime(600);
    el.dispatchEvent(new MouseEvent("pointerenter"));
    vi.advanceTimersByTime(10_000);
    expect(el.isConnected).toBe(true);
    el.dispatchEvent(new MouseEvent("pointerleave"));
    vi.advanceTimersByTime(399);
    expect(el.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.isConnected).toBe(false);
  });

  it("pauses while focus is inside", () => {
    const el = mount(`duration="1000"`, `Saved. <button slot="action">Undo</button>`);
    const undo = el.querySelector("button")!;
    undo.focus();
    vi.advanceTimersByTime(5000);
    expect(el.isConnected).toBe(true);
    undo.blur();
    vi.advanceTimersByTime(1000);
    expect(el.isConnected).toBe(false);
  });

  it("stays paused while focus moves within it, or it is still hovered", () => {
    const el = mount(`duration="1000"`, `<button slot="action">Undo</button>`);
    el.dispatchEvent(new MouseEvent("pointerenter"));
    el.querySelector("button")!.focus();
    part(el, "close-button").focus();
    el.querySelector("button")!.blur();
    vi.advanceTimersByTime(5000);
    expect(el.isConnected).toBe(true);
  });

  it("dismisses from the close button, and hides it when not dismissible", () => {
    const el = mount();
    const list = reasons(el);
    part(el, "close-button").click();
    expect(el.isConnected).toBe(false);
    expect(list).toEqual(["close-button"]);

    const fixed = mount(`dismissible="false"`);
    expect(part(fixed, "close-button").hidden).toBe(true);
  });

  it("dismisses from dismiss(), once", () => {
    const el = mount();
    const list = reasons(el);
    el.dismiss();
    el.dismiss();
    expect(list).toEqual(["method"]);
    expect(el.isConnected).toBe(false);
  });

  it("plays its exit before removing itself", () => {
    withTransition("fw-toast");
    const el = mount();
    el.dismiss();
    expect(el.hasAttribute("dismissing")).toBe(true);
    expect(el.isConnected).toBe(true);
    vi.advanceTimersByTime(200);
    expect(el.isConnected).toBe(false);
  });

  it("clears its countdown when removed by hand", () => {
    leaks = trackLeaks();
    const el = mountBare(`duration="1000"`);
    const list = reasons(el);
    el.remove();
    leaks.assertClean("fw-toast leaked", { strict: true });
    vi.advanceTimersByTime(5000);
    expect(list).toEqual([]);
  });

  it("clears its exit timer when removed mid-exit", () => {
    withTransition("fw-toast");
    leaks = trackLeaks();
    const el = mountBare();
    el.dismiss();
    el.remove();
    leaks.assertClean("fw-toast leaked", { strict: true });
  });
});

describe("fw-toast-region", () => {
  it("is a polite live region at bottom-end by default", () => {
    document.body.innerHTML = `<fw-toast-region></fw-toast-region>`;
    const region = document.querySelector<FwToastRegion>("fw-toast-region")!;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("role")).toBe("region");
    expect(region.getAttribute("aria-label")).toBe("Notifications");
    expect(region.placement).toBe("bottom-end");
    expect(region.max).toBe(5);
  });

  it("dismisses the oldest toasts beyond max", async () => {
    document.body.innerHTML = `<fw-toast-region max="2"></fw-toast-region>`;
    const region = document.querySelector<FwToastRegion>("fw-toast-region")!;
    for (const text of ["one", "two", "three"]) {
      const toast = document.createElement("fw-toast");
      toast.textContent = text;
      region.append(toast);
    }
    await settle();
    expect([...region.children].map((t) => t.textContent)).toEqual(["two", "three"]);
    region.max = 1;
    expect([...region.children].map((t) => t.textContent)).toEqual(["three"]);
  });
});

describe("showToast", () => {
  it("creates a region for the placement and reuses it", () => {
    const first = showToast({ message: "Saved", placement: "top-center" });
    showToast({ message: "Again", placement: "top-center" });
    showToast({ message: "Elsewhere" });
    const regions = document.querySelectorAll("fw-toast-region");
    expect(regions).toHaveLength(2);
    expect(regions[0]!.getAttribute("placement")).toBe("top-center");
    expect(regions[0]!.querySelectorAll("fw-toast")).toHaveLength(2);
    expect(regions[1]!.getAttribute("placement")).toBe("bottom-end");
    expect(typeof first.dismiss).toBe("function");
  });

  it("uses a region already in the page", () => {
    document.body.innerHTML = `<main><fw-toast-region></fw-toast-region></main>`;
    showToast({ message: "Hi" });
    expect(document.querySelectorAll("fw-toast-region")).toHaveLength(1);
    expect(document.querySelector("main fw-toast")!.textContent).toBe("Hi");
  });

  it("passes heading, tone and duration, and inserts the message as text", () => {
    showToast({
      message: "<img src=x onerror=alert(1)>",
      heading: "Careful",
      tone: "danger",
      duration: 0,
    });
    const toast = document.querySelector("fw-toast")!;
    expect(toast.heading).toBe("Careful");
    expect(toast.getAttribute("role")).toBe("alert");
    expect(toast.querySelector("img")).toBeNull();
    expect(toast.textContent).toBe("<img src=x onerror=alert(1)>");
    vi.advanceTimersByTime(60_000);
    expect(toast.isConnected).toBe(true);
  });

  it("runs the action, then dismisses", () => {
    const onClick = vi.fn();
    showToast({ message: "Deleted", action: { label: "Undo", onClick } });
    const toast = document.querySelector("fw-toast")!;
    const button = toast.querySelector<HTMLButtonElement>('button[slot="action"]')!;
    expect(button.textContent).toBe("Undo");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(toast.isConnected).toBe(false);
  });

  it("returns a handle that dismisses it", () => {
    const handle = showToast({ message: "Working…", duration: 0 });
    const toast = document.querySelector("fw-toast")!;
    handle.dismiss();
    expect(toast.isConnected).toBe(false);
    handle.dismiss();
  });

  it("leaves nothing behind when the region is removed with toasts counting down", () => {
    leaks = trackLeaks();
    showToast({ message: "One" });
    showToast({ message: "Two", action: { label: "Undo", onClick: () => {} } });
    document.querySelector("fw-toast-region")!.remove();
    leaks.assertClean("toasts leaked", { strict: true });
  });
});

describe("above a modal", () => {
  it("moves into the innermost open modal, keeps counting down, and goes back home", async () => {
    await import("../dialog/index.js");
    document.body.innerHTML = `
      <main id="app"><fw-toast-region id="r"></fw-toast-region><p id="after"></p></main>
      <fw-dialog id="outer" heading="Outer"><fw-dialog id="inner" heading="Inner"></fw-dialog></fw-dialog>`;
    const region = document.getElementById("r")!;
    const outer = document.getElementById("outer") as HTMLElement & { show(): void; open: boolean };
    const inner = document.getElementById("inner") as HTMLElement & { show(): void; open: boolean };

    const handle = showToast({ message: "Saved", duration: 1000 });
    const toast = region.querySelector("fw-toast")!;
    vi.advanceTimersByTime(600);

    outer.show();
    // Inside the modal's flat tree, where a native modal leaves it clickable.
    expect(region.parentElement).toBe(outer);
    expect(region.getAttribute("slot")).toBe("fw-layer");
    expect(
      outer.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="fw-layer"]'),
    ).not.toBeNull();

    inner.show();
    expect(region.parentElement).toBe(inner);
    inner.open = false;
    expect(region.parentElement).toBe(outer);

    // 600ms had passed before the moves; the rest of the second runs out
    // instead of starting over.
    vi.advanceTimersByTime(450);
    expect(toast.isConnected).toBe(false);

    outer.open = false;
    expect(region.parentElement).toBe(document.getElementById("app"));
    expect(region.nextElementSibling).toBe(document.getElementById("after"));
    expect(region.hasAttribute("slot")).toBe(false);
    handle.dismiss();
  });

  it("follows a modal removed while open back out", async () => {
    await import("../dialog/index.js");
    document.body.innerHTML = `<fw-dialog id="d" heading="D"></fw-dialog>`;
    const dialog = document.getElementById("d") as HTMLElement & { show(): void };
    dialog.show();
    showToast({ message: "Saved", duration: 0 });
    const region = document.querySelector("fw-toast-region")!;
    expect(region.parentElement).toBe(dialog);
    dialog.remove();
    expect(region.parentElement).toBe(document.body);
    expect(region.querySelector("fw-toast")).not.toBeNull();
  });
});
