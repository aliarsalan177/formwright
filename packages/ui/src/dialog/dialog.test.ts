import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetScrollLock } from "@formwright/ui-core";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwDialog, RequestCloseDetail } from "./dialog.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  resetScrollLock();
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount(attrs = "", content = "<p>Body</p>"): FwDialog {
  document.body.innerHTML = `<button id="opener">Open</button><fw-dialog heading="Renew" ${attrs}>${content}</fw-dialog><button id="outside">x</button>`;
  return document.querySelector("fw-dialog")!;
}
const shadow = <T extends Element = HTMLElement>(el: FwDialog, selector: string) =>
  el.shadowRoot!.querySelector<T & HTMLElement>(selector)!;
const dialogEl = (el: FwDialog) => shadow<HTMLDialogElement>(el, "dialog");
const panel = (el: FwDialog) => shadow(el, "[part~=panel]");
const closeButton = (el: FwDialog) => shadow<HTMLButtonElement>(el, "[part~=close-button]");
const isShown = (el: FwDialog) => dialogEl(el).hasAttribute("open");
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
// jsdom has no PointerEvent; the handlers only read button and composedPath().
const pointer = (target: Element, type: "pointerdown" | "pointerup") =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, button: 0 }));
const opener = () => document.getElementById("opener") as HTMLButtonElement;

describe("fw-dialog", () => {
  it("opens and closes from the open prop and attribute", () => {
    const el = mount();
    expect(isShown(el)).toBe(false);
    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    expect(isShown(el)).toBe(true);
    el.removeAttribute("open");
    expect(el.open).toBe(false);
    expect(isShown(el)).toBe(false);
  });

  it("opens with show() and closes with hide() through a request", () => {
    const el = mount();
    const onRequest = vi.fn((e: Event) => (e as CustomEvent<RequestCloseDetail>).detail.source);
    el.addEventListener("fw-request-close", onRequest);
    el.show();
    expect(isShown(el)).toBe(true);
    el.hide();
    expect(onRequest).toHaveReturnedWith("method");
    expect(el.open).toBe(false);
    expect(isShown(el)).toBe(false);
  });

  it("is labelled by its heading and names an alert dialog when not dismissible", () => {
    const el = mount();
    const dialog = dialogEl(el);
    const title = el.shadowRoot!.getElementById(dialog.getAttribute("aria-labelledby")!)!;
    expect(title.textContent).toBe("Renew");
    expect(dialog.hasAttribute("role")).toBe(false);
    el.dismissible = false;
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(closeButton(el).hidden).toBe(true);
  });

  it('reads dismissible="false" from markup', () => {
    const el = mount(`dismissible="false"`);
    expect(dialogEl(el).getAttribute("role")).toBe("alertdialog");
    expect(closeButton(el).hidden).toBe(true);
  });

  it("closes on Escape", () => {
    const el = mount(`open`, `<input id="field" />`);
    press(document.getElementById("field")!, "Escape");
    expect(el.open).toBe(false);
  });

  it("routes the native cancel event through the same request", () => {
    const el = mount(`open`);
    const sources: string[] = [];
    el.addEventListener("fw-request-close", (e) => {
      sources.push((e as CustomEvent<RequestCloseDetail>).detail.source);
    });
    const cancel = new Event("cancel", { cancelable: true });
    dialogEl(el).dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(sources).toEqual(["escape"]);
    expect(el.open).toBe(false);
  });

  it("ignores Escape and the backdrop when not dismissible, but hide() still works", () => {
    const el = mount(`open dismissible="false"`);
    press(panel(el), "Escape");
    dialogEl(el).dispatchEvent(new Event("cancel", { cancelable: true }));
    pointer(dialogEl(el), "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(el.open).toBe(true);
    el.hide();
    expect(el.open).toBe(false);
  });

  it("closes on a backdrop press that starts and ends outside the panel", () => {
    const el = mount(`open`);
    const sources: string[] = [];
    el.addEventListener("fw-request-close", (e) => {
      sources.push((e as CustomEvent<RequestCloseDetail>).detail.source);
    });
    pointer(dialogEl(el), "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(sources).toEqual(["backdrop"]);
    expect(el.open).toBe(false);
  });

  it("does not close when a press starts inside the panel and ends outside, or the reverse", () => {
    const el = mount(`open`, `<p id="text">Body</p>`);
    const text = document.getElementById("text")!;
    pointer(text, "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(el.open).toBe(true);
    pointer(dialogEl(el), "pointerdown");
    pointer(text, "pointerup");
    expect(el.open).toBe(true);
  });

  it("does not treat a press on content moved into its fw-layer slot as the backdrop", () => {
    const el = mount(`open`);
    const toast = document.createElement("div");
    toast.slot = "fw-layer";
    el.append(toast);
    pointer(toast, "pointerdown");
    pointer(toast, "pointerup");
    expect(el.open).toBe(true);
  });

  it("closes from the close button", () => {
    const el = mount(`open`);
    const onRequest = vi.fn((e: Event) => (e as CustomEvent<RequestCloseDetail>).detail.source);
    el.addEventListener("fw-request-close", onRequest);
    closeButton(el).click();
    expect(onRequest).toHaveReturnedWith("close-button");
    expect(el.open).toBe(false);
  });

  it("stays open when fw-request-close is cancelled", () => {
    const el = mount(`open`);
    el.addEventListener("fw-request-close", (e) => e.preventDefault());
    press(panel(el), "Escape");
    closeButton(el).click();
    pointer(dialogEl(el), "pointerdown");
    pointer(dialogEl(el), "pointerup");
    el.hide();
    expect(el.open).toBe(true);
    expect(isShown(el)).toBe(true);
  });

  it("fires show and hide events in order", () => {
    const el = mount();
    const events: string[] = [];
    for (const type of [
      "fw-show",
      "fw-after-show",
      "fw-request-close",
      "fw-hide",
      "fw-after-hide",
    ]) {
      el.addEventListener(type, () => events.push(type));
    }
    el.show();
    el.hide();
    expect(events).toEqual([
      "fw-show",
      "fw-after-show",
      "fw-request-close",
      "fw-hide",
      "fw-after-hide",
    ]);
  });

  it("does not fire request-close when closed through the open prop", () => {
    const el = mount(`open`);
    const onRequest = vi.fn();
    const onHide = vi.fn();
    el.addEventListener("fw-request-close", onRequest);
    el.addEventListener("fw-after-hide", onHide);
    el.open = false;
    expect(onRequest).not.toHaveBeenCalled();
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("moves focus in on open and returns it on close", () => {
    const el = mount(``, `<input id="first" /><button id="second">x</button>`);
    opener().focus();
    el.show();
    // The close button comes first in reading order.
    expect(el.shadowRoot!.activeElement).toBe(closeButton(el));
    el.hide();
    expect(document.activeElement).toBe(opener());
  });

  it("prefers [autofocus], and falls back to the panel when nothing is focusable", () => {
    const el = mount(``, `<input id="a" /><input id="b" autofocus />`);
    el.show();
    expect(document.activeElement).toBe(document.getElementById("b"));
    el.hide();

    const bare = mount(`dismissible="false"`, `<p>Nothing to focus</p>`);
    bare.show();
    expect(bare.shadowRoot!.activeElement).toBe(panel(bare));
  });

  it("locks page scroll once while open and releases it on close", () => {
    const el = mount();
    el.show();
    expect(document.body.style.position).toBe("fixed");
    // Toggling open again while open must not stack a second lock.
    el.open = true;
    el.hide();
    expect(document.body.style.position).toBe("");
    el.show();
    el.open = false;
    expect(document.body.style.position).toBe("");
  });

  it("hides the header with no-header and the footer when it is empty", () => {
    const el = mount(`no-header`);
    expect(shadow(el, "[part~=header]").hidden).toBe(true);
    expect(shadow(el, "[part~=footer]").hidden).toBe(true);
  });

  it("shows slotted footer and header content", async () => {
    const el = mount(``, `<span slot="header">Custom</span><button slot="footer">OK</button>`);
    await Promise.resolve();
    expect(shadow(el, "[part~=footer]").hidden).toBe(false);
    expect(dialogEl(el).getAttribute("aria-labelledby")).toBe(shadow(el, "[part~=title]").id);
  });

  it("finishes closing after the exit transition", () => {
    vi.useFakeTimers();
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((node: Element) => {
      const style = real(node);
      if (node.localName !== "dialog") return style;
      return Object.assign(Object.create(style) as CSSStyleDeclaration, {
        transitionDuration: "0.2s",
        transitionDelay: "0s",
      });
    });
    const el = mount();
    const afterShow = vi.fn();
    const afterHide = vi.fn();
    el.addEventListener("fw-after-show", afterShow);
    el.addEventListener("fw-after-hide", afterHide);
    el.show();
    expect(afterShow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(afterShow).toHaveBeenCalledTimes(1);

    el.hide();
    expect(dialogEl(el).hasAttribute("data-closing")).toBe(true);
    expect(isShown(el)).toBe(true);
    vi.advanceTimersByTime(200);
    expect(afterHide).toHaveBeenCalledTimes(1);
    expect(isShown(el)).toBe(false);
    expect(document.body.style.position).toBe("");
  });

  it("uses showModal and the native cancel path where the browser has them", () => {
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
    try {
      const el = mount(`open`);
      expect(isShown(el)).toBe(true);
      // Native mode leaves Escape keydown to the browser's cancel event.
      press(panel(el), "Escape");
      expect(el.open).toBe(true);
      dialogEl(el).dispatchEvent(new Event("cancel", { cancelable: true }));
      expect(el.open).toBe(false);
      expect(isShown(el)).toBe(false);
      expect(document.body.style.position).toBe("");
    } finally {
      delete proto.showModal;
      delete proto.close;
    }
  });

  it("releases the scroll lock when removed while open", () => {
    const el = mount(`open`);
    expect(document.body.style.position).toBe("fixed");
    el.remove();
    expect(document.body.style.position).toBe("");
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount(``, `<input />`);
    opener().focus();
    el.show();
    press(panel(el), "Tab");
    el.remove();
    // Not strict: jsdom's focus() queues a 0ms selection task of its own.
    leaks.assertClean("fw-dialog leaked");
    expect(document.body.style.position).toBe("");
    expect(opener().inert).toBe(false);
  });

  it("leaves nothing behind when removed mid-exit", () => {
    vi.useFakeTimers();
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((node: Element) => {
      const style = real(node);
      if (node.localName !== "dialog") return style;
      return Object.assign(Object.create(style) as CSSStyleDeclaration, {
        transitionDuration: "200ms",
        transitionDelay: "0s",
      });
    });
    leaks = trackLeaks();
    const el = mount();
    el.show();
    vi.advanceTimersByTime(200);
    el.hide();
    const afterHide = vi.fn();
    el.addEventListener("fw-after-hide", afterHide);
    el.remove();
    leaks.assertClean("fw-dialog leaked", { strict: true });
    vi.advanceTimersByTime(1000);
    expect(afterHide).not.toHaveBeenCalled();
    expect(document.body.style.position).toBe("");
  });
});
