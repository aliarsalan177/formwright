import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import { resetScrollLock } from "@formwright/ui-core";
import "./index.js";
import type { FwCommand } from "./command.js";
import type { FwCommandGroup } from "./command-group.js";
import { parseHotkey, type FwCommandPalette } from "./command-palette.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  resetScrollLock();
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const COMMANDS = `
  <fw-command-group heading="Members">
    <fw-command value="add-member" keywords="new, join" shortcut="Ctrl M"><span slot="prefix">+</span>Add member</fw-command>
    <fw-command value="find-member">Find member</fw-command>
  </fw-command-group>
  <fw-command-group heading="Billing">
    <fw-command value="invoice">Create invoice</fw-command>
    <fw-command value="refund" disabled>Issue refund</fw-command>
  </fw-command-group>
  <fw-command value="settings" keywords="preferences">Settings</fw-command>
`;

function mount(attrs = ""): FwCommandPalette {
  document.body.innerHTML = `<button id="before">Open</button><fw-command-palette ${attrs}>${COMMANDS}</fw-command-palette>`;
  return document.querySelector("fw-command-palette")!;
}
const part = <T extends Element = HTMLElement>(el: FwCommandPalette, name: string) =>
  el.shadowRoot!.querySelector<T>(`[part~=${name}]`)!;
const input = (el: FwCommandPalette) => part<HTMLInputElement>(el, "input");
const dialog = (el: FwCommandPalette) => part(el, "dialog");
const command = (value: string) =>
  document.querySelector<FwCommand>(`fw-command[value="${value}"]`)!;
const group = (heading: string) =>
  document.querySelector<FwCommandGroup>(`fw-command-group[heading="${heading}"]`)!;
const activeValue = () => document.querySelector<FwCommand>("fw-command[data-active]")?.value;
const visibleValues = () =>
  [...document.querySelectorAll<FwCommand>("fw-command:not([data-filtered])")].map((c) => c.value);
const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, ...init }),
  );
function search(el: FwCommandPalette, text: string) {
  input(el).value = text;
  input(el).dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

describe("fw-command-palette", () => {
  it("is a closed dialog until opened", () => {
    const el = mount();
    expect(el.open).toBe(false);
    expect(dialog(el).hasAttribute("open")).toBe(false);
    expect(dialog(el).getAttribute("aria-label")).toBe("Command palette");
    expect(input(el).placeholder).toBe("Type a command or search…");
    expect(command("add-member").getAttribute("role")).toBe("option");
    expect(group("Members").getAttribute("role")).toBe("group");
    expect(group("Members").getAttribute("aria-label")).toBe("Members");
  });

  it("opens on the hotkey, focuses the search and marks the first command active", () => {
    const el = mount();
    const onShow = vi.fn();
    el.addEventListener("fw-show", onShow);
    document.getElementById("before")!.focus();

    press(document.body, "k", { ctrlKey: true });

    expect(el.open).toBe(true);
    expect(dialog(el).hasAttribute("open")).toBe(true);
    expect(el.shadowRoot!.activeElement).toBe(input(el));
    expect(activeValue()).toBe("add-member");
    expect(command("add-member").getAttribute("aria-selected")).toBe("true");
    expect(onShow).toHaveBeenCalledTimes(1);

    // The same hotkey closes it again.
    press(input(el), "k", { ctrlKey: true });
    expect(el.open).toBe(false);
  });

  it("uses a custom hotkey, and none when it is empty", () => {
    const el = mount(`hotkey="shift+alt+p"`);
    press(document.body, "k", { ctrlKey: true });
    expect(el.open).toBe(false);
    press(document.body, "P", { shiftKey: true, altKey: true, code: "KeyP" });
    expect(el.open).toBe(true);
    el.open = false;

    el.hotkey = "";
    press(document.body, "P", { shiftKey: true, altKey: true, code: "KeyP" });
    expect(el.open).toBe(false);
  });

  it("reads mod as Meta on Apple platforms and Control elsewhere", () => {
    const platform = vi.spyOn(navigator, "platform", "get");
    platform.mockReturnValue("MacIntel");
    expect(parseHotkey("mod+k")).toMatchObject({ key: "k", meta: true, ctrl: false });
    platform.mockReturnValue("Win32");
    expect(parseHotkey("mod+k")).toMatchObject({ key: "k", meta: false, ctrl: true });
    platform.mockRestore();
    expect(parseHotkey("hyper+k")).toBeNull();
  });

  describe("filtering", () => {
    it("matches labels and keywords case-insensitively, hiding empty groups", () => {
      const el = mount();
      el.show();

      search(el, "MEMBER");
      expect(visibleValues()).toEqual(["add-member", "find-member"]);
      expect(group("Billing").hasAttribute("data-filtered")).toBe(true);
      expect(group("Members").hasAttribute("data-filtered")).toBe(false);

      search(el, "prefer");
      expect(visibleValues()).toEqual(["settings"]);
      expect(group("Members").hasAttribute("data-filtered")).toBe(true);
      expect(activeValue()).toBe("settings");
    });

    it("ranks label prefix matches first and makes the best one active", () => {
      const el = mount();
      el.show();
      // "in" is inside "Find member" and "Settings", but only "Create invoice"
      // has a word starting with it — so Billing and its command rank first.
      search(el, "in");
      expect(activeValue()).toBe("invoice");
      // In the page, not just on screen, so the reading order matches.
      const groups = [...el.querySelectorAll("fw-command-group")];
      expect(groups.indexOf(group("Billing"))).toBeLessThan(groups.indexOf(group("Members")));

      search(el, "se");
      expect(activeValue()).toBe("settings");
    });

    it("puts the authored order back when the search clears and on close", () => {
      const el = mount();
      const authored = () => [...el.querySelectorAll("fw-command, fw-command-group")];
      const before = authored();
      el.show();
      search(el, "in");
      expect(authored()).not.toEqual(before);
      search(el, "");
      expect(authored()).toEqual(before);

      search(el, "in");
      el.hide();
      expect(authored()).toEqual(before);
    });

    it("shows the empty state when nothing matches", () => {
      const el = mount(`empty-text="Nothing found"`);
      el.show();
      search(el, "zzz");
      expect(visibleValues()).toEqual([]);
      expect(part(el, "empty").hidden).toBe(false);
      expect(part(el, "empty").textContent).toBe("Nothing found");
      expect(part(el, "listbox").hidden).toBe(true);
      press(input(el), "Enter");
      expect(el.open).toBe(true);
    });

    it("starts each opening with a fresh search", () => {
      const el = mount();
      el.show();
      search(el, "settings");
      el.hide();
      el.show();
      expect(input(el).value).toBe("");
      expect(visibleValues()).toHaveLength(5);
    });
  });

  describe("keyboard", () => {
    it("moves with the arrows, skipping disabled commands, and wraps", () => {
      const el = mount();
      el.show();
      press(input(el), "ArrowDown");
      expect(activeValue()).toBe("find-member");
      press(input(el), "ArrowDown");
      press(input(el), "ArrowDown");
      expect(activeValue()).toBe("settings");
      press(input(el), "ArrowDown");
      expect(activeValue()).toBe("add-member");
      press(input(el), "ArrowUp");
      expect(activeValue()).toBe("settings");
      // Focus never leaves the search field.
      expect(el.shadowRoot!.activeElement).toBe(input(el));
    });

    it("runs the active command with Enter, then closes and restores focus", () => {
      const el = mount();
      const before = document.getElementById("before")!;
      before.focus();
      const onSelect = vi.fn();
      const onHide = vi.fn();
      el.addEventListener("fw-select", onSelect);
      el.addEventListener("fw-hide", onHide);

      press(document.body, "k", { ctrlKey: true });
      search(el, "invoice");
      press(input(el), "Enter");

      const detail = (onSelect.mock.calls[0]![0] as CustomEvent).detail;
      expect(detail).toEqual({ value: "invoice", command: command("invoice") });
      expect(el.open).toBe(false);
      expect(onHide).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(before);
    });

    it("clears the search on Escape, and closes on a second Escape", () => {
      const el = mount();
      el.show();
      search(el, "set");
      press(input(el), "Escape");
      expect(el.open).toBe(true);
      expect(input(el).value).toBe("");
      expect(visibleValues()).toHaveLength(5);
      press(input(el), "Escape");
      expect(el.open).toBe(false);
    });

    it("points at the active command by element reflection where supported", () => {
      const store = new WeakMap<Element, Element | null>();
      Object.defineProperty(Element.prototype, "ariaActiveDescendantElement", {
        configurable: true,
        get(this: Element) {
          return store.get(this) ?? null;
        },
        set(this: Element, value: Element | null) {
          store.set(this, value);
        },
      });
      try {
        const el = mount();
        el.show();
        const reflected = () =>
          (input(el) as HTMLInputElement & { ariaActiveDescendantElement: Element | null })
            .ariaActiveDescendantElement;
        expect(reflected()).toBe(command("add-member"));
        press(input(el), "ArrowDown");
        expect(reflected()).toBe(command("find-member"));
      } finally {
        delete (Element.prototype as unknown as Record<string, unknown>)
          .ariaActiveDescendantElement;
      }
    });
  });

  describe("pointer", () => {
    it("runs a clicked command, but not a disabled one", () => {
      const el = mount();
      const onSelect = vi.fn();
      el.addEventListener("fw-select", onSelect);
      el.show();

      command("refund").click();
      expect(onSelect).not.toHaveBeenCalled();
      expect(el.open).toBe(true);

      command("settings").dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true, composed: true }),
      );
      expect(activeValue()).toBe("settings");
      command("settings").click();
      expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.value).toBe("settings");
      expect(el.open).toBe(false);
    });

    it("stays open when fw-select is cancelled", () => {
      const el = mount();
      el.addEventListener("fw-select", (e) => e.preventDefault());
      el.show();
      press(input(el), "Enter");
      expect(el.open).toBe(true);
    });

    it("closes when the backdrop is clicked", () => {
      const el = mount();
      el.show();
      dialog(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
      expect(el.open).toBe(false);
    });
  });

  it("locks page scroll while open and releases it on close", () => {
    const el = mount();
    el.show();
    expect(document.body.style.overflow).toBe("hidden");
    el.hide();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps up with commands added while open", async () => {
    const el = mount();
    el.show();
    search(el, "log");
    expect(visibleValues()).toEqual([]);
    const late = document.createElement("fw-command");
    late.setAttribute("value", "logout");
    late.textContent = "Log out";
    el.append(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(visibleValues()).toEqual(["logout"]);
    expect(activeValue()).toBe("logout");
  });

  it("shows the shortcut hint and label text without the icon", () => {
    mount();
    const add = command("add-member");
    expect(add.label).toBe("Add member");
    expect(add.shadowRoot!.querySelector("[part~=shortcut]")!.textContent).toBe("Ctrl M");
    expect(
      command("find-member").shadowRoot!.querySelector<HTMLElement>("[part~=shortcut]")!.hidden,
    ).toBe(true);
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount();
    press(document.body, "k", { ctrlKey: true });
    expect(el.open).toBe(true);
    search(el, "mem");
    press(input(el), "ArrowDown");
    el.remove();
    leaks.assertClean("fw-command-palette leaked");
    expect(document.body.style.overflow).toBe("");
  });
});
