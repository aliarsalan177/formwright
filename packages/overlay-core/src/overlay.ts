import type {
  OverlayAction,
  OverlayBlock,
  OverlaySchema,
  OverlaySide,
  OverlaySize,
  ToastPosition,
} from "@formwright/overlay-schema";
import { OverlayStore, type OpenOptions, type OverlayHandle } from "./store.js";

/**
 * The ambient store, and the sugar most callers actually use.
 *
 * "Call it from anywhere" is the whole point of this module. A component
 * tree cannot be the owner: a keyboard shortcut bound at startup, a
 * fetch error handler, a plain utility module — none of them are inside
 * one, and all of them have a reason to raise a dialog.
 *
 * So the store hangs off a well-known global rather than a module-level
 * `const`. Bundlers routinely give the same module two instances across
 * chunks (server and client graphs, or two chunks that both import it),
 * and two stores means the overlay you opened is not the one the host is
 * rendering. Pinning to `globalThis` makes that impossible.
 */

const KEY = Symbol.for("@formwright/overlay-core#store");

interface GlobalWithStore {
  [KEY]?: OverlayStore;
}

export function getOverlayStore(): OverlayStore {
  const g = globalThis as GlobalWithStore;
  return (g[KEY] ??= new OverlayStore());
}

/** The schema half of the sugar, split out so the builder below can take
 *  it without the generic — `ModalOptions<T>` is not assignable to
 *  `ModalOptions<unknown>` once `onClose` puts T in a parameter. */
interface SchemaFields {
  size?: OverlaySize;
  title?: string;
  description?: string;
  body?: readonly OverlayBlock[];
  actions?: readonly OverlayAction[];
  dismiss?: OverlaySchema["dismiss"];
  meta?: Record<string, unknown>;
}

export interface ModalOptions<T> extends OpenOptions<T>, SchemaFields {
  id?: string;
}

export interface DrawerOptions<T> extends ModalOptions<T> {
  side?: OverlaySide;
}

export interface SheetOptions<T> extends ModalOptions<T> {
  snapPoints?: readonly number[];
  defaultSnap?: number;
}

export interface ToastOptions {
  /** The message. */
  text: string;
  tone?: "default" | "muted" | "danger" | "success";
  /** ms before it dismisses itself; 0 keeps it up. Default 4000. */
  duration?: number;
  position?: ToastPosition;
  id?: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  id?: string;
}

let anonymous = 0;
function autoId(prefix: string): string {
  anonymous += 1;
  return `${prefix}-${anonymous}`;
}

/**
 * Thin sugar over `store.open`. Every one of these builds a schema and
 * hands it to the same code path — there is no second way to open an
 * overlay, so anything you can do imperatively you can also do by
 * shipping a schema from a server.
 */
export const overlay = {
  get store(): OverlayStore {
    return getOverlayStore();
  },

  open<T = unknown>(schema: OverlaySchema, options?: OpenOptions<T>): OverlayHandle<T> {
    return getOverlayStore().open<T>(schema, options);
  },

  modal<T = unknown>(options: ModalOptions<T>): OverlayHandle<T> {
    return this.open<T>(toSchema("modal", options, options.id ?? autoId("modal")), options);
  },

  drawer<T = unknown>(options: DrawerOptions<T>): OverlayHandle<T> {
    const schema = toSchema("drawer", options, options.id ?? autoId("drawer"));
    return this.open<T>({ ...schema, side: options.side ?? "right" }, options);
  },

  sheet<T = unknown>(options: SheetOptions<T>): OverlayHandle<T> {
    const schema = toSchema("sheet", options, options.id ?? autoId("sheet"));
    return this.open<T>(
      {
        ...schema,
        side: "bottom",
        ...(options.snapPoints ? { snapPoints: options.snapPoints } : {}),
        ...(options.defaultSnap !== undefined ? { defaultSnap: options.defaultSnap } : {}),
      },
      options,
    );
  },

  /**
   * Ask a yes/no question and await the answer.
   *
   * `dismiss: "alert"` on purpose: escape and backdrop clicks are
   * ignored, because a confirm that disappears on a stray click has
   * thrown away a decision the user thought they were making.
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    const schema: OverlaySchema = {
      id: options.id ?? autoId("confirm"),
      kind: "modal",
      size: "sm",
      dismiss: "alert",
      title: options.title,
      ...(options.message ? { body: [{ type: "text", text: options.message } as const] } : {}),
      actions: [
        {
          name: "cancel",
          label: options.cancelLabel ?? "Cancel",
          role: "cancel",
          value: false,
        },
        {
          name: "confirm",
          label: options.confirmLabel ?? "OK",
          role: options.danger ? "danger" : "confirm",
          value: true,
        },
      ],
    };
    return getOverlayStore()
      .open<boolean>(schema)
      .result.then((value) => value === true);
  },

  /**
   * A passing notice — no backdrop, no focus, dismisses itself.
   *
   * Reusing the overlay stack rather than building a parallel system
   * means a toast raised from a dialog is tracked the same way, and
   * `closeAll()` on a route change clears both.
   */
  toast(options: ToastOptions): OverlayHandle<void> {
    return this.open<void>({
      id: options.id ?? autoId("toast"),
      kind: "toast",
      dismiss: "non-modal",
      body: [
        options.tone
          ? { type: "text", text: options.text, tone: options.tone }
          : { type: "text", text: options.text },
      ],
      duration: options.duration ?? 4000,
      ...(options.position ? { position: options.position } : {}),
      ...(options.tone ? { tone: options.tone } : {}),
    });
  },

  close(id: string, value?: unknown): void {
    getOverlayStore().close(id, value);
  },
  closeTop(): void {
    getOverlayStore().closeTop();
  },
  closeAll(): void {
    getOverlayStore().closeAll();
  },
};

function toSchema(kind: OverlaySchema["kind"], options: SchemaFields, id: string): OverlaySchema {
  return {
    id,
    kind,
    ...(options.size ? { size: options.size } : {}),
    ...(options.dismiss ? { dismiss: options.dismiss } : {}),
    ...(options.title ? { title: options.title } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.body ? { body: options.body } : {}),
    ...(options.actions ? { actions: options.actions } : {}),
    ...(options.meta ? { meta: options.meta } : {}),
  };
}
