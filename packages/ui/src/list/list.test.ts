import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import "../select/index.js";
import "../combobox/index.js";
import "../multi-select/index.js";
import "../dropdown/index.js";
import type { FwCombobox } from "../combobox/combobox.js";
import type { DropdownSelectDetail, FwDropdown } from "../dropdown/dropdown.js";
import type { FwMultiSelect } from "../multi-select/multi-select.js";
import type { FwSelect } from "../select/select.js";
import type { FwList, ListSelectDetail } from "./list.js";
import type { FwListItem, ListItemSelectDetail } from "./list-item.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const ITEMS = `
  <fw-list-item value="basic">Basic</fw-list-item>
  <fw-list-item value="standard" disabled>Standard</fw-list-item>
  <fw-list-item value="premium">Premium</fw-list-item>
  <fw-divider></fw-divider>
  <fw-list-item value="couple">Couple</fw-list-item>
`;

function mount(attrs = "", items = ITEMS): FwList {
  document.body.innerHTML = `<fw-list ${attrs}>${items}</fw-list><button id="outside">x</button>`;
  return document.querySelector("fw-list")!;
}
const item = (value: string) =>
  document.querySelector<FwListItem>(`fw-list-item[value="${value}"]`)!;
const press = (target: Element, key: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
  );
const tabbable = () =>
  [...document.querySelectorAll<FwListItem>("fw-list-item")]
    .filter((i) => i.tabIndex === 0)
    .map((i) => i.value);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function stubInternals(el: HTMLElement) {
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  const setFormValue = vi.fn();
  const setValidity = vi.fn();
  Object.assign(internals, { setFormValue, setValidity });
  return { setFormValue, setValidity };
}

describe("fw-list-item", () => {
  it("renders the shared anatomy, hiding an empty description and suffix", () => {
    document.body.innerHTML = `<fw-list-item value="a"><span slot="prefix">★</span>Ali <b>Arsalan</b><em slot="suffix">3</em></fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    const root = el.shadowRoot!;
    for (const part of ["check", "label", "description", "suffix", "chevron"]) {
      expect(root.querySelector(`[part~=${part}]`), part).not.toBeNull();
    }
    expect(root.querySelector('slot[name="prefix"]')).not.toBeNull();
    expect(root.querySelector<HTMLElement>("[part~=description]")!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>("[part~=suffix]")!.hidden).toBe(false);
    expect(el.text).toBe("Ali Arsalan");
    el.label = "Ali";
    expect(el.text).toBe("Ali");
  });

  it("shows a description from the attribute, or from its slot", async () => {
    document.body.innerHTML = `<fw-list-item description="Head trainer">Sana</fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    const description = el.shadowRoot!.querySelector<HTMLElement>("[part~=description]")!;
    expect(description.hidden).toBe(false);
    expect(description.textContent).toBe("Head trainer");
    expect(el.text).toBe("Sana");

    el.description = null;
    expect(description.hidden).toBe(true);
    const slotted = document.createElement("span");
    slotted.slot = "description";
    slotted.textContent = "12 members";
    el.append(slotted);
    await tick();
    expect(description.hidden).toBe(false);
    expect(el.text).toBe("Sana");
  });

  it("reflects its state and is static on its own unless it can be pressed", () => {
    document.body.innerHTML = `<fw-list-item value="a">A</fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    expect(el.context).toBe("standalone");
    expect(el.hasAttribute("role")).toBe(false);
    expect(el.hasAttribute("data-static")).toBe(true);
    el.disabled = true;
    el.danger = true;
    el.size = "lg";
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(el.hasAttribute("danger")).toBe(true);
    expect(el.getAttribute("size")).toBe("lg");
  });

  it("is a button emitting fw-select on its own when interactive", () => {
    document.body.innerHTML = `<fw-list-item interactive value="archive">Archive</fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    const onSelect = vi.fn();
    document.body.addEventListener("fw-select", onSelect);
    expect(el.getAttribute("role")).toBe("button");
    expect(el.tabIndex).toBe(0);
    expect(el.hasAttribute("data-static")).toBe(false);

    el.click();
    press(el, "Enter");
    press(el, " ");
    expect(onSelect).toHaveBeenCalledTimes(3);
    const detail = (onSelect.mock.calls[0]![0] as CustomEvent<ListItemSelectDetail>).detail;
    expect(detail).toEqual({ value: "archive", item: el });

    el.disabled = true;
    el.click();
    press(el, "Enter");
    expect(onSelect).toHaveBeenCalledTimes(3);
    document.body.removeEventListener("fw-select", onSelect);
  });

  it("renders an href row as a real link around its content", () => {
    document.body.innerHTML = `<fw-list-item href="#billing" target="_self">Billing</fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    const link = el.shadowRoot!.querySelector<HTMLAnchorElement>("a[part~=link]")!;
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("#billing");
    expect(link.target).toBe("_self");
    expect(link.querySelector("[part~=label]")).not.toBeNull();
    // On its own the link is the tab stop.
    expect(link.hasAttribute("tabindex")).toBe(false);
    expect(el.hasAttribute("role")).toBe(false);

    el.href = null;
    expect(el.shadowRoot!.querySelector("a")).toBeNull();
    expect(el.shadowRoot!.querySelector("[part~=label]")).not.toBeNull();
  });

  it("keeps a disabled link row from navigating", () => {
    document.body.innerHTML = `<fw-list-item href="#x" disabled>X</fw-list-item>`;
    const el = document.querySelector("fw-list-item")!;
    const link = el.shadowRoot!.querySelector("a")!;
    const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("fw-list", () => {
  it("is a list of listitems without selection, with no tab stops for static rows", () => {
    const el = mount(`label="Plans"`);
    expect(el.getAttribute("role")).toBe("list");
    expect(el.getAttribute("aria-label")).toBe("Plans");
    expect(el.hasAttribute("aria-multiselectable")).toBe(false);
    expect(item("basic").getAttribute("role")).toBe("listitem");
    expect(item("basic").hasAttribute("aria-selected")).toBe(false);
    expect(item("basic").hasAttribute("data-selectable")).toBe(false);
    expect(item("basic").hasAttribute("data-static")).toBe(true);
    expect(item("basic").hasAttribute("tabindex")).toBe(false);
    expect(el.items.map((i) => i.value)).toEqual(["basic", "standard", "premium", "couple"]);
    expect(document.querySelector("fw-divider")!.hasAttribute("tabindex")).toBe(false);
  });

  it("is a listbox of options when selecting, and switches when the mode changes", () => {
    const el = mount(`selection="single"`);
    expect(el.getAttribute("role")).toBe("listbox");
    expect(item("basic").getAttribute("role")).toBe("option");
    expect(item("basic").getAttribute("aria-selected")).toBe("false");
    expect(item("basic").hasAttribute("data-selectable")).toBe(true);
    expect(item("basic").hasAttribute("data-static")).toBe(false);

    el.selection = "multiple";
    expect(el.getAttribute("aria-multiselectable")).toBe("true");
    expect(item("premium").getAttribute("role")).toBe("option");

    el.selection = "none";
    expect(el.getAttribute("role")).toBe("list");
    expect(item("premium").getAttribute("role")).toBe("listitem");
    expect(item("premium").hasAttribute("data-selectable")).toBe(false);
    expect(item("premium").hasAttribute("aria-selected")).toBe(false);
  });

  it("roves one tab stop and moves focus with arrows, Home, End and typeahead", () => {
    mount(`selection="single"`);
    expect(tabbable()).toEqual(["basic"]);
    item("basic").focus();
    press(item("basic"), "ArrowDown");
    // Disabled rows are stepped over.
    expect(document.activeElement).toBe(item("premium"));
    expect(tabbable()).toEqual(["premium"]);
    press(item("premium"), "ArrowDown");
    expect(document.activeElement).toBe(item("couple"));
    press(item("couple"), "Home");
    expect(document.activeElement).toBe(item("basic"));
    press(item("basic"), "End");
    expect(document.activeElement).toBe(item("couple"));
    press(item("couple"), "p");
    expect(document.activeElement).toBe(item("premium"));
    press(item("premium"), "ArrowUp");
    expect(document.activeElement).toBe(item("basic"));
  });

  it("selects one row with Space, Enter and click, emitting input, change and fw-select", () => {
    const el = mount(`selection="single"`);
    const events: string[] = [];
    for (const type of ["input", "change", "fw-select"]) {
      el.addEventListener(type, (e) => {
        const detail = (e as CustomEvent<ListSelectDetail>).detail;
        events.push(detail ? `${type}:${detail.value}` : type);
      });
    }
    item("basic").focus();
    press(item("basic"), " ");
    expect(el.value).toBe("basic");
    expect(item("basic").selected).toBe(true);
    expect(item("basic").getAttribute("aria-selected")).toBe("true");
    expect(events).toEqual(["input", "change", "fw-select:basic"]);

    press(item("basic"), "ArrowDown");
    press(item("premium"), "Enter");
    expect(el.value).toBe("premium");
    expect(item("basic").selected).toBe(false);

    item("couple").click();
    expect(el.value).toBe("couple");
    expect(tabbable()).toEqual(["couple"]);

    // Pressing the selected row again changes nothing but still activates.
    events.length = 0;
    item("couple").click();
    expect(events).toEqual(["fw-select:couple"]);

    item("standard").click();
    expect(el.value).toBe("couple");
  });

  it("toggles rows with multiple selection, as a frozen array", () => {
    const el = mount(`selection="multiple" value="basic, couple"`);
    expect(el.value).toEqual(["basic", "couple"]);
    expect(Object.isFrozen(el.value)).toBe(true);
    expect(item("couple").selected).toBe(true);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    item("premium").click();
    expect(el.value).toEqual(["basic", "couple", "premium"]);
    item("basic").focus();
    press(item("basic"), " ");
    expect(el.value).toEqual(["couple", "premium"]);
    expect(item("basic").getAttribute("aria-selected")).toBe("false");
    expect(onChange).toHaveBeenCalledTimes(2);

    el.value = ["basic"];
    expect(item("premium").selected).toBe(false);
    el.setAttribute("value", "premium,couple");
    expect(el.value).toEqual(["premium", "couple"]);
  });

  it("keeps commas in a single value, and takes the tab stop from the selection", () => {
    const el = mount(
      `selection="single" value="a,b"`,
      `<fw-list-item value="x">X</fw-list-item><fw-list-item value="a,b">AB</fw-list-item>`,
    );
    expect(el.value).toBe("a,b");
    expect(item("a,b").selected).toBe(true);
    expect(tabbable()).toEqual(["a,b"]);
  });

  it("takes rows marked selected as the initial value", () => {
    const el = mount(
      `selection="multiple"`,
      `<fw-list-item value="a" selected>A</fw-list-item><fw-list-item value="b">B</fw-list-item><fw-list-item value="c" selected>C</fw-list-item>`,
    );
    expect(el.value).toEqual(["a", "c"]);
    el.value = [];
    el.formResetCallback();
    expect(el.value).toEqual(["a", "c"]);
  });

  it("only focuses and activates links and interactive rows without selection", () => {
    const el = mount(
      "",
      `
      <fw-list-item value="static">Static</fw-list-item>
      <fw-list-item value="action" interactive>Action</fw-list-item>
      <fw-list-item value="gone" interactive disabled>Gone</fw-list-item>
      <fw-list-item value="link" href="#billing">Billing</fw-list-item>
    `,
    );
    const selected: string[] = [];
    el.addEventListener("fw-select", (e) =>
      selected.push((e as CustomEvent<ListSelectDetail>).detail.value),
    );
    const onChange = vi.fn();
    el.addEventListener("change", onChange);

    expect(tabbable()).toEqual(["action"]);
    expect(item("gone").tabIndex).toBe(-1);
    expect(item("static").hasAttribute("tabindex")).toBe(false);
    expect(item("action").getAttribute("role")).toBe("listitem");
    // Inside a list, the row is the tab stop rather than its link.
    expect(item("link").shadowRoot!.querySelector("a")!.tabIndex).toBe(-1);

    item("static").click();
    item("gone").click();
    expect(selected).toEqual([]);

    item("action").focus();
    press(item("action"), "Enter");
    press(item("action"), "ArrowDown");
    expect(document.activeElement).toBe(item("link"));
    // Enter on a link row goes through the link, which the list sees as a click.
    press(item("link"), "Enter");
    item("action").click();
    expect(selected).toEqual(["action", "link", "action"]);
    expect(onChange).not.toHaveBeenCalled();
    expect(el.value).toBe("");
  });

  it("submits its value and reports valueMissing while required", () => {
    const el = mount(`selection="single" name="plan" required`);
    const { setFormValue, setValidity } = stubInternals(el);
    item("premium").click();
    expect(setFormValue).toHaveBeenLastCalledWith("premium");
    expect(setValidity).toHaveBeenLastCalledWith({});
    el.value = "";
    expect(setFormValue).toHaveBeenLastCalledWith(null);
    expect(setValidity).toHaveBeenLastCalledWith(
      { valueMissing: true },
      expect.any(String),
      expect.anything(),
    );
    expect(el.getAttribute("aria-required")).toBe("true");
  });

  it("submits one entry per value with multiple selection", () => {
    const el = mount(`selection="multiple" name="plans"`);
    const { setFormValue } = stubInternals(el);
    el.value = ["premium", "basic"];
    const last = setFormValue.mock.calls[setFormValue.mock.calls.length - 1]![0];
    expect(last).toBeInstanceOf(FormData);
    expect((last as FormData).getAll("plans")).toEqual(["premium", "basic"]);
  });

  it("submits nothing without selection", () => {
    const el = mount(`name="plan" value="basic"`);
    const { setFormValue } = stubInternals(el);
    el.value = "premium";
    expect(setFormValue).toHaveBeenLastCalledWith(null);
  });

  it("resets to its initial value and is disabled by a fieldset", () => {
    const el = mount(`selection="single" value="basic"`);
    item("premium").click();
    expect(el.value).toBe("premium");
    el.formResetCallback();
    expect(el.value).toBe("basic");

    el.formDisabledCallback(true);
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(tabbable()).toEqual([]);
    item("couple").click();
    press(item("basic"), " ");
    expect(el.value).toBe("basic");

    el.formDisabledCallback(false);
    expect(tabbable()).toEqual(["basic"]);
  });

  it("keeps up with rows added and removed later", async () => {
    const el = mount(`selection="single" value="kiwi"`);
    expect(tabbable()).toEqual(["basic"]);
    const late = document.createElement("fw-list-item");
    late.setAttribute("value", "kiwi");
    late.textContent = "Kiwi";
    el.append(late);
    await tick();
    expect(late.getAttribute("role")).toBe("option");
    expect(late.selected).toBe(true);
    expect(late.hasAttribute("data-selectable")).toBe(true);
    expect(tabbable()).toEqual(["kiwi"]);

    late.remove();
    await tick();
    expect(tabbable()).toEqual(["basic"]);
  });

  it("sizes its rows unless a row has its own size", () => {
    const el = mount(
      `size="sm"`,
      `<fw-list-item value="a">A</fw-list-item><fw-list-item value="b" size="lg">B</fw-list-item>`,
    );
    expect(item("a").getAttribute("size")).toBe("sm");
    expect(item("b").getAttribute("size")).toBe("lg");
    el.size = null;
    expect(item("a").hasAttribute("size")).toBe(false);
    expect(item("b").getAttribute("size")).toBe("lg");
  });

  it("reflects variant and dividers", () => {
    const el = mount();
    expect(el.variant).toBe("plain");
    el.variant = "outline";
    el.dividers = true;
    expect(el.getAttribute("variant")).toBe("outline");
    expect(el.hasAttribute("dividers")).toBe(true);
  });

  it("leaves nothing behind when removed mid-typeahead", () => {
    leaks = trackLeaks();
    const el = mount(`selection="multiple" value="basic" name="plans"`);
    item("basic").focus();
    const environmentTimers = leaks.report().timers;
    // A letter nothing starts with: the typeahead timer starts, focus stays.
    press(item("basic"), "z");
    expect(leaks.report().timers).toBe(environmentTimers + 1);
    el.remove();
    leaks.assertClean("fw-list leaked");
    expect(leaks.report().timers).toBe(environmentTimers);
  });
});

describe("fw-list-item in other containers", () => {
  const RICH = `
    <fw-list-item value="sana" description="Head trainer"><span slot="prefix">SM</span>Sana Malik</fw-list-item>
    <fw-list-item value="usman" description="Strength" disabled><span slot="prefix">UT</span>Usman Tariq</fw-list-item>
    <fw-list-item value="faisal" description="Cardio"><span slot="prefix">FQ</span>Faisal Qureshi<em slot="suffix">4</em></fw-list-item>
  `;

  it("is an option in fw-select, chosen from the keyboard and shown by its text", () => {
    document.body.innerHTML = `<fw-select placeholder="Trainer">${RICH}</fw-select>`;
    const el = document.querySelector<FwSelect>("fw-select")!;
    const trigger = el.shadowRoot!.querySelector<HTMLElement>("[role=combobox]")!;
    const display = el.shadowRoot!.querySelector<HTMLElement>("[part~=display]")!;
    expect(item("sana").getAttribute("role")).toBe("option");
    expect(item("sana").context).toBe("option");
    expect(item("sana").id).not.toBe("");
    expect(item("sana").tabIndex).toBe(-1);
    expect(item("sana").hasAttribute("data-selectable")).toBe(true);
    expect(el.options).toHaveLength(3);

    press(trigger, "ArrowDown");
    expect(document.activeElement).toBe(item("sana"));
    press(item("sana"), "ArrowDown");
    expect(document.activeElement).toBe(item("faisal"));
    press(item("faisal"), "Enter");
    expect(el.value).toBe("faisal");
    expect(display.textContent).toBe("Faisal Qureshi");
    expect(item("faisal").selected).toBe(true);
    expect(item("faisal").getAttribute("aria-selected")).toBe("true");

    // Typing while closed matches the label text, not the prefix initials.
    press(trigger, "s");
    expect(el.value).toBe("sana");
  });

  it("filters by its text in fw-combobox", () => {
    document.body.innerHTML = `<fw-combobox>${RICH}</fw-combobox>`;
    const el = document.querySelector<FwCombobox>("fw-combobox")!;
    const input = el.shadowRoot!.querySelector<HTMLInputElement>("[part~=input]")!;
    input.value = "qur";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    expect(el.options.filter((o) => !o.hidden).map((o) => o.value)).toEqual(["faisal"]);
    // Description text is not matched.
    input.value = "cardio";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    expect(el.options.filter((o) => !o.hidden)).toHaveLength(0);
    input.value = "san";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    press(input, "Enter");
    expect(el.value).toBe("sana");
    expect(input.value).toBe("Sana Malik");
  });

  it("toggles as an option in fw-multi-select", () => {
    document.body.innerHTML = `<fw-multi-select name="trainers">${RICH}</fw-multi-select>`;
    const el = document.querySelector<FwMultiSelect>("fw-multi-select")!;
    const trigger = el.shadowRoot!.querySelector<HTMLElement>("[part~=trigger]")!;
    press(trigger, "ArrowDown");
    expect(document.activeElement).toBe(item("sana"));
    press(item("sana"), " ");
    item("usman").click();
    item("faisal").click();
    expect(el.value).toEqual(["sana", "faisal"]);
    expect(item("faisal").getAttribute("aria-selected")).toBe("true");
    const tags = [...el.shadowRoot!.querySelectorAll("[part~=tag] .tag-text")].map(
      (t) => t.textContent,
    );
    expect(tags).toEqual(["Sana Malik", "Faisal Qureshi"]);
  });

  it("is a menu item in fw-dropdown: moved through, typeahead and fw-select", () => {
    document.body.innerHTML = `
      <fw-dropdown>
        <button slot="trigger" id="trigger">Assign</button>
        <fw-menu-item value="none">Unassigned</fw-menu-item>
        ${RICH}
        <fw-menu-item>
          More
          <fw-submenu slot="submenu">
            <fw-list-item value="nested">Nested trainer</fw-list-item>
          </fw-submenu>
        </fw-menu-item>
      </fw-dropdown>`;
    const el = document.querySelector<FwDropdown>("fw-dropdown")!;
    const trigger = document.getElementById("trigger")!;
    const onSelect = vi.fn();
    el.addEventListener("fw-select", onSelect);
    expect(item("sana").getAttribute("role")).toBe("menuitem");
    expect(item("sana").hasAttribute("aria-selected")).toBe(false);
    expect(item("sana").hasAttribute("data-selectable")).toBe(false);
    expect(item("nested").getAttribute("role")).toBe("menuitem");
    expect(el.items.map((i) => i.value || i.localName)).toEqual([
      "none",
      "sana",
      "usman",
      "faisal",
      "fw-menu-item",
    ]);

    press(trigger, "ArrowDown");
    press(document.activeElement!, "ArrowDown");
    expect(document.activeElement).toBe(item("sana"));
    press(item("sana"), "ArrowDown");
    expect(document.activeElement).toBe(item("faisal"));
    press(item("faisal"), "s");
    expect(document.activeElement).toBe(item("sana"));
    press(item("sana"), "Enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const detail = (onSelect.mock.calls[0]![0] as CustomEvent<DropdownSelectDetail>).detail;
    expect(detail).toEqual({ value: "sana", item: item("sana") });
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    item("faisal").click();
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("takes its role from wherever it is moved to", () => {
    document.body.innerHTML = `
      <fw-list id="list"><fw-list-item value="a">A</fw-list-item></fw-list>
      <fw-select id="select"></fw-select>
      <fw-dropdown id="menu"><button slot="trigger">M</button></fw-dropdown>`;
    const row = item("a");
    expect(row.getAttribute("role")).toBe("listitem");
    document.getElementById("select")!.append(row);
    expect(row.getAttribute("role")).toBe("option");
    expect(row.getAttribute("aria-selected")).toBe("false");
    document.getElementById("menu")!.append(row);
    expect(row.getAttribute("role")).toBe("menuitem");
    expect(row.hasAttribute("aria-selected")).toBe(false);
    document.body.append(row);
    expect(row.context).toBe("standalone");
    expect(row.hasAttribute("role")).toBe(false);
  });
});
