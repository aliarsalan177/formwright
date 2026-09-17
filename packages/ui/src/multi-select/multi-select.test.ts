import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwMultiSelect } from "./multi-select.js";
import type { FwOption } from "../select/option.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const OPTIONS = `
  <fw-option value="mon">Monday</fw-option>
  <fw-option value="tue" disabled>Tuesday</fw-option>
  <fw-option value="wed">Wednesday</fw-option>
  <fw-option value="thu">Thursday</fw-option>
`;

function mount(attrs = "", options = OPTIONS): FwMultiSelect {
  document.body.innerHTML = `<fw-multi-select ${attrs}>${options}</fw-multi-select><button id="outside">x</button>`;
  return document.querySelector("fw-multi-select")!;
}
const part = <T extends HTMLElement = HTMLElement>(el: FwMultiSelect, name: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${name}]`)!;
const trigger = (el: FwMultiSelect) => part(el, "trigger");
const listbox = (el: FwMultiSelect) => part(el, "listbox");
const tags = (el: FwMultiSelect) =>
  [...el.shadowRoot!.querySelectorAll("[part~=tag] .tag-text")].map((t) => t.textContent);
const option = (value: string) => document.querySelector<FwOption>(`fw-option[value="${value}"]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );

describe("fw-multi-select", () => {
  it("parses a comma-separated value attribute into an array and shows chips", () => {
    const el = mount(`value="mon, thu"`);
    expect(el.value).toEqual(["mon", "thu"]);
    expect(tags(el)).toEqual(["Monday", "Thursday"]);
    expect(option("mon").selected).toBe(true);
    expect(option("mon").getAttribute("aria-selected")).toBe("true");
    expect(option("wed").selected).toBe(false);
    // The combobox reads out the choices the chips show.
    expect(trigger(el).textContent).toBe("Monday, Thursday");
  });

  it("shows the placeholder when nothing is chosen", () => {
    const el = mount(`placeholder="Choose days"`);
    expect(trigger(el).textContent).toBe("Choose days");
    expect(tags(el)).toEqual([]);
  });

  it("takes an array property and a later attribute change", () => {
    const el = mount();
    el.value = ["wed"];
    expect(tags(el)).toEqual(["Wednesday"]);
    el.setAttribute("value", "thu,mon");
    expect(el.value).toEqual(["thu", "mon"]);
  });

  it("describes a multi-selectable listbox controlled by a combobox", () => {
    const el = mount(`label="Days"`);
    expect(trigger(el).getAttribute("role")).toBe("combobox");
    expect(trigger(el).getAttribute("aria-controls")).toBe(listbox(el).id);
    expect(trigger(el).getAttribute("aria-expanded")).toBe("false");
    expect(listbox(el).getAttribute("role")).toBe("listbox");
    expect(listbox(el).getAttribute("aria-multiselectable")).toBe("true");
  });

  it("stays open while toggling options from the keyboard", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    press(trigger(el), "ArrowDown");
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(option("mon"));
    press(option("mon"), " ");
    press(option("mon"), "ArrowDown");
    expect(document.activeElement).toBe(option("wed"));
    press(option("wed"), "Enter");

    expect(el.value).toEqual(["mon", "wed"]);
    expect(el.open).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);

    press(option("wed"), "Enter");
    expect(el.value).toEqual(["mon"]);

    press(option("wed"), "Escape");
    expect(el.open).toBe(false);
  });

  it("toggles with clicks, ignoring disabled options", () => {
    const el = mount();
    part(el, "control").click();
    expect(el.open).toBe(true);
    option("tue").click();
    option("thu").click();
    option("mon").click();
    expect(el.value).toEqual(["thu", "mon"]);
    option("thu").click();
    expect(el.value).toEqual(["mon"]);
    expect(el.open).toBe(true);
  });

  it("removes a chip with its button, and the last one with Backspace", () => {
    const el = mount(`value="mon,wed,thu"`);
    const onInput = vi.fn();
    el.addEventListener("input", onInput);
    const removes = el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[part~=tag-remove]");
    expect(removes[1]!.getAttribute("aria-label")).toBe("Remove Wednesday");
    removes[1]!.click();
    expect(el.value).toEqual(["mon", "thu"]);
    expect(el.open).toBe(false);

    press(trigger(el), "Backspace");
    expect(el.value).toEqual(["mon"]);
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it("disables further options at max, and gives them back below it", () => {
    const el = mount(`max="2" value="mon"`);
    part(el, "control").click();
    option("wed").click();
    expect(option("thu").disabled).toBe(true);
    option("thu").click();
    expect(el.value).toEqual(["mon", "wed"]);
    // A chosen option stays usable, so it can be removed.
    expect(option("mon").disabled).toBe(false);

    option("mon").click();
    expect(option("thu").disabled).toBe(false);
    // An option disabled by the author stays disabled.
    expect(option("tue").disabled).toBe(true);
  });

  it("filters with a search box that keeps focus while arrows move", () => {
    const store = new WeakMap<Element, Element | null>();
    Object.defineProperty(Element.prototype, "ariaActiveDescendantElement", {
      configurable: true,
      get(this: Element) {
        return store.get(this) ?? null;
      },
      set(this: Element, value: Element | null) {
        store.set(this, value);
      },
    });
    try {
      const el = mount(`searchable`);
      const search = part<HTMLInputElement>(el, "search");
      expect(search.hidden).toBe(false);
      press(trigger(el), "ArrowDown");
      expect(el.shadowRoot!.activeElement).toBe(search);

      search.value = "day";
      search.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      expect(el.options.filter((o) => !o.hidden)).toHaveLength(4);
      search.value = "th";
      search.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      expect(el.options.filter((o) => !o.hidden).map((o) => o.value)).toEqual(["thu"]);
      expect(option("thu").hasAttribute("data-active")).toBe(true);
      expect(search.ariaActiveDescendantElement).toBe(option("thu"));
      expect(search.hasAttribute("aria-activedescendant")).toBe(false);

      press(search, "Enter");
      expect(el.value).toEqual(["thu"]);
      expect(el.shadowRoot!.activeElement).toBe(search);

      search.value = "zzz";
      search.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      expect(el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="empty"]')!.hidden).toBe(
        false,
      );

      press(search, "Escape");
      expect(el.open).toBe(false);
      // Closing forgets the filter.
      expect(el.options.every((o) => !o.hidden)).toBe(true);
    } finally {
      delete (Element.prototype as unknown as Record<string, unknown>).ariaActiveDescendantElement;
    }
  });

  it("clears everything when clearable", () => {
    const el = mount(`clearable value="mon,wed"`);
    const clear = part<HTMLButtonElement>(el, "clear");
    expect(clear.hidden).toBe(false);
    clear.click();
    expect(el.value).toEqual([]);
    expect(clear.hidden).toBe(true);
    expect(el.open).toBe(false);
  });

  it("closes when pressing outside", () => {
    const el = mount();
    part(el, "control").click();
    option("mon").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(true);
    document
      .getElementById("outside")!
      .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(false);
  });

  it("submits one entry per value", () => {
    const el = mount(`name="days" value="mon,thu"`);
    const internals = (el as unknown as { internals: ElementInternals | null }).internals;
    const calls: unknown[] = [];
    if (internals) {
      (internals as unknown as { setFormValue: (v: unknown) => void }).setFormValue = (v) =>
        calls.push(v);
    }
    el.value = ["wed", "mon"];
    const last = calls[calls.length - 1];
    expect(last).toBeInstanceOf(FormData);
    expect((last as FormData).getAll("days")).toEqual(["wed", "mon"]);
    el.value = [];
    expect(calls[calls.length - 1]).toBeNull();
  });

  it("marks required and shows an error", () => {
    const el = mount(`required label="Days"`);
    expect(trigger(el).getAttribute("aria-required")).toBe("true");
    el.error = "Pick a working day";
    expect(part(el, "error").hidden).toBe(false);
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(trigger(el).getAttribute("aria-describedby")).toBe(part(el, "error").id);
  });

  it("resets to its initial values and is disabled by a fieldset", () => {
    const el = mount(`value="wed"`);
    el.value = ["mon", "thu"];
    el.formResetCallback();
    expect(el.value).toEqual(["wed"]);

    el.formDisabledCallback(true);
    expect(trigger(el).tabIndex).toBe(-1);
    expect(el.shadowRoot!.querySelector("[part~=tag-remove]")).toBeNull();
    part(el, "control").click();
    press(trigger(el), "ArrowDown");
    expect(el.open).toBe(false);
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount(`value="mon" clearable searchable max="2"`);
    press(trigger(el), "ArrowDown");
    const search = part<HTMLInputElement>(el, "search");
    search.value = "w";
    search.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    expect(el.open).toBe(true);
    el.remove();
    leaks.assertClean("fw-multi-select leaked", { strict: true });
  });
});

describe("chips on one row", () => {
  it("scrolls sideways by default and wraps with the wrap attribute", () => {
    const el = mount(`value="a,b"`);
    const tags = el.shadowRoot!.querySelector<HTMLElement>("[part~=tags]")!;
    const styles = (el.constructor as unknown as { styles: string }).styles;
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain(":host([wrap]) .tags { flex-wrap: wrap; overflow: visible; }");
    expect(tags.children).toHaveLength(2);
    el.wrap = true;
    expect(el.hasAttribute("wrap")).toBe(true);
  });
});
