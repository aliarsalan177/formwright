import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetScrollLock } from "@formwright/ui-core";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwDrawer, RequestCloseDetail } from "./drawer.js";

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

function mount(attrs = "", content = `<p id="text">Filters</p>`): FwDrawer {
  document.body.innerHTML = `<button id="opener">Open</button><fw-drawer heading="Filters" ${attrs}>${content}</fw-drawer>`;
  return document.querySelector("fw-drawer")!;
}
const dialogEl = (el: FwDrawer) => el.shadowRoot!.querySelector("dialog")!;
const panel = (el: FwDrawer) => el.shadowRoot!.querySelector<HTMLElement>("[part~=panel]")!;
const closeButton = (el: FwDrawer) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>("[part~=close-button]")!;
const isShown = (el: FwDrawer) => dialogEl(el).hasAttribute("open");
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const pointer = (target: Element, type: "pointerdown" | "pointerup") =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, button: 0 }));
const opener = () => document.getElementById("opener") as HTMLButtonElement;
const sourcesOf = (el: FwDrawer) => {
  const sources: string[] = [];
  el.addEventListener("fw-request-close", (e) => {
    sources.push((e as CustomEvent<RequestCloseDetail>).detail.source);
  });
  return sources;
};

describe("fw-drawer", () => {
  it("defaults to the end edge and reflects placement", () => {
    const el = mount();
    expect(el.placement).toBe("end");
    el.placement = "bottom";
    expect(el.getAttribute("placement")).toBe("bottom");
  });

  it("maps size onto a custom property, and clears it again", () => {
    const el = mount(`size="30rem"`);
    expect(dialogEl(el).style.getPropertyValue("--_size")).toBe("30rem");
    el.size = null;
    expect(dialogEl(el).style.getPropertyValue("--_size")).toBe("");
  });

  it("opens and closes from the prop and the methods", () => {
    const el = mount();
    el.open = true;
    expect(isShown(el)).toBe(true);
    el.open = false;
    expect(isShown(el)).toBe(false);
    el.show();
    expect(el.hasAttribute("open")).toBe(true);
    const sources = sourcesOf(el);
    el.hide();
    expect(sources).toEqual(["method"]);
    expect(isShown(el)).toBe(false);
  });

  it("closes on Escape and on the close button", () => {
    const el = mount(`open`);
    const sources = sourcesOf(el);
    press(panel(el), "Escape");
    expect(el.open).toBe(false);
    el.show();
    closeButton(el).click();
    expect(el.open).toBe(false);
    expect(sources).toEqual(["escape", "close-button"]);
  });

  it("closes on a backdrop press only when it starts and ends outside the panel", () => {
    const el = mount(`open`);
    const sources = sourcesOf(el);
    pointer(document.getElementById("text")!, "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(el.open).toBe(true);
    pointer(dialogEl(el), "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(el.open).toBe(false);
    expect(sources).toEqual(["backdrop"]);
  });

  it("stays open when the request is cancelled, and when not dismissible", () => {
    const el = mount(`open`);
    el.addEventListener("fw-request-close", (e) => e.preventDefault());
    press(panel(el), "Escape");
    pointer(dialogEl(el), "pointerdown");
    pointer(dialogEl(el), "pointerup");
    expect(el.open).toBe(true);

    const alert = mount(`open dismissible="false"`);
    const sources = sourcesOf(alert);
    press(panel(alert), "Escape");
    expect(alert.open).toBe(true);
    expect(sources).toEqual([]);
    expect(dialogEl(alert).getAttribute("role")).toBe("alertdialog");
  });

  it("fires its lifecycle events", () => {
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

  it("focuses inside on open and returns focus on close", () => {
    const el = mount(`no-header`, `<input id="first" />`);
    opener().focus();
    el.show();
    expect(document.activeElement).toBe(document.getElementById("first"));
    press(panel(el), "Escape");
    expect(document.activeElement).toBe(opener());
  });

  it("marks the page behind inert in the fallback, and restores it", () => {
    const el = mount();
    el.show();
    expect(opener().inert).toBe(true);
    el.hide();
    expect(opener().inert).toBe(false);
  });

  it("locks scroll while open, balanced across repeated opens", () => {
    const el = mount();
    for (let i = 0; i < 3; i += 1) {
      el.show();
      expect(document.body.style.position).toBe("fixed");
      el.hide();
      expect(document.body.style.position).toBe("");
    }
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount(`size="20rem"`, `<input />`);
    opener().focus();
    el.show();
    el.remove();
    // Not strict: jsdom's focus() queues a 0ms selection task of its own.
    leaks.assertClean("fw-drawer leaked");
    expect(document.body.style.position).toBe("");
    expect(opener().inert).toBe(false);
  });
});
