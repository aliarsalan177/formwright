import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwTextarea } from "./textarea.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwTextarea {
  document.body.innerHTML = html;
  return document.querySelector("fw-textarea")!;
}
const q = <T extends Element = HTMLElement>(el: FwTextarea, part: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${part}]`)!;
const inner = (el: FwTextarea) => q<HTMLTextAreaElement>(el, "textarea");

function type(el: FwTextarea, text: string) {
  const textarea = inner(el);
  textarea.value = text;
  textarea.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

describe("fw-textarea", () => {
  it("labels the real textarea", () => {
    const el = mount(`<fw-textarea label="Notes"></fw-textarea>`);
    const label = q<HTMLLabelElement>(el, "label");
    expect(label.hidden).toBe(false);
    expect(label.htmlFor).toBe(inner(el).id);
    expect(label.textContent).toContain("Notes");
  });

  it("hides the label row when there is no label", () => {
    const el = mount(`<fw-textarea></fw-textarea>`);
    expect(q(el, "label").hidden).toBe(true);
  });

  it("uses a slotted label instead of the attribute", async () => {
    const el = mount(`<fw-textarea><span slot="label">Rich</span></fw-textarea>`);
    await new Promise((r) => setTimeout(r, 0));
    expect(q(el, "label").hidden).toBe(false);
  });

  it("defaults to three rows and follows the rows attribute", () => {
    const el = mount(`<fw-textarea></fw-textarea>`);
    expect(inner(el).rows).toBe(3);
    el.setAttribute("rows", "6");
    expect(el.rows).toBe(6);
    expect(inner(el).rows).toBe(6);
  });

  it("reflects resize, readonly and size for styling", () => {
    const el = mount(`<fw-textarea readonly></fw-textarea>`);
    expect(el.resize).toBe("vertical");
    expect(inner(el).readOnly).toBe(true);
    el.resize = "none";
    expect(el.getAttribute("resize")).toBe("none");
    el.readOnly = false;
    expect(el.hasAttribute("readonly")).toBe(false);
    el.size = "lg";
    expect(el.getAttribute("size")).toBe("lg");
  });

  it("follows what the user types, and lets `input` through", () => {
    const el = mount(`<fw-textarea></fw-textarea>`);
    const seen: string[] = [];
    el.addEventListener("input", () => seen.push(el.value));
    type(el, "line one\nline two");
    expect(el.value).toBe("line one\nline two");
    expect(seen).toEqual(["line one\nline two"]);
  });

  it("re-emits change from the host", () => {
    const el = mount(`<fw-textarea></fw-textarea>`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    inner(el).dispatchEvent(new Event("change"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("writes a programmatic value into the textarea", () => {
    const el = mount(`<fw-textarea value="start"></fw-textarea>`);
    expect(inner(el).value).toBe("start");
    el.value = "next";
    expect(inner(el).value).toBe("next");
  });

  it("passes constraints to the real textarea", () => {
    const el = mount(`<fw-textarea minlength="2" maxlength="10" required></fw-textarea>`);
    expect(inner(el).getAttribute("minlength")).toBe("2");
    expect(inner(el).getAttribute("maxlength")).toBe("10");
    expect(inner(el).required).toBe(true);
    el.maxlength = null;
    expect(inner(el).hasAttribute("maxlength")).toBe(false);
  });

  it("counts characters against maxlength, politely", () => {
    const el = mount(`<fw-textarea counter maxlength="200"></fw-textarea>`);
    const counter = q(el, "counter");
    expect(counter.hidden).toBe(false);
    expect(counter.getAttribute("aria-live")).toBe("polite");
    expect(counter.textContent).toBe("0 / 200");
    type(el, "hello world!");
    expect(counter.textContent).toBe("12 / 200");
  });

  it("shows no counter without maxlength or without `counter`", () => {
    const el = mount(`<fw-textarea counter></fw-textarea>`);
    expect(q(el, "counter").hidden).toBe(true);
    el.counter = false;
    el.maxlength = 20;
    expect(q(el, "counter").hidden).toBe(true);
  });

  it("shows an error, marks it invalid and describes the textarea with it", () => {
    const el = mount(`<fw-textarea help="Be brief"></fw-textarea>`);
    el.error = "Too vague";
    const error = q(el, "error");
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe("Too vague");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(inner(el).getAttribute("aria-invalid")).toBe("true");
    expect(inner(el).getAttribute("aria-describedby")).toBe(`${q(el, "help").id} ${error.id}`);
    el.error = null;
    expect(el.hasAttribute("invalid")).toBe(false);
  });

  it("grows with its content up to max-rows when autoresize is on", () => {
    const el = mount(`<fw-textarea autoresize max-rows="4"></fw-textarea>`);
    const textarea = inner(el);
    // jsdom has no layout: fix the line metrics and fake the content height.
    const metrics = {
      lineHeight: "20px",
      fontSize: "14px",
      paddingTop: "4px",
      paddingBottom: "4px",
      borderTopWidth: "0px",
      borderBottomWidth: "0px",
    } as CSSStyleDeclaration;
    const spy = vi.spyOn(window, "getComputedStyle").mockReturnValue(metrics);
    let contentHeight = 60;
    Object.defineProperty(textarea, "scrollHeight", { get: () => contentHeight });

    type(el, "a\nb\nc");
    expect(textarea.style.height).toBe("60px");
    expect(textarea.style.overflowY).toBe("hidden");

    contentHeight = 200;
    type(el, "a\nb\nc\nd\ne\nf\ng\nh\ni\nj");
    // Four 20px lines plus 8px of padding.
    expect(textarea.style.height).toBe("88px");
    expect(textarea.style.overflowY).toBe("auto");

    el.autoresize = false;
    expect(textarea.style.height).toBe("");
    spy.mockRestore();
  });

  it("goes back to its initial value on form reset", () => {
    const el = mount(`<fw-textarea value="initial"></fw-textarea>`);
    type(el, "changed");
    el.formResetCallback();
    expect(el.value).toBe("initial");
  });

  it("is disabled by an ancestor fieldset", () => {
    const el = mount(`<fw-textarea></fw-textarea>`);
    el.formDisabledCallback(true);
    expect(inner(el).disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(inner(el).disabled).toBe(false);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(
      `<fw-textarea label="x" help="y" counter maxlength="10" autoresize></fw-textarea>`,
    );
    type(el, "abc");
    el.remove();
    leaks.assertClean("fw-textarea leaked");
  });
});
