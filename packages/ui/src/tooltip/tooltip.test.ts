import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwTooltip } from "./tooltip.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.useRealTimers();
});

function mount(attrs = `content="Freeze membership"`, inner = ""): FwTooltip {
  document.body.innerHTML = `<fw-tooltip ${attrs}><button id="trigger">Freeze</button>${inner}</fw-tooltip><button id="outside">x</button>`;
  return document.querySelector("fw-tooltip")!;
}
const body = (el: FwTooltip) => el.shadowRoot!.querySelector<HTMLElement>("[part~=body]")!;
const byId = (id: string) => document.getElementById(id)!;
const pointer = (target: Element, type: string) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: type === "pointerdown", composed: true }));
const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));

describe("fw-tooltip", () => {
  it("renders a hidden role=tooltip with the content text and an arrow", () => {
    const el = mount();
    expect(body(el).getAttribute("role")).toBe("tooltip");
    expect(body(el).hidden).toBe(true);
    expect(body(el).textContent).toBe("Freeze membership");
    expect(el.shadowRoot!.querySelector("[part~=arrow]")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("slot:not([name])")).not.toBeNull();
  });

  it("has defaults and reflects open and disabled", () => {
    const el = mount();
    expect(el.placement).toBe("top");
    expect(el.delay).toBe(400);
    expect(el.hideDelay).toBe(100);
    el.setAttribute("hide-delay", "250");
    expect(el.hideDelay).toBe(250);
    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    expect(body(el).hidden).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.open).toBe(false);
  });

  it("mirrors its text into aria-description on the trigger and keeps it current", () => {
    const el = mount();
    expect(byId("trigger").getAttribute("aria-description")).toBe("Freeze membership");
    el.content = "Pause membership";
    expect(byId("trigger").getAttribute("aria-description")).toBe("Pause membership");
    el.content = null;
    expect(byId("trigger").hasAttribute("aria-description")).toBe(false);
  });

  it("prefers slotted content, following edits to it", async () => {
    const el = mount(``, `<span slot="content" id="rich">Personal <b>training</b></span>`);
    expect(el.text).toBe("Personal training");
    expect(byId("trigger").getAttribute("aria-description")).toBe("Personal training");
    byId("rich").textContent = "Group class";
    await new Promise((r) => setTimeout(r, 0));
    expect(byId("trigger").getAttribute("aria-description")).toBe("Group class");
  });

  it("removes aria-description from the trigger when it leaves the page", () => {
    const el = mount();
    const trigger = byId("trigger");
    el.remove();
    expect(trigger.hasAttribute("aria-description")).toBe(false);
  });

  it("shows after the hover delay and hides after the hide delay", () => {
    vi.useFakeTimers();
    const el = mount(`content="Hint" delay="300"`);
    const onShow = vi.fn();
    const onHide = vi.fn();
    el.addEventListener("fw-show", onShow);
    el.addEventListener("fw-hide", onHide);

    pointer(el, "pointerenter");
    vi.advanceTimersByTime(299);
    expect(el.open).toBe(false);
    vi.advanceTimersByTime(1);
    expect(el.open).toBe(true);
    expect(onShow).toHaveBeenCalledTimes(1);

    pointer(el, "pointerleave");
    vi.advanceTimersByTime(99);
    expect(el.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.open).toBe(false);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("does not show when the pointer leaves before the delay", () => {
    vi.useFakeTimers();
    const el = mount();
    pointer(el, "pointerenter");
    vi.advanceTimersByTime(200);
    pointer(el, "pointerleave");
    vi.advanceTimersByTime(1000);
    expect(el.open).toBe(false);
  });

  it("stays open while the pointer moves onto the tooltip itself", () => {
    vi.useFakeTimers();
    const el = mount();
    pointer(el, "pointerenter");
    vi.advanceTimersByTime(400);
    pointer(el, "pointerleave");
    vi.advanceTimersByTime(50);
    pointer(body(el), "pointerenter");
    vi.advanceTimersByTime(1000);
    expect(el.open).toBe(true);
  });

  it("shows at once on keyboard focus and hides on blur, without taking focus", () => {
    const el = mount();
    byId("trigger").focus();
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(byId("trigger"));
    byId("outside").focus();
    expect(el.open).toBe(false);
  });

  it("hides on Escape without letting it close an enclosing dialog", () => {
    const el = mount();
    const outer = vi.fn();
    document.body.addEventListener("keydown", outer);
    byId("trigger").focus();
    press(byId("trigger"), "Escape");
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(byId("trigger"));
    expect(outer).not.toHaveBeenCalled();

    // Closed, Escape is none of its business.
    press(byId("trigger"), "Escape");
    expect(outer).toHaveBeenCalledTimes(1);
    document.body.removeEventListener("keydown", outer);
  });

  it("hides on Escape pressed anywhere while hover-shown", () => {
    vi.useFakeTimers();
    const el = mount();
    pointer(el, "pointerenter");
    vi.advanceTimersByTime(400);
    press(byId("outside"), "Escape");
    expect(el.open).toBe(false);
  });

  it("hides on a press outside", () => {
    const el = mount();
    el.open = true;
    pointer(byId("trigger"), "pointerdown");
    expect(el.open).toBe(true);
    pointer(byId("outside"), "pointerdown");
    expect(el.open).toBe(false);
  });

  it("is suppressed while disabled", () => {
    vi.useFakeTimers();
    const el = mount(`content="Hint" disabled`);
    pointer(el, "pointerenter");
    vi.advanceTimersByTime(1000);
    byId("trigger").focus();
    expect(el.open).toBe(false);
    expect(body(el).hidden).toBe(true);
  });

  it("does not fire a pending show after removal", () => {
    vi.useFakeTimers();
    const el = mount();
    pointer(el, "pointerenter");
    el.remove();
    vi.advanceTimersByTime(1000);
    expect(el.open).toBe(false);
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount();
    pointer(el, "pointerenter");
    el.open = true;
    pointer(el, "pointerleave");
    el.remove();
    leaks.assertClean("fw-tooltip leaked", { strict: true });
  });
});
