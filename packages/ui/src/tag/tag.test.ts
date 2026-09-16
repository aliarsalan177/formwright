import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwTag } from "./tag.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwTag {
  document.body.innerHTML = html;
  return document.querySelector("fw-tag")!;
}

const removeButton = (el: FwTag) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>("[part~=remove]")!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-tag", () => {
  it("renders text and a prefix slot", () => {
    const el = mount(`<fw-tag><span slot="prefix">*</span>Cardio</fw-tag>`);
    expect(el.shadowRoot!.querySelector('slot[name="prefix"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector("[part~=label] slot:not([name])")).not.toBeNull();
  });

  it("keeps attributes and properties in step", () => {
    const el = mount(`<fw-tag tone="accent">x</fw-tag>`);
    expect(el.tone).toBe("accent");
    el.size = "sm";
    expect(el.getAttribute("size")).toBe("sm");
    el.removable = true;
    expect(el.hasAttribute("removable")).toBe(true);
    el.setAttribute("disabled", "");
    expect(el.disabled).toBe(true);
  });

  it("only shows the remove button when removable", () => {
    const el = mount(`<fw-tag>Cardio</fw-tag>`);
    expect(removeButton(el).hidden).toBe(true);
    el.removable = true;
    expect(removeButton(el).hidden).toBe(false);
    expect(removeButton(el).tagName).toBe("BUTTON");
  });

  it("names the remove button after the tag text, ignoring the prefix", async () => {
    const el = mount(`<fw-tag removable><span slot="prefix">icon</span> Evening   batch </fw-tag>`);
    expect(removeButton(el).getAttribute("aria-label")).toBe("Remove Evening batch");
    el.lastChild!.textContent = "Morning";
    await tick();
    expect(removeButton(el).getAttribute("aria-label")).toBe("Remove Morning");
  });

  it("emits a cancelable fw-remove and hides itself", () => {
    const el = mount(`<fw-tag removable>Cardio</fw-tag>`);
    const handler = vi.fn();
    el.addEventListener("fw-remove", handler);
    removeButton(el).click();
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as Event;
    expect(event.cancelable).toBe(true);
    expect(event.bubbles).toBe(true);
    expect(el.hidden).toBe(true);
  });

  it("stays visible when fw-remove is prevented", () => {
    const el = mount(`<fw-tag removable>Cardio</fw-tag>`);
    el.addEventListener("fw-remove", (e) => e.preventDefault());
    removeButton(el).click();
    expect(el.hidden).toBe(false);
  });

  it("cannot be removed while disabled", () => {
    const el = mount(`<fw-tag removable disabled>Cardio</fw-tag>`);
    const handler = vi.fn();
    el.addEventListener("fw-remove", handler);
    expect(removeButton(el).disabled).toBe(true);
    expect(el.getAttribute("aria-disabled")).toBe("true");
    removeButton(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(handler).not.toHaveBeenCalled();
    expect(el.hidden).toBe(false);
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`<fw-tag removable>Cardio</fw-tag>`);
    el.addEventListener("fw-remove", (e) => e.preventDefault());
    removeButton(el).click();
    el.textContent = "Yoga";
    await tick();
    el.remove();
    leaks.assertClean("fw-tag leaked");
  });
});
