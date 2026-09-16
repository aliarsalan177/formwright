import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwAccordion } from "./accordion.js";
import type { FwAccordionItem } from "./accordion-item.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const ITEMS = `
  <fw-accordion-item id="a" heading="Membership">Plans <input id="inside"></fw-accordion-item>
  <fw-accordion-item id="b" heading="Hours">Six to eleven</fw-accordion-item>
  <fw-accordion-item id="c" heading="Training" disabled>Coaches</fw-accordion-item>
  <fw-accordion-item id="d"><span slot="heading">Rich <b>heading</b></span>Content</fw-accordion-item>
`;

function mount(attrs = "", items = ITEMS): FwAccordion {
  document.body.innerHTML = `<fw-accordion ${attrs}>${items}</fw-accordion>`;
  return document.querySelector("fw-accordion")!;
}
const item = (id: string) => document.getElementById(id) as FwAccordionItem;
const header = (i: FwAccordionItem) =>
  i.shadowRoot!.querySelector<HTMLButtonElement>("[part~=header]")!;
const region = (i: FwAccordionItem) => i.shadowRoot!.querySelector<HTMLElement>("[part~=region]")!;
const headingEl = (i: FwAccordionItem) =>
  i.shadowRoot!.querySelector<HTMLElement>("[part~=heading]")!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const focused = (i: FwAccordionItem) => i.shadowRoot!.activeElement === header(i);
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-accordion", () => {
  it("renders a real button header and a labelled region in the item's shadow root", () => {
    mount();
    const a = item("a");
    const h = header(a);
    const r = region(a);
    expect(h.tagName).toBe("BUTTON");
    expect(h.textContent).toContain("Membership");
    expect(h.getAttribute("aria-expanded")).toBe("false");
    expect(h.getAttribute("aria-controls")).toBe(r.id);
    expect(r.getAttribute("role")).toBe("region");
    expect(r.getAttribute("aria-labelledby")).toBe(h.id);
    expect(a.shadowRoot!.getElementById(r.id)).toBe(r);
  });

  it("wraps the header in a heading at the accordion's level", () => {
    const el = mount(`heading-level="2"`);
    expect(headingEl(item("a")).getAttribute("role")).toBe("heading");
    expect(headingEl(item("a")).getAttribute("aria-level")).toBe("2");
    el.headingLevel = 5;
    expect(headingEl(item("b")).getAttribute("aria-level")).toBe("5");
    el.headingLevel = 9;
    expect(headingEl(item("b")).getAttribute("aria-level")).toBe("6");
  });

  it("defaults to heading level 3", () => {
    mount();
    expect(headingEl(item("a")).getAttribute("aria-level")).toBe("3");
  });

  it("uses the heading slot when given one", () => {
    mount();
    const slot = item("d").shadowRoot!.querySelector<HTMLSlotElement>("slot[name=heading]")!;
    expect(slot.assignedElements()[0]!.textContent).toBe("Rich heading");
  });

  it("opens and closes on click, reflecting open and emitting fw-show / fw-hide", () => {
    mount();
    const a = item("a");
    const onShow = vi.fn();
    const onHide = vi.fn();
    a.addEventListener("fw-show", onShow);
    a.addEventListener("fw-hide", onHide);

    header(a).click();
    expect(a.open).toBe(true);
    expect(a.hasAttribute("open")).toBe(true);
    expect(header(a).getAttribute("aria-expanded")).toBe("true");
    expect(region(a).hasAttribute("inert")).toBe(false);
    expect(onShow).toHaveBeenCalledTimes(1);

    header(a).click();
    expect(a.open).toBe(false);
    expect(region(a).hasAttribute("inert")).toBe(true);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("keeps attribute and property in step", () => {
    mount();
    const b = item("b");
    b.setAttribute("open", "");
    expect(b.open).toBe(true);
    b.open = false;
    expect(b.hasAttribute("open")).toBe(false);
  });

  it("closes the others when one opens, emitting one change", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    header(item("a")).click();
    header(item("b")).click();
    expect(item("a").open).toBe(false);
    expect(item("b").open).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("lets several stay open with multiple", () => {
    mount(`multiple`);
    header(item("a")).click();
    header(item("b")).click();
    expect(item("a").open).toBe(true);
    expect(item("b").open).toBe(true);
  });

  it("does not toggle a disabled item", () => {
    mount();
    const c = item("c");
    expect(header(c).disabled).toBe(true);
    c.shadowRoot!.querySelector<HTMLButtonElement>("[part~=header]")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    expect(c.open).toBe(false);
  });

  it("moves focus between headers with arrows, Home and End, skipping disabled", () => {
    mount();
    header(item("a")).focus();
    press(header(item("a")), "ArrowDown");
    expect(focused(item("b"))).toBe(true);
    press(header(item("b")), "ArrowDown");
    expect(focused(item("d"))).toBe(true);
    press(header(item("d")), "ArrowDown");
    expect(focused(item("a"))).toBe(true);
    press(header(item("a")), "ArrowUp");
    expect(focused(item("d"))).toBe(true);
    press(header(item("d")), "Home");
    expect(focused(item("a"))).toBe(true);
    press(header(item("a")), "End");
    expect(focused(item("d"))).toBe(true);
  });

  it("leaves arrow keys inside the content alone", () => {
    mount();
    header(item("a")).click();
    const input = document.getElementById("inside")!;
    input.focus();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("sets up items added later", async () => {
    const el = mount(`heading-level="4"`);
    const late = document.createElement("fw-accordion-item");
    late.heading = "Late";
    el.append(late);
    await tick();
    expect(headingEl(late).getAttribute("aria-level")).toBe("4");
    header(late).click();
    expect(late.open).toBe(true);
    header(item("a")).click();
    expect(late.open).toBe(false);
  });

  it("updates the header text from heading", () => {
    mount();
    item("a").heading = "Plans";
    expect(header(item("a")).textContent).toBe("Plans");
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount();
    header(item("a")).click();
    press(header(item("a")), "ArrowDown");
    el.append(document.createElement("fw-accordion-item"));
    await tick();
    el.remove();
    leaks.assertClean("fw-accordion leaked");
  });
});
