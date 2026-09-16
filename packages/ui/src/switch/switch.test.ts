import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwSwitch } from "./switch.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwSwitch {
  document.body.innerHTML = html;
  return document.querySelector("fw-switch")!;
}
const q = <T extends Element = HTMLElement>(el: FwSwitch, part: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${part}]`)!;
const inner = (el: FwSwitch) => q<HTMLInputElement>(el, "input");

function stubInternals(el: FwSwitch) {
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  Object.assign(internals, { setFormValue, setValidity });
  return { setFormValue, setValidity };
}

describe("fw-switch", () => {
  it("renders a native checkbox with switch semantics and a drawn track", () => {
    const el = mount(`<fw-switch>Wi-Fi</fw-switch>`);
    expect(inner(el).type).toBe("checkbox");
    expect(inner(el).getAttribute("role")).toBe("switch");
    expect(inner(el).getAttribute("aria-checked")).toBe("false");
    expect(q(el, "control").getAttribute("aria-hidden")).toBe("true");
    expect(q(el, "thumb")).not.toBeNull();
    expect(q(el, "label").hidden).toBe(false);
  });

  it("keeps checked in step with attribute, property and input", () => {
    const el = mount(`<fw-switch checked>x</fw-switch>`);
    expect(el.checked).toBe(true);
    expect(inner(el).checked).toBe(true);
    expect(inner(el).getAttribute("aria-checked")).toBe("true");
    el.checked = false;
    expect(el.hasAttribute("checked")).toBe(false);
    expect(inner(el).checked).toBe(false);
    el.removeAttribute("checked");
    el.setAttribute("checked", "");
    expect(el.checked).toBe(true);
  });

  it("reflects label-position and size for styling", () => {
    const el = mount(`<fw-switch>x</fw-switch>`);
    expect(el.labelPosition).toBe("end");
    el.labelPosition = "start";
    expect(el.getAttribute("label-position")).toBe("start");
    el.setAttribute("size", "sm");
    expect(el.size).toBe("sm");
  });

  it("toggles when the label is clicked, firing input then change", () => {
    const el = mount(`<fw-switch><i>Dark mode</i></fw-switch>`);
    const events: string[] = [];
    el.addEventListener("input", () => events.push(`input:${el.checked}`));
    el.addEventListener("change", () => events.push(`change:${el.checked}`));
    el.querySelector("i")!.click();
    expect(el.checked).toBe(true);
    expect(events).toEqual(["input:true", "change:true"]);
  });

  it("focuses the native checkbox, which gives Space-to-toggle for free", () => {
    // jsdom does not synthesise a click from a key press; a browser does.
    const el = mount(`<fw-switch>x</fw-switch>`);
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(inner(el));
    inner(el).click();
    expect(el.checked).toBe(true);
  });

  it("does not toggle while disabled, including by a fieldset", () => {
    const el = mount(`<fw-switch disabled>x</fw-switch>`);
    el.click();
    expect(el.checked).toBe(false);
    el.disabled = false;
    el.formDisabledCallback(true);
    expect(inner(el).disabled).toBe(true);
    el.click();
    expect(el.checked).toBe(false);
  });

  it("submits its value only while on, and is missing when required and off", () => {
    const el = mount(`<fw-switch value="yes" required>x</fw-switch>`);
    const { setFormValue, setValidity } = stubInternals(el);
    el.click();
    expect(setFormValue).toHaveBeenLastCalledWith("yes");
    expect(setValidity).toHaveBeenLastCalledWith({});
    el.click();
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity.mock.lastCall?.[0]).toEqual({ valueMissing: true });
  });

  it("shows help and describes the input with it", () => {
    const el = mount(`<fw-switch help="Applies everywhere">x</fw-switch>`);
    expect(q(el, "help").hidden).toBe(false);
    expect(inner(el).getAttribute("aria-describedby")).toBe(q(el, "help").id);
    el.help = null;
    expect(q(el, "help").hidden).toBe(true);
    expect(inner(el).hasAttribute("aria-describedby")).toBe(false);
  });

  it("goes back to its initial state on form reset", () => {
    const el = mount(`<fw-switch>x</fw-switch>`);
    el.click();
    el.formResetCallback();
    expect(el.checked).toBe(false);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-switch help="h" label-position="start">x</fw-switch>`);
    el.click();
    el.remove();
    leaks.assertClean("fw-switch leaked");
  });
});
