import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwTagsInput } from "./tags-input.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(attrs = ""): FwTagsInput {
  document.body.innerHTML = `<fw-tags-input ${attrs}></fw-tags-input>`;
  return document.querySelector("fw-tags-input")!;
}
const part = <T extends HTMLElement = HTMLElement>(el: FwTagsInput, name: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${name}]`)!;
const input = (el: FwTagsInput) => part<HTMLInputElement>(el, "input");
const chips = (el: FwTagsInput) =>
  [...el.shadowRoot!.querySelectorAll("[part~=tag] .tag-text")].map((t) => t.textContent);
const press = (el: FwTagsInput, key: string) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  input(el).dispatchEvent(event);
  return event;
};
function type(el: FwTagsInput, text: string) {
  input(el).value = text;
  input(el).dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}
function paste(el: FwTagsInput, text: string) {
  // jsdom has no ClipboardEvent data; a plain event with a fake clipboard.
  const event = new Event("paste", { bubbles: true, composed: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (type: string) => (type === "text/plain" || type === "text" ? text : "") },
  });
  input(el).dispatchEvent(event);
  return event;
}

describe("fw-tags-input", () => {
  it("renders tags from a comma-separated or JSON value attribute", () => {
    const el = mount(`value="yoga, pilates"`);
    expect(el.value).toEqual(["yoga", "pilates"]);
    expect(chips(el)).toEqual(["yoga", "pilates"]);
    expect(part(el, "tags").getAttribute("role")).toBe("list");

    el.setAttribute("value", `["a,b","c"]`);
    expect(el.value).toEqual(["a,b", "c"]);
  });

  it("labels the text box", () => {
    const el = mount(`label="Skills"`);
    expect(part<HTMLLabelElement>(el, "label").htmlFor).toBe(input(el).id);
  });

  it("adds the typed text on Enter and emits the events in order", () => {
    const el = mount();
    const seen: string[] = [];
    el.addEventListener("fw-tag-add", (e) => seen.push(`add:${(e as CustomEvent).detail.value}`));
    el.addEventListener("input", () => seen.push(`input:${el.value.join("|")}`));
    el.addEventListener("change", () => seen.push("change"));

    type(el, "  boxing ");
    expect(seen).toEqual([]);
    const event = press(el, "Enter");
    expect(event.defaultPrevented).toBe(true);
    expect(el.value).toEqual(["boxing"]);
    expect(input(el).value).toBe("");
    expect(seen).toEqual(["add:boxing", "input:boxing", "change"]);
  });

  it("adds on a separator key and on a separator arriving through input", () => {
    const el = mount(`separators=",;"`);
    type(el, "one");
    press(el, ";");
    expect(el.value).toEqual(["one"]);

    // e.g. a mobile keyboard that sends no keydown for the character
    type(el, "two,thr");
    expect(el.value).toEqual(["one", "two"]);
    expect(input(el).value).toBe("thr");
  });

  it("removes the last tag with Backspace in an empty box", () => {
    const el = mount(`value="a,b"`);
    const removed = vi.fn();
    el.addEventListener("fw-tag-remove", (e) => removed((e as CustomEvent).detail.value));
    input(el).setSelectionRange(0, 0);
    press(el, "Backspace");
    expect(el.value).toEqual(["a"]);
    expect(removed).toHaveBeenCalledWith("b");

    type(el, "x");
    input(el).setSelectionRange(1, 1);
    press(el, "Backspace");
    expect(el.value).toEqual(["a"]);
  });

  it("removes a tag with its button", () => {
    const el = mount(`value="a,b,c"`);
    const buttons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[part~=tag-remove]");
    expect(buttons[1]!.getAttribute("aria-label")).toBe("Remove b");
    buttons[1]!.click();
    expect(el.value).toEqual(["a", "c"]);
  });

  it("lets listeners cancel adding and removing", () => {
    const el = mount(`value="keep"`);
    el.addEventListener("fw-tag-add", (e) => {
      if ((e as CustomEvent).detail.value === "nope") e.preventDefault();
    });
    el.addEventListener("fw-tag-remove", (e) => e.preventDefault());
    type(el, "nope");
    press(el, "Enter");
    expect(el.value).toEqual(["keep"]);
    expect(input(el).value).toBe("nope");

    type(el, "");
    press(el, "Backspace");
    expect(el.value).toEqual(["keep"]);
  });

  it("splits pasted text on separators and new lines", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    const event = paste(el, "red, green\nblue\r\n");
    expect(event.defaultPrevented).toBe(true);
    expect(el.value).toEqual(["red", "green", "blue"]);
    expect(onChange).toHaveBeenCalledTimes(1);

    // A plain word is left to the browser to paste.
    expect(paste(el, "violet").defaultPrevented).toBe(false);
  });

  it("refuses duplicates ignoring case, unless allowed", () => {
    const el = mount(`value="Yoga"`);
    type(el, "yoga");
    press(el, "Enter");
    expect(el.value).toEqual(["Yoga"]);
    expect(input(el).value).toBe("yoga");
    expect(part(el, "error").hidden).toBe(false);

    el.allowDuplicates = true;
    press(el, "Enter");
    expect(el.value).toEqual(["Yoga", "yoga"]);
    expect(part(el, "error").hidden).toBe(true);
  });

  it("keeps text that fails the pattern in the box and shows an error", () => {
    const el = mount(`pattern="[^@\\s]+@[^@\\s]+"`);
    paste(el, "a@x.com, not-an-email, b@y.com");
    expect(el.value).toEqual(["a@x.com", "b@y.com"]);
    expect(input(el).value).toBe("not-an-email");
    expect(el.hasAttribute("invalid")).toBe(true);
    expect(input(el).getAttribute("aria-invalid")).toBe("true");
    expect(part(el, "error").textContent).toContain("not-an-email");

    // Editing the text clears the complaint.
    type(el, "c@z.com");
    expect(el.hasAttribute("invalid")).toBe(false);
    press(el, "Enter");
    expect(el.value).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });

  it("stops at max", () => {
    const el = mount(`max="2" value="a"`);
    paste(el, "b,c,d");
    expect(el.value).toEqual(["a", "b"]);
    expect(input(el).value).toBe("c, d");
    expect(part(el, "error").textContent).toContain("2");
  });

  it("announces additions and removals", () => {
    const el = mount();
    const status = el.shadowRoot!.querySelector("[role=status]")!;
    type(el, "x");
    press(el, "Enter");
    expect(status.textContent).toBe("Added x");
  });

  it("submits one entry per tag", () => {
    const el = mount(`name="skills"`);
    const internals = (el as unknown as { internals: ElementInternals | null }).internals;
    const calls: unknown[] = [];
    if (internals) {
      (internals as unknown as { setFormValue: (v: unknown) => void }).setFormValue = (v) =>
        calls.push(v);
    }
    el.value = ["a", "b"];
    const last = calls[calls.length - 1];
    expect(last).toBeInstanceOf(FormData);
    expect((last as FormData).getAll("skills")).toEqual(["a", "b"]);
  });

  it("resets, and is disabled by a fieldset", () => {
    const el = mount(`value="a" required`);
    type(el, "b");
    press(el, "Enter");
    type(el, "half");
    el.formResetCallback();
    expect(el.value).toEqual(["a"]);
    expect(input(el).value).toBe("");

    el.formDisabledCallback(true);
    expect(input(el).disabled).toBe(true);
    expect(el.shadowRoot!.querySelector("[part~=tag-remove]")).toBeNull();
  });

  it("leaves nothing behind when removed mid-edit", () => {
    leaks = trackLeaks();
    const el = mount(`value="a,b" pattern="[a-z]+" label="Tags"`);
    input(el).focus();
    type(el, "c");
    press(el, "Enter");
    type(el, "BAD");
    press(el, "Enter");
    expect(el.hasAttribute("invalid")).toBe(true);
    el.remove();
    leaks.assertClean("fw-tags-input leaked", { strict: true });
  });
});
