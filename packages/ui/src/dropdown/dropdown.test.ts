import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { DropdownSelectDetail, FwDropdown } from "./dropdown.js";
import type { FwMenuItem } from "./menu-item.js";
import type { FwSubmenu } from "./submenu.js";

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

describe("fw-submenu", () => {
  const NESTED = `
    <fw-menu-item value="edit">Edit</fw-menu-item>
    <fw-menu-item id="share">
      Share
      <fw-submenu slot="submenu" id="share-menu">
        <fw-menu-item value="email">Email</fw-menu-item>
        <fw-menu-item value="link">Link</fw-menu-item>
        <fw-menu-item id="more">
          More
          <fw-submenu slot="submenu" id="more-menu">
            <fw-menu-item value="x">X</fw-menu-item>
            <fw-menu-item value="y">Y</fw-menu-item>
          </fw-submenu>
        </fw-menu-item>
      </fw-submenu>
    </fw-menu-item>
    <fw-menu-item value="delete">Delete</fw-menu-item>
  `;
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const share = () => byId<FwMenuItem>("share");
  const more = () => byId<FwMenuItem>("more");
  const shareMenu = () => byId<FwSubmenu>("share-menu");
  const moreMenu = () => byId<FwSubmenu>("more-menu");
  const panel = (sub: FwSubmenu) => sub.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")!;
  const pointer = (target: Element, type = "pointermove") =>
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true }));

  /** Open the dropdown and walk the keyboard down to "Share". */
  const openAtShare = (attrs = "") => {
    const el = mount(attrs, NESTED);
    press(trigger(), "ArrowDown");
    press(item("edit"), "ArrowDown");
    expect(document.activeElement).toBe(share());
    return el;
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks items that open a submenu, and keeps their items out of the parent menu", () => {
    const el = mount("", NESTED);
    expect(share().getAttribute("aria-haspopup")).toBe("menu");
    expect(share().getAttribute("aria-expanded")).toBe("false");
    expect(item("edit").hasAttribute("aria-haspopup")).toBe(false);
    expect(share().submenu).toBe(shareMenu());
    expect(share().text).toBe("Share");
    expect(panel(shareMenu()).getAttribute("role")).toBe("menu");
    expect(panel(shareMenu()).hidden).toBe(true);
    expect(el.items.map((i) => i.value || i.id)).toEqual(["edit", "share", "delete"]);
    expect(shareMenu().items.map((i) => i.value || i.id)).toEqual(["email", "link", "more"]);
    expect(share().shadowRoot!.querySelector("[part~=chevron]")).not.toBeNull();

    el.open = true;
    shareMenu().open = true;
    expect(share().getAttribute("aria-expanded")).toBe("true");
    expect(panel(shareMenu()).hidden).toBe(false);
    expect(panel(shareMenu()).getAttribute("aria-label")).toBe("Share");
  });

  it("opens on ArrowRight and focuses the first submenu item", () => {
    openAtShare();
    press(share(), "ArrowRight");
    expect(shareMenu().open).toBe(true);
    expect(document.activeElement).toBe(item("email"));
    expect(share().getAttribute("aria-expanded")).toBe("true");
  });

  it("opens on Enter and Space rather than choosing the item", () => {
    const el = openAtShare();
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    press(share(), "Enter");
    expect(shareMenu().open).toBe(true);
    expect(document.activeElement).toBe(item("email"));
    expect(el.open).toBe(true);
    press(item("email"), "ArrowLeft");
    press(share(), " ");
    expect(shareMenu().open).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(el.open).toBe(true);
  });

  it.each(["ArrowLeft", "Escape"])(
    "closes only the submenu on %s and refocuses its item",
    (key) => {
      const el = openAtShare();
      press(share(), "ArrowRight");
      press(item("email"), "ArrowDown");
      press(item("link"), "ArrowDown");
      press(more(), "ArrowRight");
      expect(moreMenu().open).toBe(true);
      expect(document.activeElement).toBe(item("x"));

      const outer = vi.fn();
      document.body.addEventListener("keydown", outer);
      press(item("x"), key);
      document.body.removeEventListener("keydown", outer);
      expect(moreMenu().open).toBe(false);
      expect(shareMenu().open).toBe(true);
      expect(el.open).toBe(true);
      expect(document.activeElement).toBe(more());
      if (key === "Escape") expect(outer).not.toHaveBeenCalled();

      press(more(), key);
      expect(shareMenu().open).toBe(false);
      expect(el.open).toBe(true);
      expect(document.activeElement).toBe(share());
    },
  );

  it("moves, jumps and typeaheads within the submenu only", () => {
    openAtShare();
    press(share(), "ArrowRight");
    press(item("email"), "End");
    expect(document.activeElement).toBe(more());
    press(more(), "ArrowDown");
    expect(document.activeElement).toBe(item("email"));
    press(item("email"), "ArrowUp");
    expect(document.activeElement).toBe(more());
    press(more(), "Home");
    expect(document.activeElement).toBe(item("email"));
    press(item("email"), "l");
    expect(document.activeElement).toBe(item("link"));
    // "d" is Delete in the root menu: out of reach from here.
    press(item("link"), "d");
    expect(document.activeElement).toBe(item("link"));
  });

  it("closes an open submenu when the keyboard moves to another item", () => {
    openAtShare();
    press(share(), "ArrowRight");
    press(item("email"), "ArrowLeft");
    expect(shareMenu().open).toBe(false);
    shareMenu().open = true;
    press(share(), "ArrowDown");
    expect(document.activeElement).toBe(item("delete"));
    expect(shareMenu().open).toBe(false);
  });

  it("emits fw-select from the dropdown for a nested leaf and closes everything", () => {
    const el = openAtShare();
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    press(share(), "ArrowRight");
    press(item("email"), "End");
    press(more(), "ArrowRight");
    press(item("x"), "ArrowDown");
    press(item("y"), "Enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const event = onSelect.mock.calls[0]![0] as CustomEvent<DropdownSelectDetail>;
    expect(event.target).toBe(el);
    expect(event.detail).toEqual({ value: "y", item: item("y") });
    expect(el.open).toBe(false);
    expect(shareMenu().open).toBe(false);
    expect(moreMenu().open).toBe(false);
    expect(panel(moreMenu()).hidden).toBe(true);
    expect(share().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("chooses a nested leaf by click, and toggles a submenu by clicking its item", () => {
    const el = mount("", NESTED);
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    trigger().click();
    share().click();
    expect(shareMenu().open).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    // A click on the submenu's own padding is neither its item nor a leaf.
    panel(shareMenu()).click();
    expect(shareMenu().open).toBe(true);
    share().click();
    expect(shareMenu().open).toBe(false);
    share().click();
    more().click();
    item("x").click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0]![0] as CustomEvent<DropdownSelectDetail>).detail.value).toBe(
      "x",
    );
    expect(el.open).toBe(false);
    expect(moreMenu().open).toBe(false);
  });

  it("closes the whole tree on Tab", () => {
    const el = openAtShare();
    press(share(), "ArrowRight");
    press(item("email"), "End");
    press(more(), "ArrowRight");
    press(item("x"), "Tab");
    expect(el.open).toBe(false);
    expect(shareMenu().open).toBe(false);
    expect(moreMenu().open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("scopes radio groups and keeps checkbox behaviour inside a submenu", () => {
    const el = mount(
      `close-on-select="false"`,
      `
      <fw-menu-item type="radio" group="g" value="root-a" checked>Root A</fw-menu-item>
      <fw-menu-item id="share">
        Options
        <fw-submenu slot="submenu" id="share-menu">
          <fw-menu-item type="radio" group="g" value="sub-a" checked>Sub A</fw-menu-item>
          <fw-menu-item type="radio" group="g" value="sub-b">Sub B</fw-menu-item>
          <fw-menu-item type="checkbox" value="vip">VIP</fw-menu-item>
        </fw-submenu>
      </fw-menu-item>
    `,
    );
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    expect(item("root-a").checked).toBe(true);
    expect(item("sub-a").checked).toBe(true);
    trigger().click();
    share().click();
    item("sub-b").click();
    expect(item("sub-b").checked).toBe(true);
    expect(item("sub-a").checked).toBe(false);
    expect(item("root-a").checked).toBe(true);
    item("vip").click();
    expect(item("vip").checked).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(el.open).toBe(true);
    expect(shareMenu().open).toBe(true);
  });

  it("opens on hover after a delay and closes after a grace period", () => {
    vi.useFakeTimers();
    const el = mount("", NESTED);
    trigger().click();

    pointer(share(), "pointerenter");
    pointer(share());
    expect(shareMenu().open).toBe(false);
    vi.advanceTimersByTime(100);
    expect(shareMenu().open).toBe(true);
    expect(document.activeElement).toBe(share());

    // Over a sibling: not closed at once, so a diagonal move can reach the submenu.
    pointer(item("delete"));
    vi.advanceTimersByTime(150);
    expect(shareMenu().open).toBe(true);
    // Into the submenu: the close is cancelled.
    pointer(item("email"));
    vi.advanceTimersByTime(500);
    expect(shareMenu().open).toBe(true);
    expect(document.activeElement).toBe(item("email"));

    // Over a sibling and staying there: closed after the grace period.
    pointer(item("delete"));
    vi.advanceTimersByTime(199);
    expect(shareMenu().open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(shareMenu().open).toBe(false);
    expect(el.open).toBe(true);
    expect(document.activeElement).toBe(item("delete"));
  });

  it("hover opens a nested level, and moving back up cancels nothing it should not", () => {
    vi.useFakeTimers();
    mount("", NESTED);
    trigger().click();
    pointer(share());
    vi.advanceTimersByTime(100);
    pointer(more());
    vi.advanceTimersByTime(100);
    expect(moreMenu().open).toBe(true);
    pointer(item("x"));
    // Back over the item whose submenu is open keeps both open.
    pointer(share());
    vi.advanceTimersByTime(500);
    expect(shareMenu().open).toBe(true);
    expect(moreMenu().open).toBe(true);
    // Hovering a different item with a submenu swaps it in after the grace period.
    pointer(item("edit"));
    vi.advanceTimersByTime(200);
    expect(shareMenu().open).toBe(false);
    expect(moreMenu().open).toBe(false);
  });

  it("reverses the arrows right-to-left", () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const el = openAtShare();
      press(share(), "ArrowRight");
      expect(shareMenu().open).toBe(false);
      press(share(), "ArrowLeft");
      expect(shareMenu().open).toBe(true);
      expect(document.activeElement).toBe(item("email"));
      press(item("email"), "ArrowLeft");
      expect(shareMenu().open).toBe(true);
      press(item("email"), "ArrowRight");
      expect(shareMenu().open).toBe(false);
      expect(el.open).toBe(true);
      expect(document.activeElement).toBe(share());
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("treats a press inside an open submenu as inside", () => {
    const el = openAtShare();
    press(share(), "ArrowRight");
    press(item("email"), "End");
    press(more(), "ArrowRight");
    pointer(item("y"), "pointerdown");
    pointer(panel(moreMenu()), "pointerdown");
    pointer(panel(shareMenu()), "pointerdown");
    expect(el.open).toBe(true);
    expect(moreMenu().open).toBe(true);
    pointer(document.getElementById("outside")!, "pointerdown");
    expect(el.open).toBe(false);
    expect(shareMenu().open).toBe(false);
    expect(moreMenu().open).toBe(false);
  });

  it("leaves nothing behind when removed with two levels open", async () => {
    leaks = trackLeaks();
    const el = openAtShare();
    press(share(), "ArrowRight");
    press(item("email"), "End");
    press(more(), "ArrowRight");
    expect(moreMenu().open).toBe(true);
    // A pending hover close and a typeahead timer, both ours to clear.
    pointer(item("link"));
    press(item("link"), "z");
    const sub = moreMenu();
    el.remove();
    // Let jsdom's own zero-delay focus timeouts run out; ours are 200ms and 500ms.
    await new Promise((resolve) => setTimeout(resolve, 10));
    leaks.assertClean("fw-dropdown with submenus leaked", { strict: true });
    expect(sub.open).toBe(false);
  });
});
