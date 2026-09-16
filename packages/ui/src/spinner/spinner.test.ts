import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwSpinner } from "./spinner.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwSpinner {
  document.body.innerHTML = html;
  return document.querySelector("fw-spinner")!;
}

const part = (el: FwSpinner, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;

describe("fw-spinner", () => {
  it("is a status region that says Loading by default", () => {
    const el = mount(`<fw-spinner></fw-spinner>`);
    expect(part(el, "base").getAttribute("role")).toBe("status");
    expect(part(el, "label").textContent).toBe("Loading");
    expect(part(el, "label").classList.contains("sr-only")).toBe(true);
    expect(part(el, "indicator").getAttribute("aria-hidden")).toBe("true");
  });

  it("reads a custom label, falling back when cleared", () => {
    const el = mount(`<fw-spinner label="Loading members"></fw-spinner>`);
    expect(el.label).toBe("Loading members");
    expect(part(el, "label").textContent).toBe("Loading members");
    el.label = "Saving";
    expect(part(el, "label").textContent).toBe("Saving");
    el.label = "";
    expect(part(el, "label").textContent).toBe("Loading");
  });

  it("reflects size", () => {
    const el = mount(`<fw-spinner></fw-spinner>`);
    expect(el.size).toBe("md");
    el.size = "lg";
    expect(el.getAttribute("size")).toBe("lg");
    el.setAttribute("size", "sm");
    expect(el.size).toBe("sm");
  });

  it("stops spinning under reduced motion", () => {
    const el = mount(`<fw-spinner></fw-spinner>`);
    const css = (el.constructor as typeof FwSpinner).styles;
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.indicator \{ animation: none; \}/,
    );
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-spinner></fw-spinner>`);
    el.label = "Saving";
    el.remove();
    leaks.assertClean("fw-spinner leaked");
  });
});
