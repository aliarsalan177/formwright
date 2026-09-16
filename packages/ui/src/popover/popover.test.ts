import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwPopover } from "./popover.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.useRealTimers();
});

const CONTENT = `
  <button slot="trigger" id="trigger">Actions</button>
  <p>Freeze this membership?</p>
  <button id="first">Freeze</button>
  <button id="second">Cancel</button>
`;

function mount(attrs = "", content = CONTENT): FwPopover {
  document.body.innerHTML = `<fw-popover ${attrs}>${content}</fw-popover><button id="outside">x</button>`;
  return document.querySelector("fw-popover")!;
}
const panel = (el: FwPopover) => el.shadowRoot!.querySelector<HTMLElement>("[part~=panel]")!;
const arrow = (el: FwPopover) => el.shadowRoot!.querySelector<HTMLElement>("[part~=arrow]")!;
const byId = (id: string) => document.getElementById(id)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const pointer = (target: Element, type: string) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: type === "pointerdown", composed: true }));

describe("fw-popover", () => {
  it("renders a hidden dialog panel with the content slotted in", () => {
    const el = mount(`label="Member actions"`);
    const p = panel(el);
    expect(p.getAttribute("role")).toBe("dialog");
    expect(p.getAttribute("aria-label")).toBe("Member actions");
    expect(p.hidden).toBe(true);
    expect(p.querySelector("slot:not([name])")).not.toBeNull();
    expect(el.shadowRoot!.querySelector('slot[name="trigger"]')).not.toBeNull();
  });

  it("reflects props and has sensible defaults", () => {
    const el = mount();
    expect(el.placement).toBe("bottom");
    expect(el.trigger).toBe("click");
    expect(el.offset).toBe(8);
    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    el.arrow = true;
    expect(el.hasAttribute("arrow")).toBe(true);
    expect(arrow(el).hidden).toBe(false);
    el.label = null;
    expect(panel(el).hasAttribute("aria-label")).toBe(false);
  });

  it("marks the slotted trigger with aria-haspopup and aria-expanded", () => {
    const el = mount();
    const t = byId("trigger");
    expect(t.getAttribute("aria-haspopup")).toBe("dialog");
    expect(t.getAttribute("aria-expanded")).toBe("false");
    el.open = true;
    expect(t.getAttribute("aria-expanded")).toBe("true");
  });

  it("toggles on click, moving focus into the content and back", () => {
    const el = mount();
    const onShow = vi.fn();
    const onHide = vi.fn();
    el.addEventListener("fw-show", onShow);
    el.addEventListener("fw-hide", onHide);

    byId("trigger").focus();
    byId("trigger").click();
    expect(el.open).toBe(true);
    expect(panel(el).hidden).toBe(false);
    expect(document.activeElement).toBe(byId("first"));
    expect(onShow).toHaveBeenCalledTimes(1);

    el.hide();
    expect(el.open).toBe(false);
    expect(panel(el).hidden).toBe(true);
    expect(document.activeElement).toBe(byId("trigger"));
    expect(onHide).toHaveBeenCalledTimes(1);

    byId("trigger").click();
    byId("trigger").focus();
    byId("trigger").click();
    expect(el.open).toBe(false);
  });

  it("leaves focus alone when there is nothing focusable inside", () => {
    const el = mount("", `<button slot="trigger" id="trigger">Info</button><p>Just text</p>`);
    byId("trigger").focus();
    byId("trigger").click();
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(byId("trigger"));
  });

  it("closes on Escape, returns focus, and does not let Escape reach an enclosing dialog", () => {
    const el = mount();
    const outer = vi.fn();
    document.body.addEventListener("keydown", outer);
    byId("trigger").click();
    expect(document.activeElement).toBe(byId("first"));

    press(byId("first"), "Escape");
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(byId("trigger"));
    expect(outer).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", outer);
  });

  it("closes on a press outside, but not on a press inside", () => {
    const el = mount();
    byId("trigger").click();
    pointer(byId("first"), "pointerdown");
    pointer(panel(el), "pointerdown");
    expect(el.open).toBe(true);
    pointer(byId("outside"), "pointerdown");
    expect(el.open).toBe(false);
  });

  it("closes when focus tabs away", () => {
    const el = mount();
    byId("trigger").click();
    byId("first").dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, composed: true, relatedTarget: byId("outside") }),
    );
    expect(el.open).toBe(false);
  });

  it("opens on hover after a delay and stays open while the pointer crosses into the panel", () => {
    vi.useFakeTimers();
    const el = mount(`trigger="hover"`);
    byId("trigger").click();
    expect(el.open).toBe(false);

    pointer(el, "pointerenter");
    expect(el.open).toBe(false);
    vi.advanceTimersByTime(200);
    expect(el.open).toBe(true);

    // Leaves the trigger, crosses the gap, enters the panel within the grace period.
    pointer(el, "pointerleave");
    vi.advanceTimersByTime(100);
    pointer(panel(el), "pointerenter");
    vi.advanceTimersByTime(500);
    expect(el.open).toBe(true);

    pointer(panel(el), "pointerleave");
    vi.advanceTimersByTime(500);
    expect(el.open).toBe(false);
  });

  it("opens on focus in hover mode, without stealing focus", () => {
    vi.useFakeTimers();
    const el = mount(`trigger="hover"`);
    byId("trigger").focus();
    vi.advanceTimersByTime(200);
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(byId("trigger"));
  });

  it("follows focus in focus mode", () => {
    const el = mount(`trigger="focus"`);
    byId("trigger").focus();
    expect(el.open).toBe(true);
    byId("first").focus();
    expect(el.open).toBe(true);
    byId("outside").focus();
    expect(el.open).toBe(false);
  });

  it("ignores clicks and outside presses in manual mode", () => {
    const el = mount(`trigger="manual"`);
    byId("trigger").click();
    expect(el.open).toBe(false);
    el.show();
    pointer(byId("outside"), "pointerdown");
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
  });

  it("closes on Escape pressed elsewhere on the page", () => {
    const el = mount(`trigger="manual"`);
    el.show();
    press(byId("outside"), "Escape");
    expect(el.open).toBe(false);
  });

  it("repositions without re-announcing when placement changes while open", () => {
    const el = mount(`arrow`);
    const onShow = vi.fn();
    el.addEventListener("fw-show", onShow);
    el.show();
    el.placement = "top";
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(panel(el).dataset.placement).toBeDefined();
  });

  it("does not let a pending hover delay fire after removal", () => {
    vi.useFakeTimers();
    const el = mount(`trigger="hover"`);
    pointer(el, "pointerenter");
    el.remove();
    vi.advanceTimersByTime(500);
    expect(el.open).toBe(false);
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount(`trigger="hover" arrow`);
    el.show();
    pointer(el, "pointerleave");
    el.remove();
    leaks.assertClean("fw-popover leaked", { strict: true });
  });

  it("removes its ARIA state from the trigger when disconnected", () => {
    const el = mount();
    const t = byId("trigger");
    el.remove();
    expect(t.hasAttribute("aria-expanded")).toBe(false);
    expect(t.hasAttribute("aria-haspopup")).toBe(false);
  });
});
