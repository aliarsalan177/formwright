import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwBadge } from "./badge.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwBadge {
  document.body.innerHTML = html;
  return document.querySelector("fw-badge")!;
}

const part = (el: FwBadge, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;

describe("fw-badge", () => {
  it("renders its text through the default slot", () => {
    const el = mount(`<fw-badge>Active</fw-badge>`);
    expect(part(el, "label").querySelector("slot:not([name])")).not.toBeNull();
    expect(el.textContent).toBe("Active");
  });

  it("has sensible defaults", () => {
    const el = mount(`<fw-badge>x</fw-badge>`);
    expect(el.tone).toBe("neutral");
    expect(el.variant).toBe("soft");
    expect(el.size).toBe("md");
    expect(el.dot).toBe(false);
  });

  it("keeps tone, variant and size in step with their attributes", () => {
    const el = mount(`<fw-badge tone="success">x</fw-badge>`);
    expect(el.tone).toBe("success");
    el.tone = "danger";
    expect(el.getAttribute("tone")).toBe("danger");
    el.variant = "solid";
    expect(el.getAttribute("variant")).toBe("solid");
    el.setAttribute("size", "sm");
    expect(el.size).toBe("sm");
  });

  it("shows a decorative dot only when asked", () => {
    const el = mount(`<fw-badge>x</fw-badge>`);
    const dot = part(el, "dot");
    expect(dot.hidden).toBe(true);
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    el.dot = true;
    expect(el.hasAttribute("dot")).toBe(true);
    expect(dot.hidden).toBe(false);
    el.removeAttribute("dot");
    expect(dot.hidden).toBe(true);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-badge dot>x</fw-badge>`);
    el.dot = false;
    el.remove();
    leaks.assertClean("fw-badge leaked");
  });
});
