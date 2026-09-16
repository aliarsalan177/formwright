import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwOption } from "./option.js";
import type { FwSelect } from "./select.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const OPTIONS = `
  <fw-option value="apple">Apple</fw-option>
  <fw-option value="banana" disabled>Banana</fw-option>
  <fw-option value="blueberry">Blueberry</fw-option>
  <fw-option value="cherry">Cherry</fw-option>
`;

function mount(attrs = "", options = OPTIONS): FwSelect {
  document.body.innerHTML = `<fw-select ${attrs}>${options}</fw-select><button id="outside">x</button>`;
  return document.querySelector("fw-select")!;
}
const trigger = (el: FwSelect) => el.shadowRoot!.querySelector<HTMLElement>("[role=combobox]")!;
const listbox = (el: FwSelect) => el.shadowRoot!.querySelector<HTMLElement>("[role=listbox]")!;
const display = (el: FwSelect) => el.shadowRoot!.querySelector<HTMLElement>("[part~=display]")!;
const option = (value: string) => document.querySelector<FwOption>(`fw-option[value="${value}"]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));

describe("fw-select", () => {
  it("shows the placeholder, then the chosen option's text", () => {
    const el = mount(`placeholder="Pick a fruit"`);
    expect(display(el).textContent).toBe("Pick a fruit");
    el.value = "cherry";
    expect(display(el).textContent).toBe("Cherry");
    expect(option("cherry").selected).toBe(true);
    expect(option("cherry").getAttribute("aria-selected")).toBe("true");
  });

  it("describes itself as a combobox controlling a listbox", () => {
    const el = mount(`label="Fruit"`);
    const t = trigger(el);
    expect(t.getAttribute("aria-haspopup")).toBe("listbox");
    expect(t.getAttribute("aria-expanded")).toBe("false");
    expect(t.getAttribute("aria-controls")).toBe(listbox(el).id);
    expect(option("apple").getAttribute("role")).toBe("option");
  });

  it("opens from the keyboard and focuses the selected option", () => {
    const el = mount(`value="blueberry"`);
    press(trigger(el), "ArrowDown");
    expect(el.open).toBe(true);
    expect(trigger(el).getAttribute("aria-expanded")).toBe("true");
    expect(listbox(el).hidden).toBe(false);
    expect(document.activeElement).toBe(option("blueberry"));
  });

  it("moves with arrows, skipping disabled options, and chooses with Enter", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    press(trigger(el), "ArrowDown");
    expect(document.activeElement).toBe(option("apple"));
    press(option("apple"), "ArrowDown");
    expect(document.activeElement).toBe(option("blueberry"));
    press(option("blueberry"), "Enter");

    expect(el.value).toBe("blueberry");
    expect(el.open).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without changing the value", () => {
    const el = mount(`value="apple"`);
    press(trigger(el), "Enter");
    press(option("apple"), "ArrowDown");
    press(document.activeElement!, "Escape");
    expect(el.open).toBe(false);
    expect(el.value).toBe("apple");
  });

  it("changes the value by typing while closed, like a native select", () => {
    const el = mount();
    press(trigger(el), "c");
    expect(el.value).toBe("cherry");
    expect(el.open).toBe(false);
  });

  it("chooses with a click and ignores disabled options", () => {
    const el = mount();
    trigger(el).click();
    expect(el.open).toBe(true);

    option("banana").click();
    expect(el.value).toBe("");
    expect(el.open).toBe(true);

    option("apple").click();
    expect(el.value).toBe("apple");
    expect(el.open).toBe(false);
  });

  it("closes when pressing outside, but not when pressing inside", () => {
    // jsdom has no PointerEvent; the handler only reads composedPath().
    const el = mount();
    trigger(el).click();
    option("apple").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(true);

    document
      .getElementById("outside")!
      .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(false);
  });

  it("does not report a change when the same option is picked again", () => {
    const el = mount(`value="apple"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    trigger(el).click();
    option("apple").click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears when clearable", () => {
    const el = mount(`clearable value="apple"`);
    const clear = el.shadowRoot!.querySelector<HTMLButtonElement>("[part~=clear]")!;
    expect(clear.hidden).toBe(false);
    clear.click();
    expect(el.value).toBe("");
    expect(el.open).toBe(false);
  });

  it("keeps up with options added after it rendered", async () => {
    const el = mount(`value="date"`);
    expect(display(el).textContent).toBe("");
    const late = document.createElement("fw-option");
    late.setAttribute("value", "date");
    late.textContent = "Date";
    el.append(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(display(el).textContent).toBe("Date");
  });

  it("will not open while disabled", () => {
    const el = mount(`disabled`);
    trigger(el).click();
    press(trigger(el), "ArrowDown");
    expect(el.open).toBe(false);
    expect(trigger(el).tabIndex).toBe(-1);
  });

  it("returns to its initial value on form reset", () => {
    const el = mount(`value="apple"`);
    el.value = "cherry";
    el.formResetCallback();
    expect(el.value).toBe("apple");
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount(`value="apple" clearable`);
    trigger(el).click();
    press(option("apple"), "ArrowDown");
    el.remove();
    leaks.assertClean("fw-select leaked");
  });
});
