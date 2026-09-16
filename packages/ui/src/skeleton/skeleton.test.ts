import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwSkeleton } from "./skeleton.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwSkeleton {
  document.body.innerHTML = html;
  return document.querySelector("fw-skeleton")!;
}

const base = (el: FwSkeleton) => el.shadowRoot!.querySelector<HTMLElement>("[part~=base]")!;
const lines = (el: FwSkeleton) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>("[part~=line]"));

describe("fw-skeleton", () => {
  it("is hidden from assistive technology", () => {
    const el = mount(`<fw-skeleton></fw-skeleton>`);
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders one text line by default", () => {
    const el = mount(`<fw-skeleton></fw-skeleton>`);
    expect(el.shape).toBe("text");
    expect(lines(el)).toHaveLength(1);
    expect(lines(el)[0]!.classList.contains("short")).toBe(false);
  });

  it("renders several lines with the last one shorter", () => {
    const el = mount(`<fw-skeleton lines="3"></fw-skeleton>`);
    expect(el.lines).toBe(3);
    const bars = lines(el);
    expect(bars).toHaveLength(3);
    expect(bars.map((b) => b.classList.contains("short"))).toEqual([false, false, true]);
    el.lines = 2;
    expect(lines(el)).toHaveLength(2);
  });

  it("renders a single block for rect and circle", () => {
    const el = mount(`<fw-skeleton shape="rect" lines="4"></fw-skeleton>`);
    expect(lines(el)).toHaveLength(0);
    expect(el.shadowRoot!.querySelectorAll("[part~=block]")).toHaveLength(1);
    el.shape = "circle";
    expect(el.getAttribute("shape")).toBe("circle");
    expect(el.shadowRoot!.querySelectorAll("[part~=block]")).toHaveLength(1);
  });

  it("takes width and height, treating bare numbers as pixels", () => {
    const el = mount(`<fw-skeleton shape="rect" width="120" height="4rem"></fw-skeleton>`);
    expect(base(el).style.getPropertyValue("--_width")).toBe("120px");
    expect(base(el).style.getPropertyValue("--_block-height")).toBe("4rem");
    el.shape = "text";
    expect(base(el).style.getPropertyValue("--_height-line")).toBe("4rem");
    expect(base(el).style.getPropertyValue("--_block-height")).toBe("");
    el.width = null;
    expect(base(el).style.getPropertyValue("--_width")).toBe("");
  });

  it("drops the shimmer under reduced motion", () => {
    const el = mount(`<fw-skeleton></fw-skeleton>`);
    const css = (el.constructor as typeof FwSkeleton).styles;
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.line, \.block \{ animation: none;/,
    );
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-skeleton lines="2"></fw-skeleton>`);
    el.lines = 5;
    el.shape = "circle";
    el.remove();
    leaks.assertClean("fw-skeleton leaked");
  });
});
