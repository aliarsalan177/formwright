import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwDivider } from "./divider.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwDivider {
  document.body.innerHTML = html;
  return document.querySelector("fw-divider")!;
}

const label = (el: FwDivider) => el.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-divider", () => {
  it("is a horizontal separator by default", () => {
    const el = mount(`<fw-divider></fw-divider>`);
    expect(el.getAttribute("role")).toBe("separator");
    expect(el.getAttribute("aria-orientation")).toBe("horizontal");
    expect(el.orientation).toBe("horizontal");
    expect(el.shadowRoot!.querySelectorAll("[part~=line]")).toHaveLength(2);
  });

  it("keeps orientation and aria-orientation in step", () => {
    const el = mount(`<fw-divider orientation="vertical"></fw-divider>`);
    expect(el.getAttribute("aria-orientation")).toBe("vertical");
    el.orientation = "horizontal";
    expect(el.getAttribute("orientation")).toBe("horizontal");
    expect(el.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("does not override a role the app set", () => {
    const el = mount(`<fw-divider role="presentation"></fw-divider>`);
    expect(el.getAttribute("role")).toBe("presentation");
  });

  it("hides the label area unless there is a label", async () => {
    const el = mount(`<fw-divider>or</fw-divider>`);
    expect(label(el).hidden).toBe(false);
    el.textContent = "";
    await tick();
    expect(label(el).hidden).toBe(true);

    const empty = mount(`<fw-divider>  </fw-divider>`);
    expect(label(empty).hidden).toBe(true);
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`<fw-divider>or</fw-divider>`);
    el.orientation = "vertical";
    el.append(document.createElement("b"));
    await tick();
    el.remove();
    leaks.assertClean("fw-divider leaked");
  });
});
