import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwEmptyState } from "./empty-state.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwEmptyState {
  document.body.innerHTML = html;
  return document.querySelector("fw-empty-state")!;
}

const part = (el: FwEmptyState, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-empty-state", () => {
  it("renders heading, description, icon and actions", () => {
    const el = mount(`<fw-empty-state heading="No members yet">
      <svg slot="icon"></svg>
      Members you register will appear here.
      <button slot="actions">Register</button>
    </fw-empty-state>`);
    expect(part(el, "heading").hidden).toBe(false);
    expect(part(el, "heading").textContent).toBe("No members yet");
    expect(part(el, "description").hidden).toBe(false);
    expect(part(el, "icon").hidden).toBe(false);
    expect(part(el, "icon").getAttribute("aria-hidden")).toBe("true");
    expect(part(el, "actions").hidden).toBe(false);
  });

  it("collapses areas with no content", () => {
    const el = mount(`<fw-empty-state></fw-empty-state>`);
    for (const name of ["icon", "heading", "description", "actions"]) {
      expect(part(el, name).hidden).toBe(true);
    }
  });

  it("uses a slotted heading in place of the attribute", async () => {
    const el = mount(`<fw-empty-state><h3 slot="heading">No results</h3></fw-empty-state>`);
    expect(part(el, "heading").hidden).toBe(false);
    el.querySelector("h3")!.remove();
    await tick();
    expect(part(el, "heading").hidden).toBe(true);
  });

  it("keeps heading and size in step with their attributes", () => {
    const el = mount(`<fw-empty-state size="sm"></fw-empty-state>`);
    expect(el.size).toBe("sm");
    el.size = "md";
    expect(el.getAttribute("size")).toBe("md");
    el.heading = "Nothing here";
    expect(part(el, "heading").hidden).toBe(false);
    expect(part(el, "heading").textContent).toBe("Nothing here");
    el.setAttribute("heading", "Still nothing");
    expect(el.heading).toBe("Still nothing");
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`<fw-empty-state heading="x">desc</fw-empty-state>`);
    const button = document.createElement("button");
    button.slot = "actions";
    el.append(button);
    await tick();
    el.remove();
    leaks.assertClean("fw-empty-state leaked");
  });
});
