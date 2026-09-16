import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwButton } from "./button.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwButton {
  document.body.innerHTML = html;
  return document.querySelector("fw-button")!;
}

const base = (el: FwButton) => el.shadowRoot!.querySelector<HTMLElement>("[part~=base]")!;

describe("fw-button", () => {
  it("renders a real button with the label slotted in", () => {
    const el = mount(`<fw-button>Save</fw-button>`);
    expect(base(el).tagName).toBe("BUTTON");
    expect(el.shadowRoot!.querySelector("slot:not([name])")).not.toBeNull();
    expect(el.textContent).toBe("Save");
  });

  it("keeps attribute, property and styling hook in step", () => {
    const el = mount(`<fw-button variant="secondary">x</fw-button>`);
    expect(el.variant).toBe("secondary");
    el.variant = "danger";
    // Reflected, so :host([variant="danger"]) styles apply.
    expect(el.getAttribute("variant")).toBe("danger");
    el.setAttribute("size", "sm");
    expect(el.size).toBe("sm");
  });

  it("picks up a property set before the element was defined", async () => {
    const early = document.createElement("fw-late-button") as HTMLElement & { variant?: string };
    early.variant = "ghost";
    const { FwButton } = await import("./button.js");
    const { define } = await import("../core/element.js");
    class Late extends FwButton {}
    define("fw-late-button", Late);
    customElements.upgrade(early);
    document.body.append(early);
    expect(early.getAttribute("variant")).toBe("ghost");
  });

  it("becomes a link when given an href, keeping its content", () => {
    const el = mount(`<fw-button href="/members">Members</fw-button>`);
    const link = base(el) as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/members");
    expect(link.querySelector("slot:not([name])")).not.toBeNull();

    el.href = null;
    expect(base(el).tagName).toBe("BUTTON");
  });

  it("protects a new tab from window.opener by default", () => {
    const el = mount(`<fw-button href="https://example.com" target="_blank">x</fw-button>`);
    expect((base(el) as HTMLAnchorElement).rel).toBe("noopener noreferrer");
  });

  it("blocks clicks while loading and says it is busy", () => {
    const el = mount(`<fw-button loading>Saving</fw-button>`);
    const handler = vi.fn();
    el.addEventListener("click", handler);

    base(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(handler).not.toHaveBeenCalled();
    expect(base(el).getAttribute("aria-busy")).toBe("true");
    expect(el.shadowRoot!.querySelector<HTMLElement>("[part~=spinner]")!.hidden).toBe(false);
  });

  it("disables the inner button", () => {
    const el = mount(`<fw-button disabled>x</fw-button>`);
    expect((base(el) as HTMLButtonElement).disabled).toBe(true);
    el.disabled = false;
    expect((base(el) as HTMLButtonElement).disabled).toBe(false);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-button href="/x" loading>x</fw-button>`);
    el.loading = false;
    el.remove();
    leaks.assertClean("fw-button leaked");
  });

  it("rebinds when moved, rather than going dead", () => {
    const el = mount(`<fw-button>x</fw-button>`);
    const other = document.createElement("div");
    document.body.append(other);
    other.append(el);
    el.disabled = true;
    expect((base(el) as HTMLButtonElement).disabled).toBe(true);
  });
});
