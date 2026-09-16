import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import { normalise, type FwSlider } from "./slider.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwSlider {
  document.body.innerHTML = html;
  return document.querySelector("fw-slider")!;
}
const q = <T extends Element = HTMLElement>(el: FwSlider, part: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${part}]`)!;
const inner = (el: FwSlider) => q<HTMLInputElement>(el, "input");

/** Simulate a drag step: the browser moves the range, then fires input. */
function drag(el: FwSlider, value: string) {
  inner(el).value = value;
  inner(el).dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

describe("fw-slider", () => {
  it("renders a labelled native range with the bounds applied", () => {
    const el = mount(
      `<fw-slider label="Volume" min="10" max="20" step="2" value="14"></fw-slider>`,
    );
    const input = inner(el);
    expect(input.type).toBe("range");
    expect(q<HTMLLabelElement>(el, "label").htmlFor).toBe(input.id);
    expect(input.min).toBe("10");
    expect(input.max).toBe("20");
    expect(input.step).toBe("2");
    expect(input.value).toBe("14");
    expect(el.value).toBe(14);
  });

  it("defaults to 0..100 by 1, starting at the midpoint like a native range", () => {
    const el = mount(`<fw-slider></fw-slider>`);
    expect(el.min).toBe(0);
    expect(el.max).toBe(100);
    expect(el.step).toBe(1);
    expect(el.value).toBe(50);
  });

  it("clamps and snaps a programmatic value", () => {
    const el = mount(`<fw-slider min="0" max="10" step="1"></fw-slider>`);
    el.value = 7.3;
    expect(el.value).toBe(7);
    el.value = 500;
    expect(el.value).toBe(10);
    el.setAttribute("value", "-4");
    expect(el.value).toBe(0);
    expect(inner(el).value).toBe("0");
    el.max = 5;
    el.value = 9;
    expect(el.value).toBe(5);
  });

  it("snaps to a grid anchored at min, without float noise", () => {
    expect(normalise(0.35, 0, 1, 0.1)).toBe(0.4);
    expect(normalise(0.7, 0, 1, 0.1)).toBe(0.7);
    expect(normalise(9, 1, 10, 3)).toBe(10);
    // A max of 9 is off the 1, 4, 7 grid, so the value stays below it.
    expect(normalise(9, 1, 9, 3)).toBe(7);
    expect(normalise(null, 0, 10, 1)).toBe(5);
  });

  it("fills the track up to the value, as a fraction", () => {
    const el = mount(`<fw-slider min="0" max="200" value="50"></fw-slider>`);
    expect(inner(el).style.getPropertyValue("--_fill")).toBe("0.25");
    el.value = 200;
    expect(inner(el).style.getPropertyValue("--_fill")).toBe("1");
  });

  it("shows the current value next to the label when asked", () => {
    const el = mount(`<fw-slider label="Volume" value="30"></fw-slider>`);
    const value = q(el, "value");
    expect(value.hidden).toBe(true);
    el.showValue = true;
    expect(el.hasAttribute("show-value")).toBe(true);
    expect(value.hidden).toBe(false);
    expect(value.textContent).toBe("30");
    drag(el, "42");
    expect(value.textContent).toBe("42");
  });

  it("emits input while dragging and change on release", () => {
    const el = mount(`<fw-slider></fw-slider>`);
    const events: string[] = [];
    el.addEventListener("input", () => events.push(`input:${el.value}`));
    el.addEventListener("change", () => events.push(`change:${el.value}`));
    drag(el, "51");
    drag(el, "52");
    inner(el).dispatchEvent(new Event("change", { bubbles: true }));
    expect(events).toEqual(["input:51", "input:52", "change:52"]);
  });

  it("submits the value as a string", () => {
    const el = mount(`<fw-slider name="volume" value="20"></fw-slider>`);
    const internals = (el as unknown as { internals: ElementInternals }).internals;
    const setFormValue = vi.fn();
    Object.assign(internals, { setFormValue, setValidity: vi.fn() });
    el.value = 33;
    expect(setFormValue).toHaveBeenLastCalledWith("33");
  });

  it("shows help and an error, describing the range with both", () => {
    const el = mount(`<fw-slider help="Pick loudness"></fw-slider>`);
    el.error = "Too loud";
    expect(q(el, "error").textContent).toBe("Too loud");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(inner(el).getAttribute("aria-invalid")).toBe("true");
    expect(inner(el).getAttribute("aria-describedby")).toBe(
      `${q(el, "help").id} ${q(el, "error").id}`,
    );
  });

  it("is disabled by its attribute or a fieldset", () => {
    const el = mount(`<fw-slider disabled></fw-slider>`);
    expect(inner(el).disabled).toBe(true);
    el.disabled = false;
    expect(inner(el).disabled).toBe(false);
    el.formDisabledCallback(true);
    expect(inner(el).disabled).toBe(true);
  });

  it("goes back to its initial value on form reset", () => {
    const el = mount(`<fw-slider value="25"></fw-slider>`);
    drag(el, "80");
    el.formResetCallback();
    expect(el.value).toBe(25);
  });

  it("steps up and down within bounds", () => {
    const el = mount(`<fw-slider min="0" max="10" step="5" value="5"></fw-slider>`);
    el.stepUp();
    expect(el.value).toBe(10);
    el.stepUp();
    expect(el.value).toBe(10);
    el.stepDown(2);
    expect(el.value).toBe(0);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-slider label="x" help="y" show-value></fw-slider>`);
    drag(el, "10");
    el.remove();
    leaks.assertClean("fw-slider leaked");
  });
});
