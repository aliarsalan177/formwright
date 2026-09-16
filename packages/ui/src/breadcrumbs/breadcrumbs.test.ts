import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwBreadcrumbItem } from "./breadcrumb-item.js";
import type { FwBreadcrumbs } from "./breadcrumbs.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

const TRAIL = `
  <fw-breadcrumb-item href="/">Home</fw-breadcrumb-item>
  <fw-breadcrumb-item href="/gym">Gym</fw-breadcrumb-item>
  <fw-breadcrumb-item href="/gym/members">Members</fw-breadcrumb-item>
  <fw-breadcrumb-item href="/gym/members/42">Ali</fw-breadcrumb-item>
  <fw-breadcrumb-item current>Payments</fw-breadcrumb-item>
`;

function mount(attrs = "", content = TRAIL): FwBreadcrumbs {
  document.body.innerHTML = `<fw-breadcrumbs ${attrs}>${content}</fw-breadcrumbs>`;
  return document.querySelector("fw-breadcrumbs")!;
}
const items = () => [...document.querySelectorAll<FwBreadcrumbItem>("fw-breadcrumb-item")];
const at = (i: number) => items()[i]!;
const label = (item: FwBreadcrumbItem) =>
  item.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!;
const ellipsis = (item: FwBreadcrumbItem) =>
  item.shadowRoot!.querySelector<HTMLButtonElement>("[part~=ellipsis]")!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-breadcrumbs", () => {
  it("renders a labelled nav around an ordered list of list items", () => {
    const el = mount();
    const nav = el.shadowRoot!.querySelector("[part~=base]")!;
    expect(nav.tagName).toBe("NAV");
    expect(nav.getAttribute("aria-label")).toBe("Breadcrumb");
    const list = el.shadowRoot!.querySelector("[part~=list]")!;
    expect(list.tagName).toBe("OL");
    expect(list.querySelector("slot")).not.toBeNull();
    expect(at(0).getAttribute("role")).toBe("listitem");
  });

  it("takes its accessible name from label", () => {
    const el = mount(`label="You are here"`);
    expect(el.shadowRoot!.querySelector("nav")!.getAttribute("aria-label")).toBe("You are here");
    el.label = "Trail";
    expect(el.shadowRoot!.querySelector("nav")!.getAttribute("aria-label")).toBe("Trail");
  });

  it("renders links for items with an href", () => {
    mount();
    const link = label(at(1)) as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/gym");
    expect(link.querySelector("slot:not([name])")).not.toBeNull();
  });

  it("renders the current item as text marked aria-current", () => {
    mount();
    const current = label(at(4));
    expect(current.tagName).toBe("SPAN");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(label(at(3)).hasAttribute("aria-current")).toBe(false);
  });

  it("swaps between link and text as current and href change, reflecting current", () => {
    mount();
    const item = at(3);
    item.current = true;
    expect(item.hasAttribute("current")).toBe(true);
    expect(label(item).tagName).toBe("SPAN");
    item.current = false;
    expect(label(item).tagName).toBe("A");
    item.href = null;
    expect(label(item).tagName).toBe("SPAN");
  });

  it("draws a decorative chevron separator by default", () => {
    mount();
    const separator = at(0).shadowRoot!.querySelector<HTMLElement>("[part~=separator]")!;
    expect(separator.getAttribute("aria-hidden")).toBe("true");
    expect(separator.querySelector("svg")).not.toBeNull();
  });

  it("copies a custom separator into every item", async () => {
    const el = mount("", `<span slot="separator">/</span>${TRAIL}`);
    for (const item of items()) {
      const copy = item.querySelector<HTMLElement>(":scope > [slot=separator]")!;
      expect(copy.textContent).toBe("/");
      expect(copy.getAttribute("aria-hidden")).toBe("true");
    }
    const late = document.createElement("fw-breadcrumb-item");
    late.textContent = "Late";
    el.append(late);
    await tick();
    expect(late.querySelector(":scope > [slot=separator]")!.textContent).toBe("/");
  });

  it("collapses the middle of a long trail behind an ellipsis button", () => {
    mount(`max="3"`);
    expect(at(0).hidden).toBe(false);
    expect(at(1).collapsed).toBe(true);
    expect(ellipsis(at(1)).hidden).toBe(false);
    expect(ellipsis(at(1)).getAttribute("aria-label")).toBeTruthy();
    expect(at(2).hidden).toBe(true);
    expect(at(3).hidden).toBe(false);
    expect(at(4).hidden).toBe(false);
    expect(ellipsis(at(0)).hidden).toBe(true);
  });

  it("does not collapse a trail within max", () => {
    mount(`max="5"`);
    expect(items().some((i) => i.hidden || i.collapsed)).toBe(false);
  });

  it("expands when the ellipsis is pressed, moving focus to the first revealed item", () => {
    mount(`max="2"`);
    expect(at(2).hidden).toBe(true);
    expect(at(3).hidden).toBe(true);
    ellipsis(at(1)).click();
    expect(items().some((i) => i.hidden || i.collapsed)).toBe(false);
    expect(at(1).shadowRoot!.activeElement).toBe(label(at(1)));
  });

  it("collapses again when max changes, and follows items added later", async () => {
    const el = mount(`max="3"`);
    ellipsis(at(1)).click();
    el.max = 4;
    expect(at(1).collapsed).toBe(true);
    expect(at(2).hidden).toBe(false);

    el.max = 5;
    expect(at(1).collapsed).toBe(false);
    const late = document.createElement("fw-breadcrumb-item");
    late.textContent = "Receipt";
    el.append(late);
    await tick();
    expect(at(1).collapsed).toBe(true);
    expect(late.getAttribute("role")).toBe("listitem");
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`max="3"`, `<span slot="separator">/</span>${TRAIL}`);
    ellipsis(at(1)).click();
    el.append(document.createElement("fw-breadcrumb-item"));
    await tick();
    el.remove();
    leaks.assertClean("fw-breadcrumbs leaked");
  });
});
