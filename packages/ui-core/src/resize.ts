import type { Dispose } from "@formwright/reactive";

/**
 * One ResizeObserver for every element anything is watching.
 *
 * A popover watches its trigger and itself; a page of selects would have
 * built two observers each. Observers are cheap until there are hundreds,
 * and a component library is exactly how you get hundreds — so they share
 * one, and an element is only observed while something still cares.
 */
type Callback = () => void;

let callbacks = new WeakMap<Element, Set<Callback>>();
let observer: ResizeObserver | null = null;

function shared(): ResizeObserver | null {
  // jsdom and older runtimes have none. Nothing to observe then, and
  // callers still work — they simply are not told about resizes.
  if (typeof ResizeObserver === "undefined") return null;
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const set = callbacks.get(entry.target);
      if (!set) continue;
      // Copy: a callback may unsubscribe itself while we iterate.
      for (const cb of [...set]) cb();
    }
  });
  return observer;
}

/** Call `cb` whenever `el` changes size. Returns the undo. */
export function observeResize(el: Element, cb: Callback): Dispose {
  const ro = shared();
  if (!ro) return () => {};

  let set = callbacks.get(el);
  if (!set) {
    set = new Set();
    callbacks.set(el, set);
    ro.observe(el);
  }
  set.add(cb);

  return () => {
    const current = callbacks.get(el);
    if (!current) return;
    current.delete(cb);
    if (current.size === 0) {
      callbacks.delete(el);
      ro.unobserve(el);
    }
  };
}

/** Test seam: forget the shared observer so a stubbed one can be installed. */
export function resetResizePool(): void {
  observer?.disconnect();
  observer = null;
  callbacks = new WeakMap();
}
