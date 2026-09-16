import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwCalendar } from "../calendar/calendar.js";
import type { FwDatePicker } from "./date-picker.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const TODAY = "2026-09-17";

interface Mounted {
  el: FwDatePicker;
  /** jsdom has no setFormValue; these record what the form would get. */
  setFormValue: Mock;
  setValidity: Mock;
}

function mount(attrs: Record<string, string> = {}): Mounted {
  const el = document.createElement("fw-date-picker");
  el.setAttribute("locale", "en-US");
  el.setAttribute("today", TODAY);
  el.setAttribute("label", "Date");
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  Object.assign(internals, { setFormValue, setValidity });
  const outside = document.createElement("button");
  outside.id = "outside";
  document.body.append(el, outside);
  return { el, setFormValue, setValidity };
}

const part = <T extends Element = HTMLElement>(el: FwDatePicker, name: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${name}]`)!;
const input = (el: FwDatePicker) => part<HTMLInputElement>(el, "input");
const popup = (el: FwDatePicker) => part(el, "popup");
const calendar = (el: FwDatePicker) => el.shadowRoot!.querySelector<FwCalendar>("fw-calendar")!;
const day = (el: FwDatePicker, iso: string) =>
  calendar(el).shadowRoot!.querySelector<HTMLButtonElement>(
    `button[data-date="${iso}"]:not([data-outside])`,
  )!;
const focusedDay = (el: FwDatePicker) =>
  (calendar(el).shadowRoot!.activeElement as HTMLButtonElement | null)?.dataset.date;
const press = (target: Element, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, ...init }),
  );
const lastValidity = (m: Mounted) =>
  (m.setValidity.mock.calls.at(-1)?.[0] ?? {}) as ValidityStateFlags;

function type(el: FwDatePicker, text: string) {
  input(el).value = text;
  input(el).dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  input(el).dispatchEvent(new Event("change"));
}

describe("fw-date-picker", () => {
  it("shows the value formatted for the locale, in the chosen style", () => {
    const { el } = mount({ value: "2026-09-17" });
    expect(input(el).value).toBe("Sep 17, 2026");
    el.format = "long";
    expect(input(el).value).toBe("September 17, 2026");
    el.format = "short";
    expect(input(el).value).toBe("9/17/26");
    el.locale = "de-DE";
    expect(input(el).value).toBe("17.09.26");
  });

  it("labels the field and describes its popup", () => {
    const { el } = mount();
    const label = part<HTMLLabelElement>(el, "label");
    expect(label.htmlFor).toBe(input(el).id);
    expect(input(el).getAttribute("role")).toBe("combobox");
    expect(input(el).getAttribute("aria-haspopup")).toBe("dialog");
    expect(input(el).getAttribute("aria-controls")).toBe(popup(el).id);
    expect(input(el).getAttribute("aria-expanded")).toBe("false");
    expect(popup(el).getAttribute("role")).toBe("dialog");
    expect(part(el, "toggle").getAttribute("aria-label")).toBe("Choose date");
  });

  describe("popup", () => {
    it("opens on ArrowDown and focuses the selected day", () => {
      const { el } = mount({ value: "2026-03-05" });
      const onShow = vi.fn();
      el.addEventListener("fw-show", onShow);
      press(input(el), "ArrowDown");
      expect(el.open).toBe(true);
      expect(popup(el).hidden).toBe(false);
      expect(input(el).getAttribute("aria-expanded")).toBe("true");
      expect(focusedDay(el)).toBe("2026-03-05");
      expect(onShow).toHaveBeenCalledTimes(1);
    });

    it("opens on Alt+ArrowDown and focuses today when empty", () => {
      const { el } = mount();
      press(input(el), "ArrowDown", { altKey: true });
      expect(el.open).toBe(true);
      expect(focusedDay(el)).toBe(TODAY);
      expect(day(el, TODAY).getAttribute("aria-current")).toBe("date");
    });

    it("closes on Escape and gives focus back to the field", () => {
      const { el } = mount({ value: "2026-09-17" });
      const onHide = vi.fn();
      el.addEventListener("fw-hide", onHide);
      part<HTMLButtonElement>(el, "toggle").click();
      expect(focusedDay(el)).toBe("2026-09-17");
      press(day(el, "2026-09-17"), "ArrowRight");
      press(calendar(el).shadowRoot!.activeElement!, "Escape");
      expect(el.open).toBe(false);
      expect(popup(el).hidden).toBe(true);
      expect(el.shadowRoot!.activeElement).toBe(input(el));
      expect(el.value).toBe("2026-09-17");
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it("picks a day, commits it and closes", () => {
      const { el, setFormValue } = mount({ name: "when" });
      const onInput = vi.fn();
      const onChange = vi.fn();
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
      el.show();
      day(el, "2026-09-21").click();

      expect(el.value).toBe("2026-09-21");
      expect(input(el).value).toBe("Sep 21, 2026");
      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(setFormValue).toHaveBeenLastCalledWith("2026-09-21");
      expect(el.open).toBe(false);
      expect(el.shadowRoot!.activeElement).toBe(input(el));
    });

    it("stays open after a pick with close-on-select=false", () => {
      const { el } = mount({ "close-on-select": "false" });
      el.show();
      day(el, "2026-09-21").click();
      expect(el.value).toBe("2026-09-21");
      expect(el.open).toBe(true);
    });

    it("picks from the keyboard", () => {
      const { el } = mount({ value: "2026-09-17" });
      press(input(el), "ArrowDown");
      press(day(el, "2026-09-17"), "PageDown");
      expect(focusedDay(el)).toBe("2026-10-17");
      press(day(el, "2026-10-17"), "Enter");
      expect(el.value).toBe("2026-10-17");
      expect(el.open).toBe(false);
    });

    it("keeps Tab inside the popup", () => {
      const { el } = mount({ value: "2026-09-17" });
      el.show();
      const cal = calendar(el).shadowRoot!;
      const prev = cal.querySelector<HTMLButtonElement>("[part~=prev]")!;
      press(day(el, "2026-09-17"), "Tab");
      expect(cal.activeElement).toBe(prev);
      press(prev, "Tab", { shiftKey: true });
      expect(cal.activeElement).toBe(day(el, "2026-09-17"));
    });

    it("closes on a press outside, not inside", () => {
      const { el } = mount();
      el.show();
      day(el, "2026-09-10").dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, composed: true }),
      );
      expect(el.open).toBe(true);
      document
        .getElementById("outside")!
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
      expect(el.open).toBe(false);
    });

    it("passes min, max, locale and week start to the calendar", () => {
      const { el } = mount({ min: "2026-09-05", max: "2026-09-25", "first-day-of-week": "1" });
      el.show();
      expect(calendar(el).min).toBe("2026-09-05");
      expect(day(el, "2026-09-04").getAttribute("aria-disabled")).toBe("true");
      const header = calendar(el).shadowRoot!.querySelector("thead th")!;
      expect(header.textContent).toBe("Mon");
    });

    it("will not open while disabled or read-only", () => {
      const { el } = mount({ disabled: "" });
      press(input(el), "ArrowDown");
      el.show();
      expect(el.open).toBe(false);
      expect(part<HTMLButtonElement>(el, "toggle").disabled).toBe(true);
      el.disabled = false;
      el.readOnly = true;
      el.show();
      expect(el.open).toBe(false);
      expect(input(el).readOnly).toBe(true);
    });
  });

  describe("typing", () => {
    it("parses the locale's short format and ISO on change and Enter", () => {
      const { el } = mount();
      const onChange = vi.fn();
      el.addEventListener("change", onChange);
      type(el, "10/3/2026");
      expect(el.value).toBe("2026-10-03");
      expect(input(el).value).toBe("Oct 3, 2026");
      expect(onChange).toHaveBeenCalledTimes(1);

      input(el).value = "2026-12-24";
      press(input(el), "Enter");
      expect(el.value).toBe("2026-12-24");
      expect(input(el).value).toBe("Dec 24, 2026");
    });

    it("does not report keystrokes as value changes", () => {
      const { el } = mount();
      const onInput = vi.fn();
      el.addEventListener("input", onInput);
      input(el).value = "10/";
      input(el).dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      expect(onInput).not.toHaveBeenCalled();
    });

    it("leaves the formatted text alone when it has not changed", () => {
      const { el } = mount({ value: "2026-09-17" });
      const onChange = vi.fn();
      el.addEventListener("change", onChange);
      input(el).dispatchEvent(new Event("change"));
      expect(el.value).toBe("2026-09-17");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("flags text that is not a date as badInput, keeping what was typed", () => {
      const m = mount({ value: "2026-09-17" });
      const { el } = m;
      type(el, "next tuesday");
      expect(el.value).toBe("");
      expect(input(el).value).toBe("next tuesday");
      expect(lastValidity(m).badInput).toBe(true);
      expect(input(el).getAttribute("aria-invalid")).toBe("true");
      expect(el.hasAttribute("invalid")).toBe(true);

      type(el, "9/18/2026");
      expect(el.value).toBe("2026-09-18");
      expect(lastValidity(m).badInput).toBeFalsy();
      expect(el.hasAttribute("invalid")).toBe(false);
    });

    it("clears with an empty field", () => {
      const { el } = mount({ value: "2026-09-17" });
      type(el, "");
      expect(el.value).toBe("");
    });
  });

  describe("form", () => {
    it("is valueMissing while required and empty", () => {
      const m = mount({ required: "", name: "dob" });
      expect(lastValidity(m).valueMissing).toBe(true);
      expect(m.setFormValue).toHaveBeenLastCalledWith(null);
      m.el.value = "2026-01-02";
      expect(lastValidity(m).valueMissing).toBeFalsy();
      expect(m.setFormValue).toHaveBeenLastCalledWith("2026-01-02");
    });

    it("reports a value outside min and max", () => {
      const m = mount({ min: "2026-09-01", max: "2026-09-30", value: "2026-08-31" });
      expect(lastValidity(m).rangeUnderflow).toBe(true);
      m.el.value = "2026-10-01";
      expect(lastValidity(m).rangeOverflow).toBe(true);
      m.el.value = "2026-09-15";
      expect(lastValidity(m)).toEqual({});
    });

    it("goes back to its initial value, and text, on reset", () => {
      const { el } = mount({ value: "2026-09-17" });
      type(el, "garbage");
      el.formResetCallback();
      expect(el.value).toBe("2026-09-17");
      expect(input(el).value).toBe("Sep 17, 2026");
    });

    it("clears when clearable", () => {
      const { el } = mount({ value: "2026-09-17", clearable: "" });
      const clear = part<HTMLButtonElement>(el, "clear");
      expect(clear.hidden).toBe(false);
      clear.click();
      expect(el.value).toBe("");
      expect(input(el).value).toBe("");
      expect(clear.hidden).toBe(true);
    });
  });

  describe("range", () => {
    it("shows both ends and exposes them as valueStart / valueEnd", () => {
      const { el, setFormValue } = mount({ mode: "range", value: "2026-09-01/2026-09-12" });
      expect(input(el).value).toBe("Sep 1, 2026 – Sep 12, 2026");
      expect(el.valueStart).toBe("2026-09-01");
      expect(el.valueEnd).toBe("2026-09-12");
      expect(setFormValue).toHaveBeenLastCalledWith("2026-09-01/2026-09-12");
      el.valueEnd = "2026-09-20";
      expect(el.value).toBe("2026-09-01/2026-09-20");
    });

    it("commits and closes only once both ends are picked", () => {
      const m = mount({ mode: "range", name: "stay" });
      const { el } = m;
      const onChange = vi.fn();
      el.addEventListener("change", onChange);
      el.show();

      day(el, "2026-09-14").click();
      expect(el.open).toBe(true);
      expect(el.value).toBe("");
      expect(onChange).not.toHaveBeenCalled();

      day(el, "2026-09-09").click();
      expect(el.value).toBe("2026-09-09/2026-09-14");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(m.setFormValue).toHaveBeenLastCalledWith("2026-09-09/2026-09-14");
      expect(el.open).toBe(false);
    });

    it("drops a half-picked range when closed", () => {
      const { el } = mount({ mode: "range", value: "2026-09-01/2026-09-03" });
      el.show();
      day(el, "2026-09-20").click();
      expect(calendar(el).valueEnd).toBe("");
      press(day(el, "2026-09-20"), "Escape");
      expect(el.value).toBe("2026-09-01/2026-09-03");
      expect([calendar(el).valueStart, calendar(el).valueEnd]).toEqual([
        "2026-09-01",
        "2026-09-03",
      ]);
    });

    it("parses a typed range", () => {
      const { el } = mount({ mode: "range" });
      type(el, "9/12/2026 – 9/1/2026");
      expect(el.value).toBe("2026-09-01/2026-09-12");
      type(el, "2026-10-01/2026-10-05");
      expect(el.value).toBe("2026-10-01/2026-10-05");
    });

    it("needs both ends to satisfy required", () => {
      const m = mount({ mode: "range", required: "" });
      m.el.value = "2026-09-01/";
      expect(lastValidity(m).valueMissing).toBe(true);
      m.el.value = "2026-09-01/2026-09-02";
      expect(lastValidity(m).valueMissing).toBeFalsy();
    });
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const { el } = mount({ value: "2026-09-17", clearable: "", mode: "range" });
    press(input(el), "ArrowDown");
    expect(el.open).toBe(true);
    press(day(el, "2026-09-17"), "ArrowRight");
    el.remove();
    leaks.assertClean("fw-date-picker leaked");
  });
});
