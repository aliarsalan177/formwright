import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwStep } from "./step.js";
import type { FwStepper } from "./stepper.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const STEPS = `
  <fw-step label="Details" description="Name and contact"></fw-step>
  <fw-step label="Plan"></fw-step>
  <fw-step><span slot="label">Payment</span></fw-step>
  <fw-step label="Confirm"></fw-step>
`;

function mount(attrs = "", steps = STEPS): FwStepper {
  document.body.innerHTML = `<fw-stepper ${attrs}>${steps}</fw-stepper>`;
  return document.querySelector("fw-stepper")!;
}
const steps = () => [...document.querySelectorAll<FwStep>("fw-step")];
const at = (i: number) => steps()[i]!;
const trigger = (step: FwStep) => step.shadowRoot!.querySelector<HTMLElement>("[part~=trigger]")!;
const q = (step: FwStep, part: string) =>
  step.shadowRoot!.querySelector<HTMLElement>(`[part~=${part}]`)!;
const click = (step: FwStep) =>
  trigger(step).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-stepper", () => {
  it("renders an ordered list of numbered steps with labels and descriptions", () => {
    const el = mount();
    const list = el.shadowRoot!.querySelector("[part~=list]")!;
    expect(list.tagName).toBe("OL");
    expect(at(0).getAttribute("role")).toBe("listitem");
    expect(q(at(0), "number").textContent).toBe("1");
    expect(q(at(3), "number").textContent).toBe("4");
    expect(q(at(0), "label").textContent).toBe("Details");
    expect(q(at(0), "description").textContent).toBe("Name and contact");
    expect(q(at(1), "description").hidden).toBe(true);
    expect(q(at(0), "connector").getAttribute("aria-hidden")).toBe("true");
    const slot = at(2).shadowRoot!.querySelector<HTMLSlotElement>("slot[name=label]")!;
    expect(slot.assignedElements()[0]!.textContent).toBe("Payment");
  });

  it("derives complete, current and upcoming from value", () => {
    mount(`value="2"`);
    expect(steps().map((s) => s.state)).toEqual(["complete", "complete", "current", "upcoming"]);
    expect(trigger(at(2)).getAttribute("aria-current")).toBe("step");
    expect(trigger(at(1)).hasAttribute("aria-current")).toBe(false);
    expect(document.querySelectorAll("fw-step[current]")).toHaveLength(1);
  });

  it("shows a check when complete and an error mark on error", () => {
    mount(`value="1"`, `<fw-step label="A"></fw-step><fw-step label="B" status="error"></fw-step>`);
    expect(at(0).getAttribute("state")).toBe("complete");
    expect(q(at(0), "indicator").querySelector(".check")).not.toBeNull();
    expect(at(1).getAttribute("state")).toBe("error");
    expect(q(at(1), "indicator").querySelector(".error-icon")).not.toBeNull();
    // Still the current step, even though it is in error.
    expect(trigger(at(1)).getAttribute("aria-current")).toBe("step");
    expect(at(1).shadowRoot!.querySelector(".sr-only")!.textContent).toContain("Error");
    expect(q(at(0), "indicator").getAttribute("aria-hidden")).toBe("true");
  });

  it("honours an explicit complete status ahead of the current step", async () => {
    mount(`value="0"`);
    at(3).status = "complete";
    await tick();
    expect(at(3).state).toBe("complete");
    expect(trigger(at(3)).tagName).toBe("BUTTON");
  });

  it("reflects value and orientation, passing orientation to the steps", () => {
    const el = mount();
    el.value = 3;
    expect(el.getAttribute("value")).toBe("3");
    el.setAttribute("value", "1");
    expect(el.value).toBe(1);
    expect(at(1).current).toBe(true);
    el.orientation = "vertical";
    expect(el.getAttribute("orientation")).toBe("vertical");
    expect(at(0).getAttribute("orientation")).toBe("vertical");
  });

  it("in linear mode makes only completed steps and the current one buttons", () => {
    mount(`value="1"`);
    expect(trigger(at(0)).tagName).toBe("BUTTON");
    expect(trigger(at(1)).tagName).toBe("BUTTON");
    expect(trigger(at(2)).tagName).toBe("DIV");
    expect(trigger(at(3)).tagName).toBe("DIV");
  });

  it("goes back to a completed step on click, emitting change, but not ahead", () => {
    const el = mount(`value="2"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    click(at(3));
    expect(el.value).toBe(2);
    click(at(2));
    expect(onChange).not.toHaveBeenCalled();

    click(at(0));
    expect(el.value).toBe(0);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(at(0).state).toBe("current");
    expect(trigger(at(1)).tagName).toBe("DIV");
  });

  it("lets any step be clicked when linear is false", () => {
    const el = mount(`linear="false"`);
    expect(el.linear).toBe(false);
    expect(steps().every((s) => trigger(s).tagName === "BUTTON")).toBe(true);
    click(at(3));
    expect(el.value).toBe(3);
    el.linear = true;
    expect(trigger(at(3)).tagName).toBe("BUTTON");
    el.value = 0;
    expect(trigger(at(3)).tagName).toBe("DIV");
  });

  it("treats a bare linear attribute as true", () => {
    mount(`linear`);
    expect(trigger(at(1)).tagName).toBe("DIV");
  });

  it("never lets a disabled step be clicked", async () => {
    const el = mount(`value="3"`);
    at(1).disabled = true;
    await tick();
    expect(at(1).hasAttribute("disabled")).toBe(true);
    expect(trigger(at(1)).tagName).toBe("DIV");
    click(at(1));
    expect(el.value).toBe(3);
  });

  it("keeps aria-current on the trigger when it swaps between div and button", async () => {
    mount(`value="1" linear="false"`);
    expect(trigger(at(1)).tagName).toBe("BUTTON");
    at(1).setAttribute("disabled", "");
    await tick();
    expect(trigger(at(1)).tagName).toBe("DIV");
    expect(trigger(at(1)).getAttribute("aria-current")).toBe("step");
  });

  it("numbers and wires steps added later", async () => {
    const el = mount(`value="1"`);
    const late = document.createElement("fw-step");
    late.label = "Done";
    el.append(late);
    await tick();
    expect(q(late, "number").textContent).toBe("5");
    expect(late.state).toBe("upcoming");
    expect(late.getAttribute("role")).toBe("listitem");
  });

  it("names the list from label", () => {
    const el = mount(`label="Registration"`);
    expect(el.shadowRoot!.querySelector("ol")!.getAttribute("aria-label")).toBe("Registration");
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`value="2"`);
    click(at(0));
    at(3).status = "error";
    el.append(document.createElement("fw-step"));
    await tick();
    el.remove();
    leaks.assertClean("fw-stepper leaked");
  });
});
