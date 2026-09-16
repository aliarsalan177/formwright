import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwCombobox } from "./combobox.js";
import type { FwOption } from "../select/option.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
  vi.useRealTimers();
});

const OPTIONS = `
  <fw-option value="apple">Apple</fw-option>
  <fw-option value="banana" disabled>Banana</fw-option>
  <fw-option value="blueberry">Blueberry</fw-option>
  <fw-option value="cherry">Cherry</fw-option>
  <fw-option value="pineapple">Pineapple</fw-option>
`;

function mount(attrs = "", options = OPTIONS): FwCombobox {
  document.body.innerHTML = `<fw-combobox ${attrs}>${options}</fw-combobox><button id="outside">x</button>`;
  return document.querySelector("fw-combobox")!;
}
const input = (el: FwCombobox) => el.shadowRoot!.querySelector<HTMLInputElement>("[part~=input]")!;
const listbox = (el: FwCombobox) => el.shadowRoot!.querySelector<HTMLElement>("[role=listbox]")!;
const part = (el: FwCombobox, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;
const option = (value: string) => document.querySelector<FwOption>(`fw-option[value="${value}"]`)!;
const visible = (el: FwCombobox) => el.options.filter((o) => !o.hidden).map((o) => o.value);
const active = () => document.querySelector<FwOption>("fw-option[data-active]");
const press = (target: Element, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, ...init }),
  );
function type(el: FwCombobox, text: string) {
  const i = input(el);
  i.value = text;
  i.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

describe("fw-combobox", () => {
  it("is an editable combobox labelled by its label and controlling a listbox", () => {
    const el = mount(`label="Fruit" placeholder="Search"`);
    const i = input(el);
    expect(i.getAttribute("role")).toBe("combobox");
    expect(i.getAttribute("aria-autocomplete")).toBe("list");
    expect(i.getAttribute("aria-expanded")).toBe("false");
    expect(i.getAttribute("aria-controls")).toBe(listbox(el).id);
    expect(part(el, "label").getAttribute("for")).toBe(i.id);
    expect(i.placeholder).toBe("Search");
    expect(listbox(el).hidden).toBe(true);
  });

  it("shows the chosen option's text in the input", () => {
    const el = mount(`value="cherry"`);
    expect(input(el).value).toBe("Cherry");
    expect(option("cherry").selected).toBe(true);
    el.value = "apple";
    expect(input(el).value).toBe("Apple");
  });

  it("opens and filters by 'contains' as the user types, keeping focus in the input", () => {
    const el = mount();
    input(el).focus();
    type(el, "app");
    expect(el.open).toBe(true);
    expect(input(el).getAttribute("aria-expanded")).toBe("true");
    expect(visible(el)).toEqual(["apple", "pineapple"]);
    expect(el.shadowRoot!.activeElement).toBe(input(el));
    // The first match is highlighted so Enter takes it.
    expect(active()).toBe(option("apple"));
  });

  it("filters by 'starts-with'", () => {
    const el = mount(`filter="starts-with"`);
    type(el, "app");
    expect(visible(el)).toEqual(["apple"]);
  });

  it("leaves filtering to the app with filter='none'", () => {
    const el = mount(`filter="none"`);
    type(el, "zzz");
    expect(visible(el)).toHaveLength(5);
  });

  it("shows 'No results' when nothing matches, and not while loading", () => {
    const el = mount();
    type(el, "kiwi");
    const empty = part(el, "empty");
    expect(visible(el)).toEqual([]);
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toContain("No results");

    el.loading = true;
    expect(empty.hidden).toBe(true);
    expect(listbox(el).getAttribute("aria-busy")).toBe("true");
    expect(part(el, "spinner").hidden).toBe(false);
    el.loading = false;
    expect(listbox(el).hasAttribute("aria-busy")).toBe(false);
    expect(part(el, "spinner").hidden).toBe(true);
  });

  it("moves with arrows, skipping disabled options, and commits with Enter", () => {
    const el = mount();
    const onInput = vi.fn();
    const onChange = vi.fn();
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);

    press(input(el), "ArrowDown");
    expect(el.open).toBe(true);
    expect(active()).toBe(option("apple"));
    press(input(el), "ArrowDown");
    expect(active()).toBe(option("blueberry"));
    press(input(el), "ArrowUp");
    expect(active()).toBe(option("apple"));
    press(input(el), "ArrowUp");
    expect(active()).toBe(option("pineapple"));
    press(input(el), "Enter");

    expect(el.value).toBe("pineapple");
    expect(input(el).value).toBe("Pineapple");
    expect(el.open).toBe(false);
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(active()).toBeNull();
  });

  it("does not let the inner input's typing events pose as value changes", () => {
    const el = mount();
    const onInput = vi.fn();
    el.addEventListener("input", onInput);
    type(el, "ch");
    expect(onInput).not.toHaveBeenCalled();
  });

  it("points the input at the active option with element reflection when supported", () => {
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
      const el = mount();
      press(input(el), "ArrowDown");
      press(input(el), "ArrowDown");
      expect(input(el).ariaActiveDescendantElement).toBe(option("blueberry"));
      // Never an id reference across the shadow boundary.
      expect(input(el).hasAttribute("aria-activedescendant")).toBe(false);
      press(input(el), "Escape");
      expect(input(el).ariaActiveDescendantElement).toBeNull();
    } finally {
      delete (Element.prototype as unknown as Record<string, unknown>).ariaActiveDescendantElement;
    }
  });

  it("closes on Escape, then clears on a second Escape", () => {
    const el = mount(`value="apple"`);
    press(input(el), "ArrowDown");
    const first = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    const outer = vi.fn();
    document.body.addEventListener("keydown", outer);
    input(el).dispatchEvent(first);
    expect(el.open).toBe(false);
    expect(el.value).toBe("apple");
    expect(outer).not.toHaveBeenCalled();

    press(input(el), "Escape");
    expect(input(el).value).toBe("");
    expect(el.value).toBe("");
    document.body.removeEventListener("keydown", outer);
  });

  it("commits on Tab only when the option was reached with the arrows", () => {
    const el = mount();
    type(el, "che");
    expect(active()).toBe(option("cherry"));
    press(input(el), "Tab");
    expect(el.value).toBe("");
    expect(el.open).toBe(false);

    type(el, "b");
    press(input(el), "ArrowDown");
    press(input(el), "Tab");
    expect(el.value).toBe("blueberry");
  });

  it("puts the committed text back on blur without a commit", () => {
    const el = mount(`value="apple"`);
    input(el).focus();
    type(el, "cher");
    input(el).blur();
    expect(el.open).toBe(false);
    expect(input(el).value).toBe("Apple");
    expect(el.value).toBe("apple");
  });

  it("keeps free text as the value with allow-custom", () => {
    const el = mount(`allow-custom`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    type(el, "Kiwi");
    // No automatic highlight, so Enter keeps what was typed.
    expect(active()).toBeNull();
    press(input(el), "Enter");
    expect(el.value).toBe("Kiwi");
    expect(onChange).toHaveBeenCalledTimes(1);

    // Text matching an option's label takes that option's value.
    type(el, "cherry");
    press(input(el), "Enter");
    expect(el.value).toBe("cherry");
    expect(input(el).value).toBe("Cherry");

    // And blur commits free text rather than discarding it.
    input(el).focus();
    type(el, "Mango");
    input(el).blur();
    expect(el.value).toBe("Mango");
  });

  it("chooses with a click, ignoring disabled options, without stealing focus", () => {
    const el = mount();
    type(el, "b");
    const down = new MouseEvent("mousedown", { bubbles: true, composed: true, cancelable: true });
    option("blueberry").dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);

    option("banana").click();
    expect(el.value).toBe("");
    option("blueberry").click();
    expect(el.value).toBe("blueberry");
    expect(el.open).toBe(false);
  });

  it("emits fw-search after the debounce, once per pause", () => {
    vi.useFakeTimers();
    const el = mount(`debounce="200" filter="none"`);
    const queries: string[] = [];
    el.addEventListener("fw-search", (e) => queries.push((e as CustomEvent).detail.query));
    type(el, "c");
    type(el, "ch");
    vi.advanceTimersByTime(150);
    expect(queries).toEqual([]);
    type(el, "che");
    vi.advanceTimersByTime(200);
    expect(queries).toEqual(["che"]);
  });

  it("waits for min-chars before searching or opening", () => {
    const el = mount(`min-chars="2"`);
    const onSearch = vi.fn();
    el.addEventListener("fw-search", onSearch);
    type(el, "c");
    expect(el.open).toBe(false);
    expect(onSearch).not.toHaveBeenCalled();
    type(el, "ch");
    expect(el.open).toBe(true);
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ detail: { query: "ch" } }));
  });

  it("re-filters options added while open, without touching the typed text", async () => {
    const el = mount(``, "");
    type(el, "da");
    expect(part(el, "empty").hidden).toBe(false);
    const late = document.createElement("fw-option");
    late.setAttribute("value", "date");
    late.textContent = "Date";
    el.append(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(visible(el)).toEqual(["date"]);
    expect(part(el, "empty").hidden).toBe(true);
    expect(input(el).value).toBe("da");
  });

  it("clears when clearable", () => {
    const el = mount(`clearable value="apple"`);
    const clear = part(el, "clear") as HTMLButtonElement;
    expect(clear.hidden).toBe(false);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    clear.click();
    expect(el.value).toBe("");
    expect(input(el).value).toBe("");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("closes when pressing outside", () => {
    const el = mount();
    part(el, "toggle").click();
    expect(el.open).toBe(true);
    option("apple").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(true);
    document
      .getElementById("outside")!
      .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(false);
  });

  it("reports valueMissing through required and shows the error", () => {
    const el = mount(`required label="Fruit" help="Pick one"`);
    el.error = "Not in season";
    expect(part(el, "error").hidden).toBe(false);
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(input(el).getAttribute("aria-invalid")).toBe("true");
    expect(input(el).getAttribute("aria-required")).toBe("true");
    expect(input(el).getAttribute("aria-describedby")).toContain(part(el, "error").id);
  });

  it("resets to its initial value and is disabled by a fieldset", () => {
    const el = mount(`value="apple"`);
    type(el, "che");
    press(input(el), "Enter");
    expect(el.value).toBe("cherry");
    el.formResetCallback();
    expect(el.value).toBe("apple");
    expect(input(el).value).toBe("Apple");

    el.formDisabledCallback(true);
    expect(input(el).disabled).toBe(true);
    press(input(el), "ArrowDown");
    expect(el.open).toBe(false);
  });

  it("leaves nothing behind when removed while open and mid-search", () => {
    leaks = trackLeaks();
    const el = mount(`clearable debounce="300" value="apple"`);
    input(el).focus();
    type(el, "b");
    press(input(el), "ArrowDown");
    expect(el.open).toBe(true);
    el.remove();
    leaks.assertClean("fw-combobox leaked", { strict: true });
  });
});
