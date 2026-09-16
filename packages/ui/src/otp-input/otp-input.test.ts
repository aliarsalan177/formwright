import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwOtpInput } from "./otp-input.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(attrs = ""): FwOtpInput {
  document.body.innerHTML = `<fw-otp-input ${attrs}></fw-otp-input>`;
  return document.querySelector("fw-otp-input")!;
}
const boxes = (el: FwOtpInput) => [
  ...el.shadowRoot!.querySelectorAll<HTMLInputElement>("[part~=box]"),
];
const box = (el: FwOtpInput, i: number) => boxes(el)[i]!;
const focused = (el: FwOtpInput) =>
  boxes(el).indexOf(el.shadowRoot!.activeElement as HTMLInputElement);
const values = (el: FwOtpInput) => boxes(el).map((b) => b.value);
function type(el: FwOtpInput, i: number, text: string) {
  const b = box(el, i);
  b.value = text;
  b.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}
const press = (el: FwOtpInput, i: number, key: string) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  box(el, i).dispatchEvent(event);
  return event;
};
function paste(el: FwOtpInput, i: number, text: string) {
  // jsdom has no ClipboardEvent data; a plain event with a fake clipboard.
  const event = new Event("paste", { bubbles: true, composed: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (type: string) => (type === "text/plain" ? text : "") },
  });
  box(el, i).dispatchEvent(event);
  return event;
}

describe("fw-otp-input", () => {
  it("renders a labelled group of single-character boxes", () => {
    const el = mount(`label="Code"`);
    const group = el.shadowRoot!.querySelector<HTMLElement>("[role=group]")!;
    const label = el.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!;
    expect(group.getAttribute("aria-labelledby")).toBe(label.id);
    expect(boxes(el)).toHaveLength(6);
    expect(box(el, 0).getAttribute("autocomplete")).toBe("one-time-code");
    expect(box(el, 1).getAttribute("autocomplete")).toBe("off");
    expect(box(el, 2).getAttribute("aria-label")).toBe("Digit 3 of 6");
    expect(box(el, 0).getAttribute("inputmode")).toBe("numeric");
  });

  it("follows length, type and mask", () => {
    const el = mount(`length="4" type="alphanumeric" mask`);
    expect(boxes(el)).toHaveLength(4);
    expect(box(el, 0).type).toBe("password");
    expect(box(el, 0).getAttribute("inputmode")).toBe("text");
    expect(box(el, 3).getAttribute("aria-label")).toBe("Character 4 of 4");
    el.length = 5;
    expect(boxes(el)).toHaveLength(5);
    el.mask = false;
    expect(box(el, 0).type).toBe("text");
  });

  it("advances as the user types and emits input", () => {
    const el = mount();
    const onInput = vi.fn();
    el.addEventListener("input", onInput);
    box(el, 0).focus();
    type(el, 0, "4");
    expect(el.value).toBe("4");
    expect(focused(el)).toBe(1);
    type(el, 1, "2");
    expect(el.value).toBe("42");
    expect(focused(el)).toBe(2);
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it("ignores characters the type does not allow", () => {
    const el = mount();
    const onInput = vi.fn();
    el.addEventListener("input", onInput);
    type(el, 0, "a");
    expect(el.value).toBe("");
    expect(box(el, 0).value).toBe("");
    expect(onInput).not.toHaveBeenCalled();

    const alpha = mount(`type="alphanumeric"`);
    type(alpha, 0, "a");
    expect(alpha.value).toBe("a");
  });

  it("replaces a character typed beside an existing one", () => {
    const el = mount(`value="12"`);
    type(el, 0, "17");
    expect(el.value).toBe("72");
  });

  it("clears with Backspace and moves back", () => {
    const el = mount(`value="123"`);
    box(el, 2).focus();
    press(el, 2, "Backspace");
    expect(el.value).toBe("12");
    expect(focused(el)).toBe(1);

    // On an empty box it clears the one before.
    box(el, 3).focus();
    press(el, 3, "Backspace");
    expect(el.value).toBe("12");
    expect(values(el).slice(0, 3)).toEqual(["1", "2", ""]);
    expect(focused(el)).toBe(2);
    press(el, 2, "Backspace");
    expect(el.value).toBe("1");
    expect(focused(el)).toBe(1);
  });

  it("moves with arrows, Home and End", () => {
    const el = mount();
    box(el, 2).focus();
    expect(press(el, 2, "ArrowRight").defaultPrevented).toBe(true);
    expect(focused(el)).toBe(3);
    press(el, 3, "ArrowLeft");
    expect(focused(el)).toBe(2);
    press(el, 2, "End");
    expect(focused(el)).toBe(5);
    press(el, 5, "Home");
    expect(focused(el)).toBe(0);
  });

  it("fills from the current box on paste and completes", () => {
    const el = mount(`length="4"`);
    const onComplete = vi.fn();
    const onChange = vi.fn();
    el.addEventListener("fw-complete", (e) => onComplete((e as CustomEvent).detail));
    el.addEventListener("change", onChange);

    type(el, 0, "9");
    const event = paste(el, 1, "1-2 3 4 5");
    expect(event.defaultPrevented).toBe(true);
    expect(values(el)).toEqual(["9", "1", "2", "3"]);
    expect(el.value).toBe("9123");
    expect(focused(el)).toBe(3);
    expect(onComplete).toHaveBeenCalledWith({ value: "9123" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("accepts a whole code autofilled into the first box", () => {
    const el = mount();
    const onComplete = vi.fn();
    el.addEventListener("fw-complete", onComplete);
    type(el, 0, "654321");
    expect(el.value).toBe("654321");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps a single tab stop on the first empty box", () => {
    const el = mount(`value="12"`);
    expect(boxes(el).map((b) => b.tabIndex)).toEqual([-1, -1, 0, -1, -1, -1]);
    el.value = "123456";
    expect(box(el, 5).tabIndex).toBe(0);
  });

  it("emits change when focus leaves with a changed code", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    type(el, 0, "1");
    box(el, 1).dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: box(el, 2) }),
    );
    expect(onChange).not.toHaveBeenCalled();
    box(el, 1).dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reports valueMissing and tooShort, and shows an error", () => {
    const el = mount(`required length="4" help="Sent by SMS"`);
    const calls: ValidityStateFlags[] = [];
    const internals = (el as unknown as { internals: ElementInternals | null }).internals;
    if (internals) {
      (internals as unknown as { setValidity: (f: ValidityStateFlags) => void }).setValidity = (
        f,
      ) => calls.push(f);
    }
    el.value = "1";
    expect(calls.at(-1)).toEqual({ tooShort: true });
    el.value = "";
    expect(calls.at(-1)).toEqual({ valueMissing: true });
    el.value = "1234";
    expect(calls.at(-1)).toEqual({});

    el.error = "Code expired";
    expect(calls.at(-1)).toEqual({ customError: true });
    const group = el.shadowRoot!.querySelector<HTMLElement>("[role=group]")!;
    const error = el.shadowRoot!.querySelector<HTMLElement>("[part~=error]")!;
    expect(error.hidden).toBe(false);
    expect(group.getAttribute("aria-describedby")).toContain(error.id);
    expect(box(el, 0).getAttribute("aria-invalid")).toBe("true");
  });

  it("resets to its initial value and is disabled by a fieldset", () => {
    const el = mount(`value="12"`);
    type(el, 2, "3");
    el.formResetCallback();
    expect(el.value).toBe("12");
    expect(values(el)).toEqual(["1", "2", "", "", "", ""]);

    el.formDisabledCallback(true);
    expect(boxes(el).every((b) => b.disabled)).toBe(true);
  });

  it("leaves nothing behind when removed mid-entry", () => {
    leaks = trackLeaks();
    const el = mount(`label="Code" mask`);
    box(el, 0).focus();
    type(el, 0, "1");
    paste(el, 1, "23");
    expect(el.value).toBe("123");
    el.remove();
    // Not strict: jsdom's select() queues one-shot timeouts of its own.
    leaks.assertClean("fw-otp-input leaked");
  });
});
