import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwProgress } from "./progress.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwProgress {
  document.body.innerHTML = html;
  return document.querySelector("fw-progress")!;
}

const part = (el: FwProgress, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;

describe("fw-progress", () => {
  it("is a named progressbar with its value", () => {
    const el = mount(`<fw-progress label="Upload" value="40"></fw-progress>`);
    const bar = part(el, "base");
    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("aria-label")).toBe("Upload");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(bar.style.getPropertyValue("--_percent")).toBe("40%");
  });

  it("is indeterminate without a value, omitting aria-valuenow", () => {
    const el = mount(`<fw-progress label="Syncing"></fw-progress>`);
    const bar = part(el, "base");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.hasAttribute("data-indeterminate")).toBe(true);

    el.value = 10;
    expect(bar.getAttribute("aria-valuenow")).toBe("10");
    expect(bar.hasAttribute("data-indeterminate")).toBe(false);

    el.indeterminate = true;
    expect(el.hasAttribute("indeterminate")).toBe(true);
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);

    el.indeterminate = false;
    el.setAttribute("value", "5");
    expect(bar.getAttribute("aria-valuenow")).toBe("5");
    el.removeAttribute("value");
    expect(el.value).toBeNull();
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
  });

  it("clamps the value and honours max", () => {
    const el = mount(`<fw-progress value="7" max="12"></fw-progress>`);
    const bar = part(el, "base");
    expect(bar.getAttribute("aria-valuemax")).toBe("12");
    expect(bar.getAttribute("aria-valuetext")).toBe("58%");
    el.value = 50;
    expect(bar.getAttribute("aria-valuenow")).toBe("12");
    el.value = -3;
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("shows the percentage only with show-value", () => {
    const el = mount(`<fw-progress value="33.4"></fw-progress>`);
    expect(part(el, "value").hidden).toBe(true);
    el.showValue = true;
    expect(el.hasAttribute("show-value")).toBe(true);
    expect(part(el, "value").hidden).toBe(false);
    expect(part(el, "value").textContent).toBe("33%");
  });

  it("draws a ring for the circular variant", () => {
    const el = mount(`<fw-progress variant="circular" value="25" show-value></fw-progress>`);
    expect(part(el, "track").hidden).toBe(true);
    expect(part(el, "circle").hidden).toBe(false);
    const indicator = el.shadowRoot!.querySelector("[part~=circle-indicator]")!;
    expect(indicator.getAttribute("stroke-dashoffset")).toBe("75");
    expect(part(el, "circle").contains(part(el, "value"))).toBe(true);

    el.variant = "linear";
    expect(el.getAttribute("variant")).toBe("linear");
    expect(part(el, "track").hidden).toBe(false);
    expect(part(el, "circle").hidden).toBe(true);
    expect(part(el, "circle").contains(part(el, "value"))).toBe(false);
  });

  it("reflects tone and size", () => {
    const el = mount(`<fw-progress tone="danger"></fw-progress>`);
    expect(el.tone).toBe("danger");
    el.size = "lg";
    expect(el.getAttribute("size")).toBe("lg");
  });

  it("stays still under reduced motion", () => {
    const el = mount(`<fw-progress></fw-progress>`);
    const css = (el.constructor as typeof FwProgress).styles;
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).toContain(".indicator { animation: none;");
    expect(reduced).toContain(".circle svg { animation: none; }");
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-progress value="10"></fw-progress>`);
    el.value = 90;
    el.variant = "circular";
    el.remove();
    leaks.assertClean("fw-progress leaked");
  });
});
