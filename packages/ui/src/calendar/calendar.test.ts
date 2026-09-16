import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwCalendar } from "./calendar.js";
import { addMonths, addYears, parseDate, startOfWeek, weekStartFor } from "./dates.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

// 17 September 2026 is a Thursday; the 1st is a Tuesday.
const TODAY = "2026-09-17";

function mount(attrs = "", wrapper = (html: string) => html): FwCalendar {
  const locale = attrs.includes("locale=") ? "" : `locale="en-US"`;
  document.body.innerHTML = wrapper(
    `<fw-calendar ${locale} today="${TODAY}" ${attrs}></fw-calendar>`,
  );
  return document.querySelector("fw-calendar")!;
}
const $ = <T extends Element = HTMLElement>(el: FwCalendar, selector: string) =>
  el.shadowRoot!.querySelector<T>(selector)!;
const $$ = <T extends Element = HTMLElement>(el: FwCalendar, selector: string) => [
  ...el.shadowRoot!.querySelectorAll<T>(selector),
];
const day = (el: FwCalendar, iso: string) =>
  $<HTMLButtonElement>(el, `button[data-date="${iso}"]:not([data-outside])`);
const cell = (el: FwCalendar, iso: string) => day(el, iso).parentElement as HTMLTableCellElement;
const heading = (el: FwCalendar) => $(el, "[part~=heading]").textContent;
const active = (el: FwCalendar) => el.shadowRoot!.activeElement as HTMLButtonElement | null;
const tabbable = (el: FwCalendar) =>
  $$<HTMLButtonElement>(el, "button.day").filter((b) => b.tabIndex === 0);
const visibleMonth = (el: FwCalendar, i = 0) => $$<HTMLElement>(el, "[part~=month]")[i]!;
const press = (target: Element, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, ...init }),
  );
/** Press on whatever day has focus, and return the newly focused date. */
function key(el: FwCalendar, name: string, init: KeyboardEventInit = {}): string | undefined {
  press(active(el) ?? tabbable(el)[0]!, name, init);
  return active(el)?.dataset.date;
}

describe("fw-calendar", () => {
  it("renders the month with leading and trailing days from its neighbours", () => {
    const el = mount(`value="2026-09-17"`);
    expect(heading(el)).toBe("September 2026");
    expect($(el, "[role=grid]").getAttribute("aria-labelledby")).toBe($(el, "[part~=caption]").id);

    const month = visibleMonth(el);
    const buttons = [...month.querySelectorAll<HTMLButtonElement>("button.day")];
    // Sunday-first in en-US: the grid opens on Sunday 30 August.
    expect(buttons[0]!.dataset.date).toBe("2026-08-30");
    expect(buttons[0]!.hasAttribute("data-outside")).toBe(true);
    expect(buttons[0]!.hidden).toBe(false);
    expect(buttons[2]!.dataset.date).toBe("2026-09-01");
    expect(buttons[2]!.textContent).toBe("1");
    expect(buttons[2]!.getAttribute("aria-label")).toBe("Tuesday, September 1, 2026");

    // Five weeks: the 30th is a Wednesday, so the last row runs to 3 October
    // and the sixth row, wholly October, is not drawn.
    const rows = [...month.querySelectorAll<HTMLTableRowElement>("tbody tr")];
    expect(rows.filter((r) => !r.hidden)).toHaveLength(5);
    expect(buttons[34]!.dataset.date).toBe("2026-10-03");
    expect(buttons[34]!.hasAttribute("data-outside")).toBe(true);
  });

  it("names the weekday columns in full", () => {
    const el = mount();
    const headers = [...visibleMonth(el).querySelectorAll<HTMLTableCellElement>("thead th")];
    expect(headers).toHaveLength(7);
    expect(headers[0]!.textContent).toBe("Sun");
    expect(headers[0]!.abbr).toBe("Sunday");
    expect(headers[0]!.getAttribute("aria-label")).toBe("Sunday");
    expect(headers[0]!.scope).toBe("col");
  });

  it("hides the neighbours' days when show-outside-days is false", () => {
    const el = mount(`value="2026-09-17" show-outside-days="false"`);
    const outside = [
      ...visibleMonth(el).querySelectorAll<HTMLButtonElement>("button[data-outside]"),
    ];
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.every((b) => b.hidden)).toBe(true);
    el.showOutsideDays = true;
    expect(outside.every((b) => !b.hidden)).toBe(true);
  });

  it("marks today and makes only the active day tabbable", () => {
    const el = mount();
    expect(day(el, TODAY).getAttribute("aria-current")).toBe("date");
    expect(day(el, "2026-09-18").hasAttribute("aria-current")).toBe(false);
    expect(tabbable(el)).toEqual([day(el, TODAY)]);

    el.value = "2026-11-02";
    expect(heading(el)).toBe("November 2026");
    expect(tabbable(el)).toEqual([day(el, "2026-11-02")]);
    expect(cell(el, "2026-11-02").getAttribute("aria-selected")).toBe("true");
  });

  describe("week start", () => {
    it("follows the locale", () => {
      expect(weekStartFor("en-US")).toBe(0);
      expect(weekStartFor("en-GB")).toBe(1);
      const el = mount(`value="2026-09-17"`);
      el.locale = "en-GB";
      expect($$(el, "thead th")[0]!.textContent).toBe("Mon");
      expect(visibleMonth(el).querySelector<HTMLButtonElement>("button.day")!.dataset.date).toBe(
        "2026-08-31",
      );
    });

    it("can be set explicitly", () => {
      const el = mount(`first-day-of-week="3"`);
      expect($$(el, "thead th")[0]!.textContent).toBe("Wed");
      expect(visibleMonth(el).querySelector<HTMLButtonElement>("button.day")!.dataset.date).toBe(
        "2026-08-26",
      );
    });

    it("translates month and weekday names", () => {
      const el = mount(`locale="fr-FR"`);
      expect(heading(el)).toBe("septembre 2026");
      expect($$<HTMLTableCellElement>(el, "thead th")[0]!.abbr).toBe("lundi");
    });

    it("takes the locale from the nearest lang when none is given", () => {
      document.body.innerHTML = `<div lang="de-DE"><fw-calendar today="${TODAY}"></fw-calendar></div>`;
      const el = document.querySelector("fw-calendar")!;
      expect(heading(el)).toBe("September 2026");
      expect($$(el, "thead th")[0]!.getAttribute("aria-label")).toBe("Montag");
    });
  });

  describe("keyboard", () => {
    it("moves by day and week with the arrows", () => {
      const el = mount(`value="2026-09-17"`);
      el.focus();
      expect(active(el)?.dataset.date).toBe("2026-09-17");
      expect(key(el, "ArrowRight")).toBe("2026-09-18");
      expect(key(el, "ArrowLeft")).toBe("2026-09-17");
      expect(key(el, "ArrowDown")).toBe("2026-09-24");
      expect(key(el, "ArrowUp")).toBe("2026-09-17");
      expect(tabbable(el)).toEqual([day(el, "2026-09-17")]);
    });

    it("goes to the start and end of the week with Home and End", () => {
      const el = mount(`value="2026-09-17"`);
      el.focus();
      expect(key(el, "Home")).toBe("2026-09-13");
      expect(key(el, "End")).toBe("2026-09-19");
      el.firstDayOfWeek = 1;
      expect(key(el, "Home")).toBe("2026-09-14");
      expect(key(el, "End")).toBe("2026-09-20");
    });

    it("turns the month with Page Up / Down and the year with Shift", () => {
      const el = mount(`value="2026-01-31"`);
      el.focus();
      expect(key(el, "PageDown")).toBe("2026-02-28");
      expect(heading(el)).toBe("February 2026");
      expect(key(el, "PageUp")).toBe("2026-01-28");
      expect(key(el, "PageDown", { shiftKey: true })).toBe("2027-01-28");
      expect(heading(el)).toBe("January 2027");
      expect(key(el, "PageUp", { shiftKey: true })).toBe("2026-01-28");
    });

    it("follows focus into the neighbouring month", () => {
      const el = mount(`value="2026-09-30"`);
      el.focus();
      expect(key(el, "ArrowRight")).toBe("2026-10-01");
      expect(heading(el)).toBe("October 2026");
      expect(active(el)!.hasAttribute("data-outside")).toBe(false);
      expect(key(el, "ArrowUp")).toBe("2026-09-24");
      expect(heading(el)).toBe("September 2026");
    });

    it("reverses Left and Right in right-to-left text", () => {
      const el = mount(`value="2026-09-17"`, (html) => `<div dir="rtl">${html}</div>`);
      el.focus();
      expect(key(el, "ArrowLeft")).toBe("2026-09-18");
      expect(key(el, "ArrowRight")).toBe("2026-09-17");
    });

    it("picks with Enter and Space", () => {
      const el = mount();
      const onSelect = vi.fn();
      el.addEventListener("fw-select", onSelect);
      el.focus();
      key(el, "ArrowRight");
      key(el, "Enter");
      expect(el.value).toBe("2026-09-18");
      key(el, "ArrowRight");
      key(el, " ");
      expect(el.value).toBe("2026-09-19");
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("does not move past min or max", () => {
      const el = mount(`value="2026-09-17" min="2026-09-10" max="2026-09-20"`);
      el.focus();
      expect(key(el, "PageUp")).toBe("2026-09-10");
      expect(key(el, "ArrowDown", { shiftKey: false })).toBe("2026-09-17");
      expect(key(el, "PageDown", { shiftKey: true })).toBe("2026-09-20");
    });
  });

  describe("availability", () => {
    it("disables days outside min and max, and the buttons that lead there", () => {
      const el = mount(`value="2026-09-17" min="2026-09-05" max="2026-09-25"`);
      expect(day(el, "2026-09-04").getAttribute("aria-disabled")).toBe("true");
      expect(day(el, "2026-09-05").hasAttribute("aria-disabled")).toBe(false);
      expect(day(el, "2026-09-26").getAttribute("aria-disabled")).toBe("true");
      expect($<HTMLButtonElement>(el, "[part~=prev]").disabled).toBe(true);
      expect($<HTMLButtonElement>(el, "[part~=next]").disabled).toBe(true);

      const onChange = vi.fn();
      el.addEventListener("change", onChange);
      day(el, "2026-09-04").click();
      expect(el.value).toBe("2026-09-17");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("asks isDateDisabled about each day", () => {
      const el = mount(`value="2026-09-17"`);
      el.isDateDisabled = (iso) => iso.endsWith("-18");
      expect(day(el, "2026-09-18").getAttribute("aria-disabled")).toBe("true");
      expect(day(el, "2026-09-19").hasAttribute("aria-disabled")).toBe(false);
      day(el, "2026-09-18").click();
      expect(el.value).toBe("2026-09-17");
    });

    it("does nothing at all while disabled", () => {
      const el = mount(`value="2026-09-17" disabled`);
      expect(tabbable(el)).toEqual([]);
      day(el, "2026-09-20").click();
      expect(el.value).toBe("2026-09-17");
      expect($<HTMLButtonElement>(el, "[part~=next]").disabled).toBe(true);
    });
  });

  describe("single selection", () => {
    it("selects on click, emitting change and fw-select", () => {
      const el = mount();
      const onChange = vi.fn();
      const onSelect = vi.fn();
      el.addEventListener("change", onChange);
      el.addEventListener("fw-select", onSelect);

      day(el, "2026-09-03").click();

      expect(el.value).toBe("2026-09-03");
      expect(cell(el, "2026-09-03").getAttribute("aria-selected")).toBe("true");
      expect(cell(el, "2026-09-03").hasAttribute("data-selected")).toBe(true);
      expect(cell(el, "2026-09-17").getAttribute("aria-selected")).toBe("false");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0]![0] as CustomEvent).detail).toEqual({ value: "2026-09-03" });

      // Picking it again is still a pick, but not a change.
      day(el, "2026-09-03").click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it("selecting an outside day turns to its month", () => {
      const el = mount(`value="2026-09-17"`);
      const outside = $<HTMLButtonElement>(el, `button[data-date="2026-10-02"][data-outside]`);
      outside.click();
      expect(el.value).toBe("2026-10-02");
      expect(heading(el)).toBe("October 2026");
    });

    it("turns pages with the previous and next buttons", () => {
      const el = mount(`value="2026-09-17"`);
      $<HTMLButtonElement>(el, "[part~=next]").click();
      expect(heading(el)).toBe("October 2026");
      expect(tabbable(el)).toEqual([day(el, "2026-10-17")]);
      $<HTMLButtonElement>(el, "[part~=prev]").click();
      $<HTMLButtonElement>(el, "[part~=prev]").click();
      expect(heading(el)).toBe("August 2026");
      expect(el.value).toBe("2026-09-17");
    });
  });

  describe("range selection", () => {
    it("sets the start, previews on hover, then sets the end", () => {
      const el = mount(`mode="range"`);
      const onSelect = vi.fn();
      el.addEventListener("fw-select", onSelect);

      day(el, "2026-09-10").click();
      expect(el.valueStart).toBe("2026-09-10");
      expect(el.valueEnd).toBe("");
      expect(onSelect).not.toHaveBeenCalled();

      day(el, "2026-09-14").dispatchEvent(
        new MouseEvent("pointerover", { bubbles: true, composed: true }),
      );
      expect(cell(el, "2026-09-12").hasAttribute("data-preview")).toBe(true);
      expect(cell(el, "2026-09-12").getAttribute("aria-selected")).toBe("false");
      expect(cell(el, "2026-09-15").hasAttribute("data-preview")).toBe(false);

      day(el, "2026-09-14").click();
      expect(el.valueEnd).toBe("2026-09-14");
      expect((onSelect.mock.calls[0]![0] as CustomEvent).detail).toEqual({
        start: "2026-09-10",
        end: "2026-09-14",
      });
      expect(cell(el, "2026-09-10").hasAttribute("data-range-start")).toBe(true);
      expect(cell(el, "2026-09-12").hasAttribute("data-in-range")).toBe(true);
      expect(cell(el, "2026-09-12").hasAttribute("data-preview")).toBe(false);
      expect(cell(el, "2026-09-12").getAttribute("aria-selected")).toBe("true");
      expect(cell(el, "2026-09-14").hasAttribute("data-range-end")).toBe(true);
      expect(cell(el, "2026-09-15").getAttribute("aria-selected")).toBe("false");
    });

    it("swaps an end picked before the start, and starts over on a third pick", () => {
      const el = mount(`mode="range"`);
      day(el, "2026-09-20").click();
      day(el, "2026-09-08").click();
      expect([el.valueStart, el.valueEnd]).toEqual(["2026-09-08", "2026-09-20"]);

      day(el, "2026-09-25").click();
      expect([el.valueStart, el.valueEnd]).toEqual(["2026-09-25", ""]);
    });

    it("previews from the keyboard too", () => {
      const el = mount(`mode="range" value-start="2026-09-17"`);
      el.focus();
      key(el, "ArrowRight");
      key(el, "ArrowRight");
      expect(cell(el, "2026-09-18").hasAttribute("data-preview")).toBe(true);
      key(el, "Enter");
      expect([el.valueStart, el.valueEnd]).toEqual(["2026-09-17", "2026-09-19"]);
    });
  });

  it("shows two months side by side without repeating the days between them", () => {
    const el = mount(`value="2026-09-17" months="2"`);
    const [first, second] = [visibleMonth(el, 0), visibleMonth(el, 1)];
    expect(second.hidden).toBe(false);
    expect(heading(el)).toMatch(/September.*October 2026/);
    expect(first.querySelector("[part~=caption]")!.textContent).toBe("September 2026");
    expect(second.querySelector("[part~=caption]")!.textContent).toBe("October 2026");
    // September's trailing October days are left to October's own grid.
    expect(first.querySelector<HTMLButtonElement>(`button[data-date="2026-10-01"]`)!.hidden).toBe(
      true,
    );
    expect(second.querySelector<HTMLButtonElement>(`button[data-date="2026-09-30"]`)!.hidden).toBe(
      true,
    );
    // Its leading August days still show.
    expect(first.querySelector<HTMLButtonElement>(`button[data-date="2026-08-30"]`)!.hidden).toBe(
      false,
    );

    // Moving into the second month does not turn the page; past it does.
    el.focus();
    expect(key(el, "PageDown")).toBe("2026-10-17");
    expect(heading(el)).toMatch(/September.*October 2026/);
    expect(key(el, "PageDown")).toBe("2026-11-17");
    expect(heading(el)).toMatch(/October.*November 2026/);
  });

  it("does date arithmetic on calendar dates", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(startOfWeek("2026-09-17", 1)).toBe("2026-09-14");
    expect(parseDate("9/17/2026", "en-US")).toBe("2026-09-17");
    expect(parseDate("17/09/2026", "en-GB")).toBe("2026-09-17");
    expect(parseDate("17.09.26", "de-DE")).toBe("2026-09-17");
    expect(parseDate("2026-09-17", "de-DE")).toBe("2026-09-17");
    expect(parseDate("Sep 17, 2026", "en-US")).toBe("2026-09-17");
    expect(parseDate("17 septembre 2026", "fr-FR")).toBe("2026-09-17");
    expect(parseDate("2/30/2026", "en-US")).toBeNull();
    expect(parseDate("tomorrow", "en-US")).toBeNull();
  });

  it("leaves nothing behind when removed mid-interaction", () => {
    leaks = trackLeaks();
    const el = mount(`mode="range" months="2" value-start="2026-09-10"`);
    el.focus();
    key(el, "ArrowRight");
    day(el, "2026-09-14").dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true, composed: true }),
    );
    el.remove();
    leaks.assertClean("fw-calendar leaked");
  });
});
