import { describe, expect, it, vi } from "vitest";
import { batch, computed, effect, signal, untrack } from "./index.js";

describe("signal", () => {
  it("reads and writes", () => {
    const s = signal(1);
    expect(s.get()).toBe(1);
    s.set(2);
    expect(s.get()).toBe(2);
  });

  it("update applies a function", () => {
    const s = signal(10);
    s.update((p) => p + 5);
    expect(s.get()).toBe(15);
  });

  it("peek does not subscribe", () => {
    const s = signal(0);
    const spy = vi.fn();
    effect(() => {
      spy(s.peek());
    });
    expect(spy).toHaveBeenCalledTimes(1);
    s.set(1);
    expect(spy).toHaveBeenCalledTimes(1); // no re-run
  });
});

describe("computed", () => {
  it("derives and caches", () => {
    const a = signal(2);
    const fn = vi.fn(() => a.get() * 10);
    const c = computed(fn);
    expect(c.get()).toBe(20);
    expect(c.get()).toBe(20);
    expect(fn).toHaveBeenCalledTimes(1); // cached
    a.set(3);
    expect(c.get()).toBe(30);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("is lazy — does not recompute until read", () => {
    const a = signal(1);
    const fn = vi.fn(() => a.get());
    const c = computed(fn);
    c.get();
    a.set(2);
    a.set(3);
    expect(fn).toHaveBeenCalledTimes(1); // not read since changes
    expect(c.get()).toBe(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("effect", () => {
  it("runs immediately and on dependency change", () => {
    const s = signal("a");
    const seen: string[] = [];
    effect(() => {
      seen.push(s.get());
    });
    s.set("b");
    expect(seen).toEqual(["a", "b"]);
  });

  it("only re-runs effects that read the changed signal", () => {
    const a = signal(0);
    const b = signal(0);
    const aSpy = vi.fn();
    const bSpy = vi.fn();
    effect(() => {
      a.get();
      aSpy();
    });
    effect(() => {
      b.get();
      bSpy();
    });
    a.set(1);
    expect(aSpy).toHaveBeenCalledTimes(2);
    expect(bSpy).toHaveBeenCalledTimes(1); // untouched
  });

  it("runs cleanup before re-run and on dispose", () => {
    const s = signal(0);
    const cleanup = vi.fn();
    const dispose = effect(() => {
      s.get();
      return cleanup;
    });
    s.set(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(2);
    s.set(2);
    expect(cleanup).toHaveBeenCalledTimes(2); // disposed, no more runs
  });

  it("tracks dynamic dependencies", () => {
    const toggle = signal(true);
    const a = signal("a");
    const b = signal("b");
    const seen: string[] = [];
    effect(() => {
      seen.push(toggle.get() ? a.get() : b.get());
    });
    expect(seen).toEqual(["a"]);
    b.set("b2"); // not tracked yet
    expect(seen).toEqual(["a"]);
    toggle.set(false); // now reads b
    expect(seen).toEqual(["a", "b2"]);
    b.set("b3");
    expect(seen).toEqual(["a", "b2", "b3"]);
    a.set("a2"); // no longer tracked
    expect(seen).toEqual(["a", "b2", "b3"]);
  });
});

describe("batch", () => {
  it("flushes effects once after all writes", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn();
    effect(() => {
      a.get();
      b.get();
      spy();
    });
    batch(() => {
      a.set(1);
      b.set(2);
    });
    expect(spy).toHaveBeenCalledTimes(2); // initial + one batched flush
  });
});

describe("untrack", () => {
  it("reads without subscribing", () => {
    const a = signal(1);
    const b = signal(1);
    const spy = vi.fn();
    effect(() => {
      a.get();
      untrack(() => b.get());
      spy();
    });
    b.set(2);
    expect(spy).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("diamond dependency", () => {
  it("propagates through computeds to effects", () => {
    const a = signal(1);
    const b = computed(() => a.get() + 1);
    const c = computed(() => a.get() + 2);
    const d = computed(() => b.get() + c.get());
    const seen: number[] = [];
    effect(() => {
      seen.push(d.get());
    });
    expect(seen).toEqual([5]);
    a.set(2);
    expect(seen).toEqual([5, 7]);
  });
});
