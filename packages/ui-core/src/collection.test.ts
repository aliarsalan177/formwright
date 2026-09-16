// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCollection, type Collection } from "./collection.js";

function list(labels: string[]): HTMLElement[] {
  return labels.map((label) => {
    const el = document.createElement("div");
    const disabled = label.endsWith("!");
    el.textContent = disabled ? label.slice(0, -1) : label;
    if (disabled) el.setAttribute("aria-disabled", "true");
    return el;
  });
}

const key = (k: string) => new KeyboardEvent("keydown", { key: k });

describe("createCollection", () => {
  let items: HTMLElement[];
  let collection: Collection;
  const changes: Array<string | null> = [];

  beforeEach(() => {
    changes.length = 0;
    items = list(["Apple", "Banana!", "Blueberry", "Cherry", "Cranberry"]);
    collection = createCollection({
      items: () => items,
      onActiveChange: (item) => changes.push(item?.textContent ?? null),
    });
  });

  afterEach(() => {
    collection.dispose();
    vi.useRealTimers();
  });

  it("starts nowhere and moves down to the first item", () => {
    expect(collection.active()).toBeNull();
    expect(collection.handleKey(key("ArrowDown"))).toBe(true);
    expect(collection.active()?.textContent).toBe("Apple");
  });

  it("steps over disabled items", () => {
    collection.setActive(0);
    collection.handleKey(key("ArrowDown"));
    expect(collection.active()?.textContent).toBe("Blueberry");
  });

  it("wraps at the ends", () => {
    collection.last();
    collection.handleKey(key("ArrowDown"));
    expect(collection.active()?.textContent).toBe("Apple");
    collection.handleKey(key("ArrowUp"));
    expect(collection.active()?.textContent).toBe("Cranberry");
  });

  it("stops at the ends when looping is off", () => {
    const c = createCollection({ items: () => items, loop: false });
    c.last();
    c.handleKey(key("ArrowDown"));
    expect(c.active()?.textContent).toBe("Cranberry");
    c.dispose();
  });

  it("jumps with Home and End", () => {
    collection.handleKey(key("End"));
    expect(collection.active()?.textContent).toBe("Cranberry");
    collection.handleKey(key("Home"));
    expect(collection.active()?.textContent).toBe("Apple");
  });

  it("finds an item by typing its start, ignoring disabled ones", () => {
    collection.handleKey(key("b"));
    expect(collection.active()?.textContent).toBe("Blueberry");
  });

  it("searches a word as letters are typed quickly", () => {
    collection.handleKey(key("c"));
    collection.handleKey(key("r"));
    expect(collection.active()?.textContent).toBe("Cranberry");
  });

  it("cycles through matches when the same letter is repeated", () => {
    collection.handleKey(key("c"));
    expect(collection.active()?.textContent).toBe("Cherry");
    collection.handleKey(key("c"));
    expect(collection.active()?.textContent).toBe("Cranberry");
  });

  it("starts a fresh search after a pause", () => {
    vi.useFakeTimers();
    const c = createCollection({ items: () => items });
    c.handleKey(key("c"));
    vi.advanceTimersByTime(600);
    c.handleKey(key("a"));
    expect(c.active()?.textContent).toBe("Apple");
    c.dispose();
  });

  it("ignores arrows across its orientation", () => {
    expect(collection.handleKey(key("ArrowRight"))).toBe(false);
    const tabs = createCollection({ items: () => items, orientation: "horizontal" });
    expect(tabs.handleKey(key("ArrowDown"))).toBe(false);
    expect(tabs.handleKey(key("ArrowRight"))).toBe(true);
    tabs.dispose();
  });

  it("reverses left and right in right-to-left text", () => {
    const tabs = createCollection({
      items: () => items,
      orientation: "horizontal",
      dir: () => "rtl",
    });
    tabs.setActive(0);
    tabs.handleKey(key("ArrowLeft"));
    expect(tabs.active()?.textContent).toBe("Blueberry");
    tabs.dispose();
  });

  it("leaves shortcuts alone", () => {
    expect(collection.handleKey(new KeyboardEvent("keydown", { key: "a", ctrlKey: true }))).toBe(
      false,
    );
  });

  it("only reports real changes", () => {
    collection.setActive(0);
    collection.setActive(0);
    expect(changes).toEqual(["Apple"]);
  });

  it("refuses to activate a disabled item directly", () => {
    collection.setActive(0);
    collection.setActive(1);
    expect(collection.active()?.textContent).toBe("Apple");
  });
});
