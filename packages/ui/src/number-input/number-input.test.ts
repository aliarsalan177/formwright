import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import { parseLocaleNumber, type FwNumberInput } from "./number-input.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.useRealTimers();
});

function mount(attrs = ""): FwNumberInput {
  document.body.innerHTML = `<fw-number-input ${attrs}></fw-number-input>`;
  return document.querySelector("fw-number-input")!;
}
const part = <T extends HTMLElement = HTMLElement>(el: FwNumberInput, name: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${name}]`)!;
const input = (el: FwNumberInput) => part<HTMLInputElement>(el, "input");
const press = (el: FwNumberInput, key: string) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  input(el).dispatchEvent(event);
  return event;
};
function type(el: FwNumberInput, text: string) {
  input(el).value = text;
  input(el).dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}
// jsdom has no PointerEvent; the handlers only read `button`.
const pointer = (target: Element, type: string) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, cancelable: true }));

describe("parseLocaleNumber", () => {
  it("reads grouping and decimal marks per locale", () => {
    expect(parseLocaleNumber("1,234.5", "en-US")).toBe(1234.5);
    expect(parseLocaleNumber("1.234,5", "de-DE")).toBe(1234.5);
    expect(parseLocaleNumber("1 234,5", "fr-FR")).toBe(1234.5);
    expect(parseLocaleNumber("-12", "en-US")).toBe(-12);
    expect(parseLocaleNumber("", "en-US")).toBeNull();
    expect(parseLocaleNumber("-", "en-US")).toBeNull();
    expect(parseLocaleNumber("12abc", "en-US")).toBeNaN();
  });
});

describe("fw-number-input", () => {
  it("is a labelled spinbutton with decimal input mode and its range", () => {
    const el = mount(`label="Qty" value="3" min="1" max="10"`);
    const i = input(el);
    expect(i.getAttribute("role")).toBe("spinbutton");
    expect(i.getAttribute("inputmode")).toBe("decimal");
    expect(i.getAttribute("aria-valuenow")).toBe("3");
    expect(i.getAttribute("aria-valuemin")).toBe("1");
    expect(i.getAttribute("aria-valuemax")).toBe("10");
    expect(part<HTMLLabelElement>(el, "label").htmlFor).toBe(i.id);
    expect(el.value).toBe(3);
    expect(i.value).toBe("3");
  });

  it("formats the value for the locale and precision", () => {
    const el = mount(`value="1234.5" locale="de-DE" precision="2"`);
    expect(input(el).value).toBe("1.234,50");
    expect(input(el).getAttribute("aria-valuetext")).toBe("1.234,50");
    el.locale = "en-US";
    expect(input(el).value).toBe("1,234.50");
  });

  it("steps with arrows and pages, emitting input and change", () => {
    const el = mount(`value="5" step="2"`);
    const onInput = vi.fn();
    const onChange = vi.fn();
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);

    expect(press(el, "ArrowUp").defaultPrevented).toBe(true);
    expect(el.value).toBe(7);
    press(el, "ArrowDown");
    press(el, "ArrowDown");
    expect(el.value).toBe(3);
    press(el, "PageUp");
    expect(el.value).toBe(23);
    press(el, "PageDown");
    expect(el.value).toBe(3);
    expect(onInput).toHaveBeenCalledTimes(5);
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("goes to min and max with Home and End, and stays inside them", () => {
    const el = mount(`value="5" min="0" max="8"`);
    press(el, "End");
    expect(el.value).toBe(8);
    press(el, "ArrowUp");
    expect(el.value).toBe(8);
    expect(part<HTMLButtonElement>(el, "increment").disabled).toBe(true);
    press(el, "Home");
    expect(el.value).toBe(0);
    expect(part<HTMLButtonElement>(el, "decrement").disabled).toBe(true);
  });

  it("steps decimals without float noise", () => {
    const el = mount(`value="0.1" step="0.2"`);
    press(el, "ArrowUp");
    expect(el.value).toBe(0.3);
  });

  it("accepts localised typing, then rounds, clamps and formats on commit", () => {
    const el = mount(`locale="en-US" precision="1" max="5000"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    type(el, "1,234.56");
    expect(el.value).toBe(1234.56);
    // The text is left alone while typing.
    expect(input(el).value).toBe("1,234.56");
    input(el).dispatchEvent(new FocusEvent("blur"));
    expect(el.value).toBe(1234.6);
    expect(input(el).value).toBe("1,234.6");
    expect(onChange).toHaveBeenCalledTimes(1);

    type(el, "9999");
    press(el, "Enter");
    expect(el.value).toBe(5000);
    expect(input(el).value).toBe("5,000.0");
  });

  it("keeps text that is not a number and reports badInput", () => {
    const el = mount(`value="2"`);
    const calls: Array<[ValidityStateFlags, string]> = [];
    const internals = (el as unknown as { internals: ElementInternals | null }).internals;
    if (internals) {
      (
        internals as unknown as { setValidity: (f: ValidityStateFlags, m?: string) => void }
      ).setValidity = (flags, message = "") => calls.push([flags, message]);
    }
    type(el, "12x");
    input(el).dispatchEvent(new FocusEvent("blur"));
    expect(el.value).toBeNull();
    expect(input(el).value).toBe("12x");
    expect(input(el).getAttribute("aria-invalid")).toBe("true");
    expect(calls.at(-1)?.[0]).toEqual({ badInput: true });

    press(el, "ArrowUp");
    expect(el.value).toBe(0);
    expect(calls.at(-1)?.[0]).toEqual({});
  });

  it("reports valueMissing, rangeUnderflow and a custom error", () => {
    const el = mount(`required min="10"`);
    const calls: ValidityStateFlags[] = [];
    const internals = (el as unknown as { internals: ElementInternals | null }).internals;
    if (internals) {
      (internals as unknown as { setValidity: (f: ValidityStateFlags) => void }).setValidity = (
        f,
      ) => calls.push(f);
    }
    el.value = null;
    el.required = false;
    el.required = true;
    expect(calls.at(-1)).toEqual({ valueMissing: true });
    type(el, "3");
    expect(calls.at(-1)).toEqual({ rangeUnderflow: true });
    el.error = "Too few";
    expect(calls.at(-1)).toEqual({ customError: true });
    expect(part(el, "error").textContent).toBe("Too few");
    expect(el.hasAttribute("invalid")).toBe(true);
  });

  it("steps once per click and repeats while a stepper is held", () => {
    vi.useFakeTimers();
    const el = mount(`value="0"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    const inc = part<HTMLButtonElement>(el, "increment");

    pointer(inc, "pointerdown");
    expect(el.value).toBe(1);
    vi.advanceTimersByTime(400 + 60 * 3);
    expect(el.value).toBe(5);
    pointer(inc, "pointerup");
    inc.click(); // the click that ends the press must not step again
    vi.advanceTimersByTime(1000);
    expect(el.value).toBe(5);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Leaving the button stops it too.
    pointer(part(el, "decrement"), "pointerdown");
    vi.advanceTimersByTime(400);
    pointer(part(el, "decrement"), "pointerleave");
    vi.advanceTimersByTime(1000);
    expect(el.value).toBe(3);

    // A click with no press — assistive technology — steps once.
    inc.click();
    expect(el.value).toBe(4);
  });

  it("places steppers at the end or split, or hides them", () => {
    const el = mount(`stepper-position="split"`);
    expect(el.stepperPosition).toBe("split");
    expect(part(el, "decrement").getAttribute("aria-label")).toBe("Decrease");
    expect(part(el, "decrement").tabIndex).toBe(-1);
    el.noStepper = true;
    expect(part(el, "decrement").hidden).toBe(true);
    expect(part(el, "increment").hidden).toBe(true);
  });

  it("does not step when readonly", () => {
    const el = mount(`value="1" readonly`);
    press(el, "ArrowUp");
    part(el, "increment").click();
    expect(el.value).toBe(1);
    expect(input(el).readOnly).toBe(true);
  });

  it("resets to its initial value and is disabled by a fieldset", () => {
    const el = mount(`value="4"`);
    press(el, "ArrowUp");
    type(el, "77");
    el.formResetCallback();
    expect(el.value).toBe(4);
    expect(input(el).value).toBe("4");

    el.formDisabledCallback(true);
    expect(input(el).disabled).toBe(true);
    expect(part<HTMLButtonElement>(el, "increment").disabled).toBe(true);
    press(el, "ArrowUp");
    expect(el.value).toBe(4);
  });

  it("leaves nothing behind when removed while a stepper is held", () => {
    leaks = trackLeaks();
    const el = mount(`value="1" label="Qty"`);
    pointer(part(el, "increment"), "pointerdown");
    expect(el.value).toBe(2);
    el.remove();
    leaks.assertClean("fw-number-input leaked", { strict: true });
  });
});
