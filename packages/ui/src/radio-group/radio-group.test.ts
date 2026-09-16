import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwRadio } from "./radio.js";
import type { FwRadioGroup } from "./radio-group.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const RADIOS = `
  <fw-radio value="a">Alpha</fw-radio>
  <fw-radio value="b" disabled>Bravo</fw-radio>
  <fw-radio value="c">Charlie</fw-radio>
  <fw-radio value="d">Delta</fw-radio>
`;

function mount(attrs = "", radios = RADIOS): FwRadioGroup {
  document.body.innerHTML = `<fw-radio-group ${attrs}>${radios}</fw-radio-group>`;
  return document.querySelector("fw-radio-group")!;
}
const radio = (value: string) => document.querySelector<FwRadio>(`fw-radio[value="${value}"]`)!;
const group = (el: FwRadioGroup) => el.shadowRoot!.querySelector<HTMLElement>("[part~=group]")!;
const q = (el: FwRadioGroup, part: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${part}]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const tabbable = () =>
  [...document.querySelectorAll<FwRadio>("fw-radio")]
    .filter((r) => r.tabIndex === 0)
    .map((r) => r.value);

function stubInternals(el: FwRadioGroup) {
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  Object.assign(internals, { setFormValue, setValidity });
  return { setFormValue, setValidity };
}

describe("fw-radio-group", () => {
  it("exposes a labelled radiogroup with radios as its slotted children", () => {
    const el = mount(`label="Plan" help="Pick one"`);
    const g = group(el);
    expect(g.getAttribute("role")).toBe("radiogroup");
    expect(g.getAttribute("aria-labelledby")).toBe(q(el, "label").id);
    expect(q(el, "label").textContent).toContain("Plan");
    expect(g.getAttribute("aria-describedby")).toBe(q(el, "help").id);
    expect(g.querySelector("slot:not([name])")).not.toBeNull();
    expect(radio("a").getAttribute("role")).toBe("radio");
    expect(radio("a").getAttribute("aria-checked")).toBe("false");
    expect(radio("b").getAttribute("aria-disabled")).toBe("true");
  });

  it("checks the radio matching its value, and follows value changes", () => {
    const el = mount(`value="c"`);
    expect(radio("c").checked).toBe(true);
    expect(radio("c").getAttribute("aria-checked")).toBe("true");
    el.value = "d";
    expect(radio("c").checked).toBe(false);
    expect(radio("d").checked).toBe(true);
    el.setAttribute("value", "a");
    expect(el.value).toBe("a");
    expect(radio("a").hasAttribute("checked")).toBe(true);
  });

  it("adopts a checked radio from the markup when it has no value", () => {
    const el = mount(
      "",
      `<fw-radio value="x">X</fw-radio><fw-radio value="y" checked>Y</fw-radio>`,
    );
    expect(el.value).toBe("y");
    expect(radio("x").checked).toBe(false);
  });

  it("reflects orientation onto the host and the radiogroup", () => {
    const el = mount();
    expect(el.orientation).toBe("vertical");
    el.orientation = "horizontal";
    expect(el.getAttribute("orientation")).toBe("horizontal");
    expect(group(el).getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("makes only one radio tabbable: the checked one, else the first enabled", () => {
    const el = mount();
    expect(tabbable()).toEqual(["a"]);
    el.value = "d";
    expect(tabbable()).toEqual(["d"]);
  });

  it("moves and selects with arrows, skipping disabled and wrapping", () => {
    const el = mount(`value="a"`);
    const events: string[] = [];
    el.addEventListener("input", () => events.push(`input:${el.value}`));
    el.addEventListener("change", () => events.push(`change:${el.value}`));

    radio("a").focus();
    press(radio("a"), "ArrowDown");
    expect(el.value).toBe("c");
    expect(document.activeElement).toBe(radio("c"));
    expect(tabbable()).toEqual(["c"]);

    press(radio("c"), "ArrowRight");
    expect(el.value).toBe("d");
    press(radio("d"), "ArrowDown");
    expect(el.value).toBe("a");
    press(radio("a"), "ArrowUp");
    expect(el.value).toBe("d");
    press(radio("d"), "ArrowLeft");
    expect(el.value).toBe("c");

    expect(events.slice(0, 2)).toEqual(["input:c", "change:c"]);
  });

  it("reverses left and right in a right-to-left context", () => {
    document.body.setAttribute("dir", "rtl");
    try {
      const el = mount(`value="c"`);
      press(radio("c"), "ArrowLeft");
      expect(el.value).toBe("d");
    } finally {
      document.body.removeAttribute("dir");
    }
  });

  it("selects with Space and with a click, ignoring disabled radios", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    press(radio("c"), " ");
    expect(el.value).toBe("c");

    radio("b").click();
    expect(el.value).toBe("c");

    radio("d").click();
    expect(el.value).toBe("d");
    expect(document.activeElement).toBe(radio("d"));

    radio("d").click();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled, including by a fieldset", () => {
    const el = mount(`value="a"`);
    el.formDisabledCallback(true);
    expect(tabbable()).toEqual([]);
    expect(group(el).getAttribute("aria-disabled")).toBe("true");
    press(radio("a"), "ArrowDown");
    radio("c").click();
    expect(el.value).toBe("a");

    el.formDisabledCallback(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    radio("c").click();
    expect(el.value).toBe("a");
  });

  it("keeps up with radios added after it rendered", async () => {
    const el = mount(`value="e"`);
    const late = document.createElement("fw-radio") as FwRadio;
    late.setAttribute("value", "e");
    late.textContent = "Echo";
    el.append(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(late.checked).toBe(true);
    expect(tabbable()).toEqual(["e"]);
  });

  it("submits the value and is missing when required with nothing picked", () => {
    const el = mount(`required name="plan"`);
    const { setFormValue, setValidity } = stubInternals(el);
    el.value = "c";
    expect(setFormValue).toHaveBeenLastCalledWith("c");
    expect(setValidity).toHaveBeenLastCalledWith({});
    el.value = "";
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity.mock.lastCall?.[0]).toEqual({ valueMissing: true });
    expect(group(el).getAttribute("aria-required")).toBe("true");
  });

  it("shows an error and marks the group invalid", () => {
    const el = mount();
    el.error = "Choose a plan";
    expect(q(el, "error").hidden).toBe(false);
    expect(q(el, "error").textContent).toBe("Choose a plan");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(group(el).getAttribute("aria-invalid")).toBe("true");
    expect(group(el).getAttribute("aria-describedby")).toBe(q(el, "error").id);
  });

  it("goes back to its initial value on form reset", () => {
    const el = mount(`value="a"`);
    radio("d").click();
    el.formResetCallback();
    expect(el.value).toBe("a");
    expect(radio("a").checked).toBe(true);
  });

  it("focuses the tabbable radio when the group is focused", () => {
    const el = mount(`value="c"`);
    el.focus();
    expect(document.activeElement).toBe(radio("c"));
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`label="x" help="y" value="a"`);
    press(radio("a"), "ArrowDown");
    radio("d").click();
    el.remove();
    leaks.assertClean("fw-radio-group leaked");
  });
});
