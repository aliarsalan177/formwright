// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { signal } from "@formwright/reactive";
import { Scope, h, on, bindText, bindClass, bindHidden, bindDisabled } from "./dom.js";

describe("Scope", () => {
  it("runs disposers in reverse, so a binding dies before what it bound", () => {
    const order: string[] = [];
    const scope = new Scope();
    scope.add(() => order.push("first"));
    scope.add(() => order.push("second"));
    scope.add(() => order.push("third"));

    scope.dispose();

    expect(order).toEqual(["third", "second", "first"]);
  });

  it("empties itself, so a second dispose is a no-op rather than a double free", () => {
    const disposer = vi.fn();
    const scope = new Scope();
    scope.add(disposer);

    scope.dispose();
    scope.dispose();

    expect(disposer).toHaveBeenCalledTimes(1);
    expect(scope.size).toBe(0);
  });

  it("runs a disposer added after disposal instead of dropping it", () => {
    // Nothing will call dispose() a second time, so holding on to a late
    // arrival would leak it silently — the exact failure this class exists
    // to prevent.
    const late = vi.fn();
    const scope = new Scope();
    scope.dispose();

    scope.add(late);

    expect(late).toHaveBeenCalledTimes(1);
  });

  it("disposes children with the parent", () => {
    const childDisposer = vi.fn();
    const parent = new Scope();
    const child = parent.child();
    child.add(childDisposer);

    parent.dispose();

    expect(childDisposer).toHaveBeenCalledTimes(1);
  });

  it("reports how much is outstanding", () => {
    const scope = new Scope();
    expect(scope.size).toBe(0);
    scope.add(() => {});
    scope.add(() => {});
    expect(scope.size).toBe(2);
  });

  it("stops a reactive binding when disposed", () => {
    const value = signal("before");
    const node = document.createTextNode("");
    const scope = new Scope();
    bindText(scope, node, () => value.get());
    expect(node.textContent).toBe("before");

    value.set("during");
    expect(node.textContent).toBe("during");

    scope.dispose();
    value.set("after");

    expect(node.textContent).toBe("during");
  });
});

describe("h", () => {
  it("builds an element with attributes and children", () => {
    const child = document.createElement("span");
    const el = h("div", { class: "row", "data-x": "1" }, [child]);

    expect(el.tagName).toBe("DIV");
    expect(el.getAttribute("class")).toBe("row");
    expect(el.getAttribute("data-x")).toBe("1");
    expect(el.firstChild).toBe(child);
  });
});

describe("bindings", () => {
  it("toggles a class reactively", () => {
    const on_ = signal(false);
    const el = document.createElement("div");
    const scope = new Scope();
    bindClass(scope, el, "is-active", () => on_.get());

    expect(el.classList.contains("is-active")).toBe(false);
    on_.set(true);
    expect(el.classList.contains("is-active")).toBe(true);

    scope.dispose();
  });

  it("hides with both the attribute and inline display", () => {
    // The attribute alone loses to any app CSS that puts `display` on the
    // wrapper, which would leave a hidden field on screen.
    const hidden = signal(true);
    const el = document.createElement("div");
    const scope = new Scope();
    bindHidden(scope, el, () => hidden.get());

    expect(el.hidden).toBe(true);
    expect(el.style.display).toBe("none");

    hidden.set(false);
    expect(el.hidden).toBe(false);
    expect(el.style.display).toBe("");

    scope.dispose();
  });

  it("toggles disabled reactively", () => {
    const off = signal(true);
    const el = document.createElement("button");
    const scope = new Scope();
    bindDisabled(scope, el, () => off.get());

    expect(el.disabled).toBe(true);
    off.set(false);
    expect(el.disabled).toBe(false);

    scope.dispose();
  });

  it("removes a listener registered through `on` when the scope dies", () => {
    const handler = vi.fn();
    const el = document.createElement("button");
    const scope = new Scope();
    on(scope, el, "click", handler);

    el.click();
    expect(handler).toHaveBeenCalledTimes(1);

    scope.dispose();
    el.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
