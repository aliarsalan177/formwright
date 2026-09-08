/**
 * Leak harness.
 *
 * "No memory leaks" is the kind of claim that is true on the day it is
 * written and quietly false a year later, because nothing fails when it
 * stops being true. This makes it fail.
 *
 * The idea is narrow on purpose: wrap a window of time, record every
 * subscription the browser lets us see going in, and check they are all
 * gone coming out. It cannot prove the absence of leaks — nothing can —
 * but it catches the four that actually happen in DOM component code: a
 * listener never removed, a timer never cleared, an animation frame left
 * pending, and an observer left observing.
 *
 * One known blind spot: listeners added directly to `window` are caught in
 * a real browser, where `window` inherits `addEventListener` from
 * `EventTarget.prototype`, but not reliably under vitest's jsdom, which
 * hands tests a proxied window whose own methods cannot be replaced. Put
 * window-level assertions in a browser-run suite.
 *
 * ```ts
 * const leaks = trackLeaks();
 * const { el, dispose } = Button({ label: "Save" });
 * document.body.append(el);
 * el.click();
 * dispose();
 * el.remove();
 * leaks.assertClean();   // throws, naming what was left behind
 * leaks.restore();
 * ```
 *
 * Exported from `@formwright/ui-core/testing` so it is available to
 * anyone building components on this foundation, and so it never reaches
 * a production bundle.
 */

interface ListenerRecord {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject | null;
  capture: boolean;
}

export interface LeakReport {
  /** Listeners added during the window and never removed. */
  listeners: readonly string[];
  /** Timers started during the window and still pending. */
  timers: number;
  /** Intervals started during the window and never cleared. */
  intervals: number;
  /** Animation frames requested during the window and never cancelled. */
  frames: number;
  /** Observers constructed during the window and never disconnected. */
  observers: readonly string[];
  /**
   * True when nothing that outlives the component was left behind.
   *
   * Pending timeouts and animation frames are deliberately excluded: both
   * fire once and are gone, and scheduling a final cleanup on the next
   * tick is an ordinary, correct thing for a dispose to do. An interval
   * is a different animal — nothing stops it — so it counts.
   */
  clean: boolean;
}

export interface LeakTracker {
  /** What is still outstanding right now. */
  report(): LeakReport;
  /**
   * Throw with a readable summary unless everything was cleaned up.
   *
   * `strict` additionally fails on pending timeouts and animation frames —
   * worth turning on for a component that claims a synchronous teardown.
   */
  assertClean(message?: string, options?: { strict?: boolean }): void;
  /** Put the globals back. Always call this, even when a test fails. */
  restore(): void;
}

function captureOf(options: boolean | AddEventListenerOptions | undefined): boolean {
  return typeof options === "boolean" ? options : (options?.capture ?? false);
}

function describe(target: EventTarget): string {
  if (typeof Element !== "undefined" && target instanceof Element) {
    const id = target.id ? `#${target.id}` : "";
    const cls =
      target.className && typeof target.className === "string"
        ? `.${target.className.trim().split(/\s+/).join(".")}`
        : "";
    return `${target.tagName.toLowerCase()}${id}${cls}`;
  }
  if (typeof window !== "undefined" && target === window) return "window";
  if (typeof document !== "undefined" && target === document) return "document";
  return target.constructor?.name ?? "EventTarget";
}

/** Observer classes to watch, when the environment has them. jsdom has none
 *  of the three, so this is empty there and the check is a no-op rather
 *  than a false pass — the browser-run suite is where it bites. */
const OBSERVER_NAMES = [
  "ResizeObserver",
  "IntersectionObserver",
  "MutationObserver",
  "PerformanceObserver",
] as const;

/**
 * Listeners the environment owns, which no component should be blamed for.
 *
 * jsdom attaches a capturing `mouseover` / `mouseout` pair to `document`
 * for every stylesheet appended — that is how it tracks `:hover` — and
 * takes them down again when the sheet goes. Any component that injects
 * its own styles therefore looks like it leaks a pair, forever.
 *
 * Filtering by shape rather than by a blanket "ignore document" rule: it
 * is specifically capturing mouse-enter/leave handlers on the document
 * itself, which is not a thing component code does — hover in a component
 * belongs on the component, and modern code reaches for `pointerover`.
 * Pass `ignore` to extend this for a host with its own quirks.
 */
/**
 * Is this listener still reachable?
 *
 * A listener on a node that has left the document dies with the node the
 * moment nothing references it — that is the garbage collector's job, not
 * the component's, and demanding an explicit `removeEventListener` for
 * every child of a discarded subtree would be busywork that makes the
 * harness feel wrong and get switched off.
 *
 * What genuinely leaks is a listener on something that outlives the
 * component: `document`, `window`, or a node still in the tree.
 */
function isStillReachable(record: ListenerRecord): boolean {
  const target = record.target;
  if (typeof Node !== "undefined" && target instanceof Node) {
    return target.isConnected;
  }
  // document, window, XHR, a MediaQueryList — anything not a node is
  // assumed to outlive the component, because it usually does.
  return true;
}

function isEnvironmentOwned(record: ListenerRecord): boolean {
  return (
    typeof document !== "undefined" &&
    record.target === document &&
    record.capture &&
    (record.type === "mouseover" || record.type === "mouseout")
  );
}

export interface TrackLeaksOptions {
  /** Return true for a listener that is not the code-under-test's to clean
   *  up. Applied on top of the built-in environment filter. */
  ignore?: (record: {
    readonly target: EventTarget;
    readonly type: string;
    readonly capture: boolean;
  }) => boolean;
}

export function trackLeaks(options: TrackLeaksOptions = {}): LeakTracker {
  const ignore = options.ignore;
  const listeners: ListenerRecord[] = [];
  const timers = new Set<unknown>();
  const intervals = new Set<unknown>();
  const frames = new Set<number>();
  const observers = new Map<object, string>();
  const undo: Array<() => void> = [];

  // --- listeners -----------------------------------------------------
  const addEL = EventTarget.prototype.addEventListener;
  const removeEL = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    // A `once` listener removes itself, so counting it would report a leak
    // that resolves on its own the moment the event fires.
    const once = typeof options === "object" && options?.once === true;
    if (!once) {
      listeners.push({ target: this, type, handler, capture: captureOf(options) });
    }
    return addEL.call(this, type, handler, options as AddEventListenerOptions);
  };

  EventTarget.prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    const capture = captureOf(options);
    const i = listeners.findIndex(
      (r) => r.target === this && r.type === type && r.handler === handler && r.capture === capture,
    );
    if (i !== -1) listeners.splice(i, 1);
    return removeEL.call(this, type, handler, options as EventListenerOptions);
  };

  undo.push(() => {
    EventTarget.prototype.addEventListener = addEL;
    EventTarget.prototype.removeEventListener = removeEL;
  });

  /**
   * Patch a target that shadows the prototype methods with its own.
   *
   * jsdom's `window` does exactly this — it carries own `addEventListener`
   * and `removeEventListener` properties and is not even an instance of
   * `EventTarget` — so patching the prototype alone misses every
   * `window.addEventListener("resize", …)`, which is precisely the kind
   * that outlives a component and leaks.
   */
  function patchOwnListeners(target: EventTarget | undefined): void {
    if (!target) return;
    const own = Object.prototype.hasOwnProperty;
    if (!own.call(target, "addEventListener")) return;
    const t = target as unknown as Record<string, unknown>;
    const add = t.addEventListener as typeof addEL;
    const remove = t.removeEventListener as typeof removeEL;

    t.addEventListener = function (
      this: EventTarget,
      type: string,
      handler: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      const once = typeof options === "object" && options?.once === true;
      if (!once) {
        listeners.push({ target, type, handler, capture: captureOf(options) });
      }
      return add.call(target, type, handler, options as AddEventListenerOptions);
    } as never;

    t.removeEventListener = function (
      this: EventTarget,
      type: string,
      handler: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ) {
      const capture = captureOf(options);
      const i = listeners.findIndex(
        (r) =>
          r.target === target && r.type === type && r.handler === handler && r.capture === capture,
      );
      if (i !== -1) listeners.splice(i, 1);
      return remove.call(target, type, handler, options as EventListenerOptions);
    } as never;

    undo.push(() => {
      t.addEventListener = add as never;
      t.removeEventListener = remove as never;
    });
  }

  if (typeof window !== "undefined") patchOwnListeners(window);
  patchOwnListeners(globalThis as unknown as EventTarget);

  // --- timers --------------------------------------------------------
  const g = globalThis as unknown as Record<string, unknown>;

  /**
   * Depth of an in-flight `requestAnimationFrame` call.
   *
   * jsdom implements rAF on top of `setInterval`, so a component that asks
   * for one animation frame appears to open an interval it never closes.
   * The interval is the environment's, created while servicing our call,
   * and it is the environment's to clean up — so anything scheduled from
   * inside the rAF shim is not counted.
   */
  let servicingFrame = 0;

  const origSetTimeout = g.setTimeout as (...a: unknown[]) => unknown;
  const origClearTimeout = g.clearTimeout as (id: unknown) => void;
  const origSetInterval = g.setInterval as (...a: unknown[]) => unknown;
  const origClearInterval = g.clearInterval as (id: unknown) => void;

  // A timeout that has already fired is not a leak — it is a timeout that
  // did its job. So the callback is wrapped to forget its own id, and only
  // timers still waiting to fire are counted. The id is not known until
  // the call returns, hence the holder; the callback cannot run before
  // then, so it is always set by the time anything reads it.
  g.setTimeout = ((fn: unknown, ...rest: unknown[]) => {
    if (typeof fn !== "function") return origSetTimeout(fn, ...rest);
    let id: unknown;
    const wrapped = (...args: unknown[]) => {
      timers.delete(id);
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
    id = origSetTimeout(wrapped, ...rest);
    timers.add(id);
    return id;
  }) as never;

  g.clearTimeout = ((id: unknown) => {
    timers.delete(id);
    return origClearTimeout(id);
  }) as never;

  // An interval, by contrast, is outstanding until someone clears it.
  g.setInterval = ((...a: unknown[]) => {
    const id = origSetInterval(...a);
    if (servicingFrame === 0) intervals.add(id);
    return id;
  }) as never;

  g.clearInterval = ((id: unknown) => {
    intervals.delete(id);
    return origClearInterval(id);
  }) as never;

  undo.push(() => {
    g.setTimeout = origSetTimeout as never;
    g.clearTimeout = origClearTimeout as never;
    g.setInterval = origSetInterval as never;
    g.clearInterval = origClearInterval as never;
  });

  // --- animation frames ----------------------------------------------
  if (typeof g.requestAnimationFrame === "function") {
    const raf = g.requestAnimationFrame as (cb: FrameRequestCallback) => number;
    const caf = g.cancelAnimationFrame as (id: number) => void;
    g.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      servicingFrame += 1;
      let id: number;
      try {
        id = raf((t) => {
          frames.delete(id);
          cb(t);
        });
      } finally {
        servicingFrame -= 1;
      }
      frames.add(id);
      return id;
    }) as never;
    g.cancelAnimationFrame = ((id: number) => {
      frames.delete(id);
      return caf(id);
    }) as never;
    undo.push(() => {
      g.requestAnimationFrame = raf as never;
      g.cancelAnimationFrame = caf as never;
    });
  }

  // --- observers -----------------------------------------------------
  for (const name of OBSERVER_NAMES) {
    const Original = (globalThis as Record<string, unknown>)[name] as
      | (new (...a: never[]) => { observe(...a: never[]): void; disconnect(): void })
      | undefined;
    if (typeof Original !== "function") continue;

    class Tracked extends Original {
      override observe(...a: never[]): void {
        observers.set(this, name);
        super.observe(...a);
      }
      override disconnect(): void {
        observers.delete(this);
        super.disconnect();
      }
    }
    (globalThis as Record<string, unknown>)[name] = Tracked;
    undo.push(() => {
      (globalThis as Record<string, unknown>)[name] = Original;
    });
  }

  function report(): LeakReport {
    const leakedListeners = listeners
      .filter((r) => isStillReachable(r) && !isEnvironmentOwned(r) && !(ignore?.(r) ?? false))
      .map((r) => `${describe(r.target)} · ${r.type}${r.capture ? " (capture)" : ""}`);
    const leakedObservers = [...observers.values()];
    return {
      listeners: leakedListeners,
      timers: timers.size,
      intervals: intervals.size,
      frames: frames.size,
      observers: leakedObservers,
      clean: leakedListeners.length === 0 && intervals.size === 0 && leakedObservers.length === 0,
    };
  }

  return {
    report,
    assertClean(message = "Disposal left something behind", options = {}) {
      const r = report();
      const strict = options.strict === true;
      const pending = strict && (r.timers > 0 || r.frames > 0);
      if (r.clean && !pending) return;
      const lines: string[] = [];
      if (r.listeners.length > 0) {
        lines.push(`  ${r.listeners.length} listener(s) still attached:`);
        for (const l of r.listeners) lines.push(`    · ${l}`);
      }
      if (r.intervals > 0) lines.push(`  ${r.intervals} interval(s) never cleared`);
      if (strict && r.timers > 0) {
        lines.push(`  ${r.timers} timeout(s) still pending`);
      }
      if (strict && r.frames > 0) {
        lines.push(`  ${r.frames} animation frame(s) never cancelled`);
      }
      if (r.observers.length > 0) {
        lines.push(`  observer(s) never disconnected: ${r.observers.join(", ")}`);
      }
      throw new Error(`${message}\n${lines.join("\n")}`);
    },
    restore() {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      undo.length = 0;
    },
  };
}
