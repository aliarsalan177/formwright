import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { DropdownSelectDetail, FwDropdown } from "./dropdown.js";
import type { FwMenuItem } from "./menu-item.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const ITEMS = `
  <fw-menu-label>Membership</fw-menu-label>
  <fw-menu-item value="renew"><span slot="prefix">↻</span>Renew<kbd slot="suffix">⌘R</kbd></fw-menu-item>
  <fw-menu-item value="freeze" disabled>Freeze</fw-menu-item>
  <fw-menu-item value="edit">Edit</fw-menu-item>
  <fw-menu-divider></fw-menu-divider>
  <fw-menu-item value="delete" danger>Delete</fw-menu-item>
`;

function mount(attrs = "", items = ITEMS): FwDropdown {
  document.body.innerHTML = `<fw-dropdown ${attrs}><button slot="trigger" id="trigger">Member</button>${items}</fw-dropdown><button id="outside">x</button>`;
  return document.querySelector("fw-dropdown")!;
}
const menu = (el: FwDropdown) => el.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")!;
const trigger = () => document.getElementById("trigger")!;
const item = (value: string) =>
  document.querySelector<FwMenuItem>(`fw-menu-item[value="${value}"]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );

describe("fw-dropdown", () => {
  it("renders a hidden menu with roles on every piece", () => {
    const el = mount();
    expect(menu(el).getAttribute("role")).toBe("menu");
    expect(menu(el).hidden).toBe(true);
    expect(item("renew").getAttribute("role")).toBe("menuitem");
    expect(item("renew").tabIndex).toBe(-1);
    expect(item("freeze").getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector("fw-menu-divider")!.getAttribute("role")).toBe("separator");
    expect(document.querySelector("fw-menu-label")!.getAttribute("role")).toBe("presentation");
    expect(item("renew").shadowRoot!.querySelector('slot[name="suffix"]')).not.toBeNull();
    expect(item("renew").text).toBe("Renew");
  });

  it("has defaults and reflects open and item state", () => {
    const el = mount();
    expect(el.placement).toBe("bottom-start");
    expect(el.closeOnSelect).toBe(true);
    el.setAttribute("close-on-select", "false");
    expect(el.closeOnSelect).toBe(false);
    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    item("delete").danger = false;
    expect(item("delete").hasAttribute("danger")).toBe(false);
  });

  it("marks the trigger as a menu button", () => {
    const el = mount();
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    el.open = true;
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(menu(el).getAttribute("aria-label")).toBe("Member");
  });

  it("opens on click and focuses the first item; a second click closes", () => {
    const el = mount();
    const onShow = vi.fn();
    const onHide = vi.fn();
    el.addEventListener("fw-show", onShow);
    el.addEventListener("fw-hide", onHide);

    trigger().click();
    expect(el.open).toBe(true);
    expect(menu(el).hidden).toBe(false);
    expect(document.activeElement).toBe(item("renew"));
    expect(onShow).toHaveBeenCalledTimes(1);

    trigger().click();
    expect(el.open).toBe(false);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it.each(["Enter", " ", "ArrowDown"])("opens on %j from the trigger at the first item", (key) => {
    const el = mount();
    press(trigger(), key);
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(item("renew"));
  });

  it("opens on ArrowUp at the last item", () => {
    const el = mount();
    press(trigger(), "ArrowUp");
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(item("delete"));
  });

  it("moves with arrows, Home, End and typeahead, skipping disabled items", () => {
    mount();
    press(trigger(), "ArrowDown");
    press(item("renew"), "ArrowDown");
    expect(document.activeElement).toBe(item("edit"));
    press(item("edit"), "ArrowDown");
    expect(document.activeElement).toBe(item("delete"));
    press(item("delete"), "ArrowDown");
    expect(document.activeElement).toBe(item("renew"));
    press(item("renew"), "End");
    expect(document.activeElement).toBe(item("delete"));
    press(item("delete"), "Home");
    expect(document.activeElement).toBe(item("renew"));
    press(item("renew"), "e");
    expect(document.activeElement).toBe(item("edit"));
    press(item("edit"), "f");
    expect(document.activeElement).toBe(item("edit"));
  });

  it("activates with Enter, emitting fw-select, closing and returning focus", () => {
    const el = mount();
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    press(trigger(), "ArrowDown");
    press(item("renew"), "ArrowDown");
    press(item("edit"), "Enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const detail = (onSelect.mock.calls[0]![0] as CustomEvent<DropdownSelectDetail>).detail;
    expect(detail.value).toBe("edit");
    expect(detail.item).toBe(item("edit"));
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("activates with Space and with a click, ignoring disabled items", () => {
    const el = mount();
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);

    trigger().click();
    item("freeze").click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(el.open).toBe(true);

    press(item("renew"), " ");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(el.open).toBe(false);

    trigger().click();
    item("delete").click();
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("stays open after choosing when close-on-select is false", () => {
    const el = mount(`close-on-select="false"`);
    trigger().click();
    item("edit").click();
    expect(el.open).toBe(true);
  });

  it("toggles checkbox items and keeps radio items exclusive within a group", () => {
    const el = mount(
      "",
      `
      <fw-menu-item type="checkbox" value="vip">VIP</fw-menu-item>
      <fw-menu-item type="radio" group="sort" value="name" checked>Name</fw-menu-item>
      <fw-menu-item type="radio" group="sort" value="joined">Joined</fw-menu-item>
      <fw-menu-item type="radio" group="view" value="grid" checked>Grid</fw-menu-item>
    `,
    );
    expect(item("vip").getAttribute("role")).toBe("menuitemcheckbox");
    expect(item("vip").getAttribute("aria-checked")).toBe("false");
    expect(item("name").getAttribute("role")).toBe("menuitemradio");

    trigger().click();
    item("vip").click();
    expect(item("vip").checked).toBe(true);
    expect(item("vip").getAttribute("aria-checked")).toBe("true");

    trigger().click();
    item("joined").click();
    expect(item("joined").checked).toBe(true);
    expect(item("name").checked).toBe(false);
    expect(item("name").getAttribute("aria-checked")).toBe("false");
    expect(item("grid").checked).toBe(true);

    trigger().click();
    item("joined").click();
    expect(item("joined").checked).toBe(true);
    expect(el.open).toBe(false);

    item("name").checked = true;
    expect(item("joined").checked).toBe(false);
  });

  it("closes on Escape, returns focus, and keeps Escape from an enclosing dialog", () => {
    const el = mount();
    const outer = vi.fn();
    press(trigger(), "ArrowDown");
    document.body.addEventListener("keydown", outer);
    press(item("renew"), "Escape");
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
    expect(outer).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", outer);
  });

  it("closes on Tab, handing focus back to the trigger", () => {
    const el = mount();
    press(trigger(), "ArrowDown");
    press(item("renew"), "Tab");
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on a press outside, but not inside", () => {
    const el = mount();
    trigger().click();
    item("renew").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    menu(el).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(true);
    document
      .getElementById("outside")!
      .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true }));
    expect(el.open).toBe(false);
  });

  it("follows the pointer over items", () => {
    mount();
    trigger().click();
    item("edit").dispatchEvent(new MouseEvent("pointermove", { bubbles: true, composed: true }));
    expect(document.activeElement).toBe(item("edit"));
    expect(item("edit").hasAttribute("data-active")).toBe(true);
  });

  it("has show, hide and toggle methods", () => {
    const el = mount();
    el.show();
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(item("renew"));
    el.hide();
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
    el.toggle();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
  });

  it("removes its ARIA state from the trigger when disconnected", () => {
    const el = mount();
    el.remove();
    expect(el.querySelector("#trigger")!.hasAttribute("aria-expanded")).toBe(false);
  });

  it("leaves nothing behind when removed while open", () => {
    leaks = trackLeaks();
    const el = mount();
    press(trigger(), "ArrowDown");
    // jsdom's focus() leaves its own zero-delay timeouts pending, so count
    // them first; the typeahead timer started next is ours to clear.
    const environmentTimers = leaks.report().timers;
    press(item("renew"), "z");
    expect(leaks.report().timers).toBe(environmentTimers + 1);
    el.remove();
    leaks.assertClean("fw-dropdown leaked");
    expect(leaks.report().timers).toBe(environmentTimers);
  });
});
