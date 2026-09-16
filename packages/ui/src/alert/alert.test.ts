import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwAlert } from "./alert.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwAlert {
  document.body.innerHTML = html;
  return document.querySelector("fw-alert")!;
}

const part = (el: FwAlert, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-alert", () => {
  it("renders heading and message", () => {
    const el = mount(`<fw-alert heading="Renewed">Valid until June.</fw-alert>`);
    expect(part(el, "heading").hidden).toBe(false);
    expect(part(el, "heading").textContent).toBe("Renewed");
    expect(part(el, "message").hidden).toBe(false);
    expect(part(el, "actions").hidden).toBe(true);
  });

  it("uses a polite status role for info and success, alert for warning and danger", () => {
    const el = mount(`<fw-alert>x</fw-alert>`);
    expect(el.tone).toBe("info");
    expect(part(el, "base").getAttribute("role")).toBe("status");
    el.tone = "success";
    expect(part(el, "base").getAttribute("role")).toBe("status");
    el.tone = "warning";
    expect(el.getAttribute("tone")).toBe("warning");
    expect(part(el, "base").getAttribute("role")).toBe("alert");
    el.setAttribute("tone", "danger");
    expect(part(el, "base").getAttribute("role")).toBe("alert");
  });

  it("shows a decorative default icon per tone", () => {
    const el = mount(`<fw-alert>x</fw-alert>`);
    const icon = part(el, "icon");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    const info = icon.innerHTML;
    expect(icon.querySelector("svg")).not.toBeNull();
    el.tone = "danger";
    expect(icon.innerHTML).not.toBe(info);
  });

  it("uses slotted heading and actions", async () => {
    const el = mount(
      `<fw-alert><strong slot="heading">Offline</strong>Manual check-ins.<button slot="actions">Retry</button></fw-alert>`,
    );
    expect(part(el, "heading").hidden).toBe(false);
    expect(part(el, "actions").hidden).toBe(false);
    el.querySelector("[slot=actions]")!.remove();
    await tick();
    expect(part(el, "actions").hidden).toBe(true);
  });

  it("shows a close button only when dismissible", () => {
    const el = mount(`<fw-alert>x</fw-alert>`);
    const close = part(el, "close") as HTMLButtonElement;
    expect(close.hidden).toBe(true);
    el.dismissible = true;
    expect(el.hasAttribute("dismissible")).toBe(true);
    expect(close.hidden).toBe(false);
    expect(close.getAttribute("aria-label")).toBe("Dismiss");
  });

  it("emits a cancelable fw-dismiss and hides itself", () => {
    const el = mount(`<fw-alert dismissible>x</fw-alert>`);
    const handler = vi.fn();
    el.addEventListener("fw-dismiss", handler);
    part(el, "close").click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]![0] as Event).cancelable).toBe(true);
    expect(el.hidden).toBe(true);
  });

  it("stays when fw-dismiss is prevented", () => {
    const el = mount(`<fw-alert dismissible>x</fw-alert>`);
    el.addEventListener("fw-dismiss", (e) => e.preventDefault());
    part(el, "close").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(el.hidden).toBe(false);
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`<fw-alert dismissible heading="x">y</fw-alert>`);
    el.addEventListener("fw-dismiss", (e) => e.preventDefault());
    part(el, "close").click();
    el.tone = "danger";
    el.append(document.createElement("button"));
    await tick();
    el.remove();
    leaks.assertClean("fw-alert leaked");
  });
});
