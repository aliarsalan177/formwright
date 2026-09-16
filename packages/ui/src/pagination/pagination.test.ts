import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import { paginationRange, type FwPagination } from "./index.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(attrs = ""): FwPagination {
  document.body.innerHTML = `<fw-pagination ${attrs}></fw-pagination>`;
  return document.querySelector("fw-pagination")!;
}
const part = (el: FwPagination, name: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`[part~=${name}]`)!;
/** What a sighted user sees between Previous and Next. */
const shown = (el: FwPagination) =>
  [...el.shadowRoot!.querySelectorAll("li[data-kind]")].map((li) =>
    li.getAttribute("data-kind") === "ellipsis" ? "…" : Number(li.textContent),
  );
const pageButton = (el: FwPagination, n: number) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`button[data-page="${n}"]`)!;

describe("paginationRange", () => {
  it("shows every page when there are few", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("puts ellipses around the current page's neighbours", () => {
    expect(paginationRange(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });
  it("keeps the same number of items wherever the current page is", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
    expect(paginationRange(3, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
    expect(paginationRange(20, 20)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
  });
  it("honours siblings and boundaries", () => {
    expect(paginationRange(10, 20, 2, 2)).toEqual([
      1,
      2,
      "ellipsis",
      8,
      9,
      10,
      11,
      12,
      "ellipsis",
      19,
      20,
    ]);
    expect(paginationRange(10, 20, 0, 0)).toEqual(["ellipsis", 10, "ellipsis"]);
  });
});

describe("fw-pagination", () => {
  it("renders prev, numbered pages and next inside a labelled nav", () => {
    const el = mount(`page="5" total-pages="10"`);
    const nav = part(el, "base");
    expect(nav.tagName).toBe("NAV");
    expect(nav.getAttribute("aria-label")).toBe("Pagination");
    expect(part(el, "prev").getAttribute("aria-label")).toBe("Previous page");
    expect(part(el, "next").getAttribute("aria-label")).toBe("Next page");
    expect(shown(el)).toEqual([1, "…", 4, 5, 6, "…", 10]);
  });

  it("marks the current page with aria-current", () => {
    const el = mount(`page="5" total-pages="10"`);
    expect(pageButton(el, 5).getAttribute("aria-current")).toBe("page");
    expect(pageButton(el, 4).hasAttribute("aria-current")).toBe(false);
    expect(el.shadowRoot!.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("hides the ellipsis from assistive technology", () => {
    const el = mount(`page="5" total-pages="10"`);
    expect(part(el, "ellipsis").getAttribute("aria-hidden")).toBe("true");
  });

  it("computes the page count from total and page-size", () => {
    const el = mount(`total="95" page-size="20"`);
    expect(el.pageCount).toBe(5);
    expect(shown(el)).toEqual([1, 2, 3, 4, 5]);
    el.pageSize = 50;
    expect(shown(el)).toEqual([1, 2]);
    el.totalPages = 3;
    expect(el.pageCount).toBe(3);
  });

  it("disables prev on the first page and next on the last", () => {
    const el = mount(`page="1" total-pages="3"`);
    expect(part(el, "prev").getAttribute("aria-disabled")).toBe("true");
    expect(part(el, "next").getAttribute("aria-disabled")).toBe("false");
    el.page = 3;
    expect(part(el, "prev").getAttribute("aria-disabled")).toBe("false");
    expect(part(el, "next").getAttribute("aria-disabled")).toBe("true");
  });

  it("goes to a page on click, emitting fw-page-change then change after page updates", () => {
    const el = mount(`page="1" total-pages="10"`);
    const events: string[] = [];
    el.addEventListener("fw-page-change", (e) => {
      events.push(`fw-page-change:${(e as CustomEvent<{ page: number }>).detail.page}:${el.page}`);
    });
    el.addEventListener("change", (e) => {
      expect(e).not.toBeInstanceOf(CustomEvent);
      events.push(`change:${el.page}`);
    });

    pageButton(el, 3).click();
    expect(el.page).toBe(3);
    expect(el.getAttribute("page")).toBe("3");
    part(el, "next").click();
    part(el, "prev").click();
    expect(events).toEqual([
      "fw-page-change:3:3",
      "change:3",
      "fw-page-change:4:4",
      "change:4",
      "fw-page-change:3:3",
      "change:3",
    ]);
  });

  it("ignores prev at the start, the current page, and everything while disabled", () => {
    const el = mount(`page="1" total-pages="5"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    part(el, "prev").click();
    pageButton(el, 1).click();
    expect(onChange).not.toHaveBeenCalled();

    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(pageButton(el, 2).disabled).toBe(true);
    expect(part(el, "next").disabled).toBe(true);
    pageButton(el, 2).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(el.page).toBe(1);
  });

  it("does not fire change when page is set programmatically", () => {
    const el = mount(`total-pages="5"`);
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    el.setAttribute("page", "4");
    expect(el.page).toBe(4);
    expect(pageButton(el, 4).getAttribute("aria-current")).toBe("page");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps focus on a page button when the numbers around it change", () => {
    const el = mount(`page="1" total-pages="20"`);
    pageButton(el, 5).focus();
    pageButton(el, 5).click();
    // Page 5 moved from the fifth slot to the fourth.
    expect(shown(el)).toEqual([1, "…", 4, 5, 6, "…", 20]);
    expect(el.shadowRoot!.activeElement).toBe(pageButton(el, 5));
    pageButton(el, 6).focus();
    pageButton(el, 6).click();
    expect(el.shadowRoot!.activeElement).toBe(pageButton(el, 6));
  });

  it("shows 'Page X of Y' with only prev and next when compact", () => {
    const el = mount(`page="2" total-pages="9" compact`);
    expect(shown(el)).toEqual([]);
    expect(part(el, "status").textContent).toBe("Page 2 of 9");
    part(el, "next").click();
    expect(part(el, "status").textContent).toBe("Page 3 of 9");
    el.compact = false;
    expect(part(el, "status").closest("li")!.hidden).toBe(true);
    expect(shown(el)).toEqual([1, 2, 3, 4, 5, "…", 9]);
  });

  it("reflects size and uses the label for the nav", () => {
    const el = mount(`total-pages="2" label="Results pages"`);
    el.size = "sm";
    expect(el.getAttribute("size")).toBe("sm");
    expect(part(el, "base").getAttribute("aria-label")).toBe("Results pages");
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount(`page="1" total-pages="30"`);
    pageButton(el, 2).click();
    part(el, "next").click();
    el.compact = true;
    el.remove();
    leaks.assertClean("fw-pagination leaked");
  });
});
