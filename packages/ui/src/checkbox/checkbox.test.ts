import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwCheckbox } from "./checkbox.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwCheckbox {
  document.body.innerHTML = html;
  return document.querySelector("fw-checkbox")!;
}
const q = <T extends Element = HTMLElement>(el: FwCheckbox, part: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${part}]`)!;
const inner = (el: FwCheckbox) => q<HTMLInputElement>(el, "input");

/** What the form would submit, read through a stubbed ElementInternals. */
function stubInternals(el: FwCheckbox) {
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  Object.assign(internals, { setFormValue, setValidity });
  return { setFormValue, setValidity };
}

describe("fw-checkbox", () => {
  it("renders a real checkbox with the label slotted beside it", () => {
    const el = mount(`<fw-checkbox>Accept</fw-checkbox>`);
    expect(inner(el).type).toBe("checkbox");
    expect(q(el, "label").querySelector("slot:not([name])")).not.toBeNull();
    expect(q(el, "label").hidden).toBe(false);
    expect(q(el, "control").getAttribute("aria-hidden")).toBe("true");
  });

  it("hides the label area when there is no label", () => {
    const el = mount(`<fw-checkbox></fw-checkbox>`);
    expect(q(el, "label").hidden).toBe(true);
  });

  it("keeps checked and indeterminate in step with attribute and input", () => {
    const el = mount(`<fw-checkbox checked>x</fw-checkbox>`);
    expect(el.checked).toBe(true);
    expect(inner(el).checked).toBe(true);
    el.checked = false;
    expect(el.hasAttribute("checked")).toBe(false);
    expect(inner(el).checked).toBe(false);
    el.indeterminate = true;
    expect(el.getAttribute("indeterminate")).toBe("");
    expect(inner(el).indeterminate).toBe(true);
    el.setAttribute("size", "lg");
    expect(el.size).toBe("lg");
    expect(el.value).toBe("on");
  });

  it("toggles when the label text is clicked, firing input and change", () => {
    const el = mount(`<fw-checkbox><b>Accept</b></fw-checkbox>`);
    const events: string[] = [];
    el.addEventListener("input", () => events.push(`input:${el.checked}`));
    el.addEventListener("change", () => events.push(`change:${el.checked}`));

    el.querySelector("b")!.click();
    expect(el.checked).toBe(true);
    expect(events).toEqual(["input:true", "change:true"]);

    el.click();
    expect(el.checked).toBe(false);
  });

  it("clears indeterminate when the user toggles", () => {
    const el = mount(`<fw-checkbox indeterminate>All</fw-checkbox>`);
    el.click();
    expect(el.indeterminate).toBe(false);
    expect(el.hasAttribute("indeterminate")).toBe(false);
    expect(el.checked).toBe(true);
  });

  it("does not toggle while disabled, including by a fieldset", () => {
    const el = mount(`<fw-checkbox disabled>x</fw-checkbox>`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    el.click();
    expect(el.checked).toBe(false);
    expect(inner(el).disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();

    el.disabled = false;
    el.formDisabledCallback(true);
    expect(inner(el).disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(inner(el).disabled).toBe(false);
  });

  it("submits its value only while checked, and requires checking when required", () => {
    const el = mount(`<fw-checkbox value="gold" required>x</fw-checkbox>`);
    const { setFormValue, setValidity } = stubInternals(el);

    el.checked = true;
    expect(setFormValue).toHaveBeenLastCalledWith("gold");
    expect(setValidity).toHaveBeenLastCalledWith({});

    el.checked = false;
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity.mock.lastCall?.[0]).toEqual({ valueMissing: true });
    expect(setValidity.mock.lastCall?.[2]).toBe(inner(el));
  });

  it("shows help and an error, describing the input with both", () => {
    const el = mount(`<fw-checkbox help="Optional">x</fw-checkbox>`);
    expect(q(el, "help").hidden).toBe(false);
    expect(q(el, "error").hidden).toBe(true);
    el.error = "Please confirm";
    expect(q(el, "error").textContent).toBe("Please confirm");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(inner(el).getAttribute("aria-invalid")).toBe("true");
    expect(inner(el).getAttribute("aria-describedby")).toBe(
      `${q(el, "help").id} ${q(el, "error").id}`,
    );
  });

  it("goes back to its initial state on form reset", () => {
    const el = mount(`<fw-checkbox checked indeterminate>x</fw-checkbox>`);
    el.click();
    el.checked = false;
    el.formResetCallback();
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(true);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-checkbox help="h" required>x</fw-checkbox>`);
    el.click();
    el.error = "bad";
    el.remove();
    leaks.assertClean("fw-checkbox leaked");
  });
});
