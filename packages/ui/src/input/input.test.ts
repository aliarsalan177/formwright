import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwInput } from "./input.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwInput {
  document.body.innerHTML = html;
  return document.querySelector("fw-input")!;
}
const q = <T extends Element = HTMLElement>(el: FwInput, part: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${part}]`)!;
const inner = (el: FwInput) => q<HTMLInputElement>(el, "input");

function type(el: FwInput, text: string) {
  const input = inner(el);
  input.value = text;
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

describe("fw-input", () => {
  it("labels the real input, so screen readers name it", () => {
    const el = mount(`<fw-input label="Name"></fw-input>`);
    const label = q<HTMLLabelElement>(el, "label");
    expect(label.hidden).toBe(false);
    expect(label.htmlFor).toBe(inner(el).id);
    expect(label.textContent).toContain("Name");
  });

  it("hides the label row when there is no label", () => {
    const el = mount(`<fw-input></fw-input>`);
    expect(q(el, "label").hidden).toBe(true);
  });

  it("uses a slotted label instead of the attribute", async () => {
    const el = mount(`<fw-input><span slot="label">Rich <b>label</b></span></fw-input>`);
    // slotchange is async
    await new Promise((r) => setTimeout(r, 0));
    expect(q(el, "label").hidden).toBe(false);
  });

  it("follows what the user types, and lets `input` through to the host", () => {
    const el = mount(`<fw-input></fw-input>`);
    const seen: string[] = [];
    el.addEventListener("input", () => seen.push(el.value));
    type(el, "Ali");
    expect(el.value).toBe("Ali");
    // The host's value is already updated when outside listeners run.
    expect(seen).toEqual(["Ali"]);
  });

  it("re-emits change from the host, which the browser would not", () => {
    const el = mount(`<fw-input></fw-input>`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    inner(el).dispatchEvent(new Event("change"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("writes a programmatic value into the input", () => {
    const el = mount(`<fw-input value="start"></fw-input>`);
    expect(inner(el).value).toBe("start");
    el.value = "next";
    expect(inner(el).value).toBe("next");
  });

  it("shows an error, marks it invalid and describes the input with it", () => {
    const el = mount(`<fw-input help="Digits only"></fw-input>`);
    el.error = "Already registered";
    const error = q(el, "error");
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe("Already registered");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(inner(el).getAttribute("aria-invalid")).toBe("true");
    expect(inner(el).getAttribute("aria-describedby")).toBe(`${q(el, "help").id} ${error.id}`);

    el.error = null;
    expect(el.hasAttribute("invalid")).toBe(false);
    expect(inner(el).getAttribute("aria-describedby")).toBe(q(el, "help").id);
  });

  it("marks required in the label without reading the asterisk aloud", () => {
    const el = mount(`<fw-input label="Phone" required></fw-input>`);
    const star = el.shadowRoot!.querySelector<HTMLElement>(".required")!;
    expect(star.hidden).toBe(false);
    expect(star.getAttribute("aria-hidden")).toBe("true");
    expect(inner(el).required).toBe(true);
  });

  it("clears on demand, telling listeners", () => {
    const el = mount(`<fw-input clearable value="text"></fw-input>`);
    const clear = q<HTMLButtonElement>(el, "clear");
    expect(clear.hidden).toBe(false);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    clear.click();

    expect(el.value).toBe("");
    expect(onChange).toHaveBeenCalled();
    expect(clear.hidden).toBe(true);
  });

  it("offers show/hide on a password, and only there", () => {
    const el = mount(`<fw-input type="password"></fw-input>`);
    const reveal = q<HTMLButtonElement>(el, "reveal");
    expect(reveal.hidden).toBe(false);
    expect(inner(el).type).toBe("password");

    reveal.click();
    expect(inner(el).type).toBe("text");
    expect(reveal.getAttribute("aria-pressed")).toBe("true");

    el.type = "email";
    expect(reveal.hidden).toBe(true);
  });

  it("passes constraints to the real input", () => {
    const el = mount(`<fw-input type="number" min="0" max="10" maxlength="3" readonly></fw-input>`);
    const input = inner(el);
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("10");
    expect(input.getAttribute("maxlength")).toBe("3");
    expect(input.readOnly).toBe(true);
    expect(el.readOnly).toBe(true);
  });

  it("goes back to its initial value on form reset", () => {
    const el = mount(`<fw-input value="initial"></fw-input>`);
    type(el, "changed");
    el.formResetCallback();
    expect(el.value).toBe("initial");
  });

  it("is disabled by an ancestor fieldset", () => {
    const el = mount(`<fw-input></fw-input>`);
    el.formDisabledCallback(true);
    expect(inner(el).disabled).toBe(true);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`<fw-input type="password" clearable label="x" help="y"></fw-input>`);
    type(el, "abc");
    el.remove();
    leaks.assertClean("fw-input leaked");
  });
});
