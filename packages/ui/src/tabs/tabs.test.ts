import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwTab } from "./tab.js";
import type { FwTabPanel } from "./tab-panel.js";
import type { FwTabs } from "./tabs.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const CONTENT = `
  <fw-tab slot="nav" panel="general">General</fw-tab>
  <fw-tab slot="nav" panel="billing">Billing</fw-tab>
  <fw-tab slot="nav" panel="danger" disabled>Danger</fw-tab>
  <fw-tab slot="nav" panel="notes">Notes</fw-tab>
  <fw-tab-panel name="general"><input id="name-field"></fw-tab-panel>
  <fw-tab-panel name="billing">Plain text</fw-tab-panel>
  <fw-tab-panel name="danger">Danger</fw-tab-panel>
  <fw-tab-panel name="notes">Notes</fw-tab-panel>
`;

function mount(attrs = "", content = CONTENT): FwTabs {
  document.body.innerHTML = `<fw-tabs ${attrs}>${content}</fw-tabs>`;
  return document.querySelector("fw-tabs")!;
}
const tab = (name: string) => document.querySelector<FwTab>(`fw-tab[panel="${name}"]`)!;
const panel = (name: string) => document.querySelector<FwTabPanel>(`fw-tab-panel[name="${name}"]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-tabs", () => {
  it("renders a tablist with tabs slotted into it and panels below", () => {
    const el = mount();
    const tablist = el.shadowRoot!.querySelector<HTMLElement>("[part~=tablist]")!;
    expect(tablist.getAttribute("role")).toBe("tablist");
    expect(tablist.querySelector("slot[name=nav]")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("[part~=panels] slot:not([name])")).not.toBeNull();
  });

  it("selects the first enabled tab when no value is given", () => {
    const el = mount();
    expect(el.value).toBe("general");
    expect(el.getAttribute("value")).toBe("general");
    expect(tab("general").selected).toBe(true);
    expect(panel("general").hidden).toBe(false);
    expect(panel("billing").hidden).toBe(true);
  });

  it("wires tabs and panels together with ARIA", () => {
    mount(`value="billing"`);
    const t = tab("billing");
    const p = panel("billing");
    expect(t.getAttribute("role")).toBe("tab");
    expect(p.getAttribute("role")).toBe("tabpanel");
    expect(t.getAttribute("aria-selected")).toBe("true");
    expect(tab("general").getAttribute("aria-selected")).toBe("false");
    expect(t.getAttribute("aria-controls")).toBe(p.id);
    expect(p.getAttribute("aria-labelledby")).toBe(t.id);
    expect(tab("danger").getAttribute("aria-disabled")).toBe("true");
  });

  it("uses a roving tabindex: only the selected tab is tabbable", () => {
    const el = mount(`value="billing"`);
    expect(tab("billing").tabIndex).toBe(0);
    expect(tab("general").tabIndex).toBe(-1);
    expect(tab("notes").tabIndex).toBe(-1);
    el.value = "notes";
    expect(tab("notes").tabIndex).toBe(0);
    expect(tab("billing").tabIndex).toBe(-1);
  });

  it("makes a panel tabbable only when it has nothing focusable inside", () => {
    mount();
    expect(panel("general").hasAttribute("tabindex")).toBe(false);
    expect(panel("billing").tabIndex).toBe(0);
  });

  it("pairs tabs and panels set through properties", async () => {
    document.body.innerHTML = "<fw-tabs></fw-tabs>";
    const tabs = document.querySelector("fw-tabs")!;
    for (const name of ["one", "two"]) {
      const tab = document.createElement("fw-tab") as HTMLElement & { panel: string };
      tab.slot = "nav";
      tab.panel = name;
      tab.textContent = name;
      const panel = document.createElement("fw-tab-panel") as HTMLElement & { name: string };
      panel.name = name;
      tabs.append(tab, panel);
    }
    (tabs as HTMLElement & { value: string }).value = "two";
    await new Promise((r) => setTimeout(r, 0));
    expect(tabs.querySelector('fw-tab[panel="two"]')!.hasAttribute("selected")).toBe(true);
    expect((tabs.querySelector('fw-tab-panel[name="one"]') as HTMLElement).hidden).toBe(true);
    expect((tabs.querySelector('fw-tab-panel[name="two"]') as HTMLElement).hidden).toBe(false);
  });

  it("reflects value, orientation and variant", () => {
    const el = mount();
    el.value = "billing";
    expect(el.getAttribute("value")).toBe("billing");
    el.orientation = "vertical";
    expect(el.getAttribute("orientation")).toBe("vertical");
    expect(el.shadowRoot!.querySelector("[part~=tablist]")!.getAttribute("aria-orientation")).toBe(
      "vertical",
    );
    el.setAttribute("variant", "pills");
    expect(el.variant).toBe("pills");
    el.setAttribute("value", "notes");
    expect(el.value).toBe("notes");
    expect(panel("notes").hidden).toBe(false);
  });

  it("selects with arrow keys in auto mode, skipping disabled tabs and wrapping", () => {
    const el = mount();
    const onChange = vi.fn();
    const onShow = vi.fn();
    el.addEventListener("change", onChange);
    el.addEventListener("fw-tab-show", onShow);

    tab("general").focus();
    press(tab("general"), "ArrowRight");
    expect(document.activeElement).toBe(tab("billing"));
    expect(el.value).toBe("billing");

    press(tab("billing"), "ArrowRight");
    expect(document.activeElement).toBe(tab("notes"));
    expect(el.value).toBe("notes");

    press(tab("notes"), "ArrowRight");
    expect(el.value).toBe("general");

    press(tab("general"), "ArrowLeft");
    expect(el.value).toBe("notes");

    expect(onChange).toHaveBeenCalledTimes(4);
    expect((onShow.mock.calls[0]![0] as CustomEvent).detail).toEqual({ name: "billing" });
  });

  it("jumps with Home and End", () => {
    const el = mount(`value="billing"`);
    press(tab("billing"), "End");
    expect(el.value).toBe("notes");
    press(tab("notes"), "Home");
    expect(el.value).toBe("general");
  });

  it("only moves focus in manual mode, selecting on Enter or Space", () => {
    const el = mount(`activation="manual"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    press(tab("general"), "ArrowRight");
    expect(document.activeElement).toBe(tab("billing"));
    expect(el.value).toBe("general");
    expect(onChange).not.toHaveBeenCalled();

    press(tab("billing"), "Enter");
    expect(el.value).toBe("billing");
    press(tab("billing"), "ArrowRight");
    press(tab("notes"), " ");
    expect(el.value).toBe("notes");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("uses Up and Down when vertical, and ignores Left and Right", () => {
    const el = mount(`orientation="vertical"`);
    press(tab("general"), "ArrowRight");
    expect(el.value).toBe("general");
    press(tab("general"), "ArrowDown");
    expect(el.value).toBe("billing");
    press(tab("billing"), "ArrowUp");
    expect(el.value).toBe("general");
  });

  it("reverses Left and Right in right-to-left text", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const style = document.createElement("style");
    style.textContent = "fw-tabs { direction: rtl; }";
    document.head.append(style);
    try {
      const el = mount();
      press(tab("general"), "ArrowLeft");
      expect(el.value).toBe("billing");
      press(tab("billing"), "ArrowRight");
      expect(el.value).toBe("general");
    } finally {
      style.remove();
      document.documentElement.removeAttribute("dir");
    }
  });

  it("selects on click, but not a disabled tab, and not again when already selected", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    tab("danger").click();
    expect(el.value).toBe("general");
    tab("general").click();
    expect(onChange).not.toHaveBeenCalled();

    tab("billing").click();
    expect(el.value).toBe("billing");
    expect(document.activeElement).toBe(tab("billing"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not fire change when value is set programmatically", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    el.value = "billing";
    expect(onChange).not.toHaveBeenCalled();
    expect(panel("billing").hidden).toBe(false);
  });

  it("picks up tabs and panels added later, putting unslotted tabs in the nav", async () => {
    const el = mount(`value="extra"`, `<fw-tab slot="nav" panel="general">General</fw-tab>`);
    const extraTab = document.createElement("fw-tab");
    extraTab.setAttribute("panel", "extra");
    extraTab.textContent = "Extra";
    const extraPanel = document.createElement("fw-tab-panel");
    extraPanel.setAttribute("name", "extra");
    extraPanel.textContent = "Extra content";
    el.append(extraTab, extraPanel);
    await tick();

    el.value = "extra";
    expect(extraTab.getAttribute("slot")).toBe("nav");
    expect(extraTab.getAttribute("aria-selected")).toBe("true");
    expect(extraTab.getAttribute("aria-controls")).toBe(extraPanel.id);
    expect(extraPanel.getAttribute("aria-labelledby")).toBe(extraTab.id);
    expect(extraPanel.hidden).toBe(false);
  });

  it("notices a tab becoming disabled", async () => {
    const el = mount();
    tab("billing").disabled = true;
    await tick();
    press(tab("general"), "ArrowRight");
    expect(el.value).toBe("notes");
  });

  it("names the tablist from label", () => {
    const el = mount(`label="Settings"`);
    expect(el.shadowRoot!.querySelector("[part~=tablist]")!.getAttribute("aria-label")).toBe(
      "Settings",
    );
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount();
    press(tab("general"), "ArrowRight");
    tab("notes").click();
    el.append(document.createElement("fw-tab"));
    await tick();
    el.orientation = "vertical";
    el.remove();
    leaks.assertClean("fw-tabs leaked");
  });
});
