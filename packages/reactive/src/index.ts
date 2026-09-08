/**
 * `@formwright/reactive` — fine-grained reactivity shared by Formwright and Gridwright.
 *
 * A small, correct, **zero-dependency** push-pull implementation:
 *  - {@link signal} holds a value and the set of observers that read it.
 *  - {@link computed} is lazy and cached: it recomputes only when read *after* a
 *    dependency changed.
 *  - {@link effect} runs immediately and re-runs when any signal/computed it read
 *    changes — this is what binds a single value to a single DOM node.
 *
 * Writing a signal marks the dependency graph dirty and synchronously flushes the
 * affected effects (so DOM updates are immediate and deterministic). Only effects
 * that actually read the changed value re-run — there is no diffing and no virtual
 * DOM. The surface is intentionally framework-agnostic so both the form engine and
 * the data grid can build their surgical updates on the same primitives.
 */

export interface ReadSignal<T> {
  /** Read the value and subscribe the current effect/computed to changes. */
  get(): T;
  /** Read the value without subscribing. */
  peek(): T;
}

export interface WriteSignal<T> extends ReadSignal<T> {
  set(value: T): void;
  update(fn: (prev: T) => T): void;
}

export type Dispose = () => void;

interface Observer {
  /** Sources this observer currently depends on. */
  readonly sources: Set<Source>;
  /** Called when a dependency changed; the observer reacts (recompute or queue). */
  notify(): void;
}

interface Source {
  /** Observers currently subscribed to this source. */
  readonly observers: Set<Observer>;
}

/**
 * The tracking graph lives on `globalThis`, not in module scope.
 *
 * A signal created by one copy of this module and read inside an effect
 * from another copy would otherwise never link: each copy would have its
 * own `state.activeObserver`, so the read records no dependency and the effect
 * never re-runs. Nothing throws — the UI simply stops updating, which is
 * about the hardest failure to diagnose from the symptom.
 *
 * Two copies is not hypothetical. Every package here depends on this one,
 * and a consumer only has to install two of them at versions that do not
 * dedupe — or install a tarball, which never dedupes — to end up with
 * two. Keying the state to a versioned symbol on `globalThis` means the
 * graph is shared however many copies get loaded.
 */
interface ReactiveState {
  activeObserver: Observer | null;
  batchDepth: number;
  readonly pendingEffects: Set<EffectNode>;
  flushing: boolean;
}

const STATE_KEY = Symbol.for("@formwright/reactive#state.v1");

const state: ReactiveState = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {
  activeObserver: null,
  batchDepth: 0,
  pendingEffects: new Set<EffectNode>(),
  flushing: false,
}) as ReactiveState;

function link(source: Source): void {
  const obs = state.activeObserver;
  if (obs === null) return;
  if (!source.observers.has(obs)) {
    source.observers.add(obs);
    obs.sources.add(source);
  }
}

function clearSources(obs: Observer): void {
  for (const src of obs.sources) src.observers.delete(obs);
  obs.sources.clear();
}

function flush(): void {
  if (state.flushing) return;
  state.flushing = true;
  try {
    // Re-check each iteration: running an effect may queue more effects.
    while (state.pendingEffects.size > 0) {
      const next = state.pendingEffects.values().next().value as EffectNode;
      state.pendingEffects.delete(next);
      next.run();
    }
  } finally {
    state.flushing = false;
  }
}

class SignalNode<T> implements Source {
  readonly observers = new Set<Observer>();
  constructor(private value: T) {}

  get(): T {
    link(this);
    return this.value;
  }

  peek(): T {
    return this.value;
  }

  set(next: T): void {
    if (Object.is(next, this.value)) return;
    this.value = next;
    // Snapshot observers: notify() may mutate downstream sets, not ours.
    for (const obs of [...this.observers]) obs.notify();
    if (state.batchDepth === 0) flush();
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this.value));
  }
}

class ComputedNode<T> implements Source, Observer {
  readonly observers = new Set<Observer>();
  readonly sources = new Set<Source>();
  private value!: T;
  private dirty = true;

  constructor(private readonly fn: () => T) {}

  notify(): void {
    if (this.dirty) return; // already invalidated; observers already notified
    this.dirty = true;
    for (const obs of [...this.observers]) obs.notify();
  }

  get(): T {
    link(this);
    if (this.dirty) this.recompute();
    return this.value;
  }

  peek(): T {
    if (this.dirty) this.recompute();
    return this.value;
  }

  private recompute(): void {
    clearSources(this);
    const prev = state.activeObserver;
    state.activeObserver = this;
    try {
      this.value = this.fn();
      this.dirty = false;
    } finally {
      state.activeObserver = prev;
    }
  }
}

class EffectNode implements Observer {
  readonly sources = new Set<Source>();
  private cleanup: (() => void) | void = undefined;
  private disposed = false;

  constructor(private readonly fn: () => void | (() => void)) {
    this.run();
  }

  notify(): void {
    if (this.disposed) return;
    state.pendingEffects.add(this);
  }

  run(): void {
    if (this.disposed) return;
    this.runCleanup();
    clearSources(this);
    const prev = state.activeObserver;
    state.activeObserver = this;
    try {
      this.cleanup = this.fn();
    } finally {
      state.activeObserver = prev;
    }
  }

  private runCleanup(): void {
    if (typeof this.cleanup === "function") {
      this.cleanup();
      this.cleanup = undefined;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.runCleanup();
    clearSources(this);
    state.pendingEffects.delete(this);
  }
}

/** Create a writable reactive value. */
export function signal<T>(initial: T): WriteSignal<T> {
  return new SignalNode(initial);
}

/** Create a lazily-evaluated, cached derived value. */
export function computed<T>(fn: () => T): ReadSignal<T> {
  return new ComputedNode(fn);
}

/**
 * Run `fn` immediately and again whenever a signal/computed it read changes.
 * `fn` may return a cleanup function, run before each re-run and on dispose.
 * Returns a {@link Dispose} to stop the effect.
 */
export function effect(fn: () => void | (() => void)): Dispose {
  const node = new EffectNode(fn);
  return () => node.dispose();
}

/** Read reactive values inside `fn` without subscribing the current observer. */
export function untrack<T>(fn: () => T): T {
  const prev = state.activeObserver;
  state.activeObserver = null;
  try {
    return fn();
  } finally {
    state.activeObserver = prev;
  }
}

/** Batch multiple writes so effects flush once, after `fn` returns. */
export function batch<T>(fn: () => T): T {
  state.batchDepth++;
  try {
    return fn();
  } finally {
    state.batchDepth--;
    if (state.batchDepth === 0) flush();
  }
}

/** True when called inside an effect/computed tracking context. */
export function isTracking(): boolean {
  return state.activeObserver !== null;
}
