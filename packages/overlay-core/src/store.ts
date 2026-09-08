import { batch, computed, signal, type ReadSignal } from "@formwright/reactive";
import type {
  DismissMode,
  OverlayKind,
  OverlaySchema,
  OverlaySide,
} from "@formwright/overlay-schema";

/**
 * One stack of overlays, held in signals, owned by nobody in particular.
 *
 * Two requirements shape this module.
 *
 * **Openable from anywhere.** The store cannot live inside a component
 * tree — a plain module, a route handler's callback, a keyboard shortcut
 * registered at startup all have to reach it. So it is a value you
 * import, and renderers subscribe to it rather than owning it.
 *
 * **A drawer and a modal, together or separately.** Hence a stack, not a
 * slot per kind. A modal opened from inside a drawer leaves the drawer
 * mounted underneath, dismisses on its own, and hands focus back to what
 * it interrupted. One `activeModal` field cannot express that, and a
 * slot per kind breaks the moment two modals nest.
 *
 * Signals keep the subscription surgical: pushing a fourth entry wakes
 * only the effects that read the stack.
 */

const DEFAULT_DISMISS: Record<OverlayKind, DismissMode> = {
  modal: "modal",
  drawer: "modal",
  sheet: "modal",
  // A popover sits beside the page rather than over it. Trapping focus
  // or locking scroll here would make every dropdown fight the document.
  popover: "non-modal",
  // A toast is a notice, not a demand: it must never steal the keyboard
  // or freeze the page, and it dismisses itself.
  toast: "non-modal",
};

const DEFAULT_SIDE: Record<OverlayKind, OverlaySide> = {
  modal: "bottom",
  drawer: "right",
  sheet: "bottom",
  popover: "bottom",
  toast: "bottom",
};

export type OverlayId = string;

/** Content a renderer supplies for a `slot` block, keyed by slot name. */
export type OverlaySlots = Record<string, unknown>;

export interface OpenOptions<T = unknown> {
  /** Fills the schema's `slot` blocks. */
  slots?: OverlaySlots;
  /** Called when the overlay finishes closing, with the action's value. */
  onClose?: (value: T | undefined) => void;
}

export interface OverlayEntry {
  readonly id: OverlayId;
  readonly schema: OverlaySchema;
  readonly kind: OverlayKind;
  readonly side: OverlaySide;
  readonly dismiss: DismissMode;
  readonly slots: OverlaySlots;
  /** Position in the stack, 0 at the bottom. Renderers derive z-index
   *  from this so a modal over a drawer paints above it. */
  readonly index: number;
  /** Which snap point a sheet currently rests at. */
  readonly snap: number;
  /** False while the exit transition plays. The entry stays on the stack
   *  until the renderer calls `remove`, so content does not blink out
   *  from under the animation. */
  readonly open: boolean;
}

export interface OverlayHandle<T = unknown> {
  readonly id: OverlayId;
  /** Resolves with the value of whichever action closed the overlay, or
   *  `undefined` when it was dismissed. Awaiting this is how a confirm
   *  reads its answer without a callback. */
  readonly result: Promise<T | undefined>;
  close(value?: T): void;
}

interface Record_ {
  id: OverlayId;
  schema: OverlaySchema;
  slots: OverlaySlots;
  snap: number;
  open: boolean;
  lifecycle: Lifecycle;
}

interface Lifecycle {
  result: Promise<unknown>;
  settle: (value: unknown) => void;
  callbacks: Set<(value: unknown) => void>;
  settled: boolean;
}

export class OverlayStore {
  readonly #records = signal<readonly Record_[]>([]);

  /** The stack, bottom-most first. Read this in an effect to paint. */
  readonly stack: ReadSignal<readonly OverlayEntry[]>;

  /** The entry that owns the keyboard: top-most, still open, and modal
   *  enough to take focus. */
  readonly top: ReadSignal<OverlayEntry | null>;

  /**
   * True while anything on the stack wants the page frozen.
   *
   * Derived across the whole stack rather than toggled per overlay,
   * because closing a modal that was opened from a drawer must not
   * release a lock the drawer still needs.
   */
  readonly locksScroll: ReadSignal<boolean>;

  constructor() {
    this.stack = computed<readonly OverlayEntry[]>(() => this.#records.get().map(toEntry));
    this.top = computed<OverlayEntry | null>(() => {
      const stack = this.stack.get();
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        const entry = stack[i];
        if (entry && entry.open && entry.dismiss !== "non-modal") return entry;
      }
      return null;
    });
    this.locksScroll = computed(() =>
      this.stack.get().some((e) => e.open && e.dismiss !== "non-modal"),
    );
  }

  /**
   * Push an overlay described by a schema.
   *
   * Reopening an id already on the stack refreshes that entry in place.
   * Stacking a duplicate would leave an unreachable copy underneath and
   * two exit animations racing — and a double-fired click is a far more
   * common event than a genuine desire for two identical dialogs.
   */
  open<T = unknown>(schema: OverlaySchema, options: OpenOptions<T> = {}): OverlayHandle<T> {
    const existing = this.#records.peek().find((r) => r.id === schema.id);
    if (existing?.open) {
      if (options.onClose) {
        existing.lifecycle.callbacks.add(options.onClose as (value: unknown) => void);
      }
      this.#records.update((records) =>
        records.map((r) =>
          r.id === schema.id
            ? {
                ...r,
                schema,
                slots: options.slots ?? {},
                snap: clampSnap(r.snap, schema.snapPoints ?? []),
              }
            : r,
        ),
      );
      return this.#handle<T>(existing.id, existing.lifecycle);
    }

    const lifecycle = createLifecycle(options.onClose);

    const record: Record_ = {
      id: schema.id,
      schema,
      slots: options.slots ?? {},
      snap: initialSnap(schema),
      open: true,
      lifecycle,
    };
    this.#records.update((records) =>
      existing
        ? records.map((candidate) => (candidate.id === schema.id ? record : candidate))
        : [...records, record],
    );

    return this.#handle<T>(record.id, lifecycle);
  }

  /**
   * Begin closing an overlay.
   *
   * The record is marked closed but stays on the stack so the renderer
   * can animate it out against real content; `remove` drops it. A
   * renderer without transitions may call both back to back.
   */
  close(id: OverlayId, value?: unknown): void {
    const record = this.#records.peek().find((r) => r.id === id);
    if (!record) return;
    this.#closeLifecycle(record, record.lifecycle, value);
  }

  #closeLifecycle(record: Record_, lifecycle: Lifecycle, value?: unknown): void {
    if (!record.open || record.lifecycle !== lifecycle || lifecycle.settled) return;
    this.#records.update((records) =>
      records.map((candidate) =>
        candidate.id === record.id && candidate.lifecycle === lifecycle
          ? { ...candidate, open: false }
          : candidate,
      ),
    );
    settleLifecycle(lifecycle, value);
  }

  /** Drop a closed overlay once its exit transition has finished. */
  remove(id: OverlayId): void {
    this.#records.update((records) => records.filter((record) => record.id !== id || record.open));
  }

  /**
   * Close the top-most dismissible overlay — what Escape and a backdrop
   * click mean.
   *
   * Only ever the top one: Escape with a modal over a drawer closes the
   * modal and leaves the drawer, which is both what a user expects and
   * what the ARIA authoring practices require. `alert` refuses, because
   * its whole point is that the question gets answered.
   */
  closeTop(): OverlayId | null {
    const top = this.top.get();
    if (!top || top.dismiss === "alert") return null;
    this.close(top.id);
    return top.id;
  }

  /** Close everything — for route changes, where leaving a stack over a
   *  page that no longer exists is worse than losing its state. */
  closeAll(): void {
    batch(() => {
      for (const record of this.#records.peek()) {
        if (record.open) this.close(record.id);
      }
    });
  }

  /** Move a sheet to another snap point. No-op for the other kinds. */
  setSnap(id: OverlayId, snap: number): void {
    this.#records.update((records) =>
      records.map((r) =>
        r.id === id ? { ...r, snap: clampSnap(snap, r.schema.snapPoints ?? []) } : r,
      ),
    );
  }

  get(id: OverlayId): OverlayEntry | null {
    return this.stack.get().find((entry) => entry.id === id) ?? null;
  }

  #handle<T>(id: OverlayId, lifecycle: Lifecycle): OverlayHandle<T> {
    return {
      id,
      result: lifecycle.result as Promise<T | undefined>,
      close: (value?: T) => {
        const record = this.#records.peek().find((candidate) => candidate.id === id);
        if (record) this.#closeLifecycle(record, lifecycle, value);
      },
    };
  }
}

function toEntry(record: Record_, index: number): OverlayEntry {
  const { schema } = record;
  return {
    id: record.id,
    schema,
    kind: schema.kind,
    side: schema.side ?? DEFAULT_SIDE[schema.kind],
    dismiss: schema.dismiss ?? DEFAULT_DISMISS[schema.kind],
    slots: record.slots,
    index,
    snap: record.snap,
    open: record.open,
  };
}

function clampSnap(snap: number, points: readonly number[]): number {
  if (points.length === 0) return 0;
  return Math.min(points.length - 1, Math.max(0, Math.round(snap)));
}

function initialSnap(schema: OverlaySchema): number {
  return clampSnap(schema.defaultSnap ?? 0, schema.snapPoints ?? []);
}

function createLifecycle<T>(onClose: OpenOptions<T>["onClose"]): Lifecycle {
  let settle!: (value: unknown) => void;
  const result = new Promise<unknown>((resolve) => {
    settle = resolve;
  });
  const callbacks = new Set<(value: unknown) => void>();
  if (onClose) callbacks.add(onClose as (value: unknown) => void);
  return { result, settle, callbacks, settled: false };
}

function settleLifecycle(lifecycle: Lifecycle, value: unknown): void {
  if (lifecycle.settled) return;
  lifecycle.settled = true;
  lifecycle.settle(value);

  const callbacks = [...lifecycle.callbacks];
  lifecycle.callbacks.clear();
  const errors: unknown[] = [];
  for (const callback of callbacks) {
    try {
      callback(value);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw errors[0];
}
