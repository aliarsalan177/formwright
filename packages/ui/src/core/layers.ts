/**
 * Which modal surfaces are open, innermost last.
 *
 * A modal `<dialog>` makes everything outside it inert, top layer or not:
 * a toast raised above a dialog is visible but cannot be clicked. The only
 * content a modal leaves interactive is its own flat tree. So `<fw-dialog>`,
 * `<fw-drawer>` and `<fw-command-palette>` register here while open and
 * expose a `fw-layer` slot inside their native dialog; content that must
 * stay usable above any modal — toast regions — moves into the innermost
 * one and back out when it closes.
 *
 * Kept on a global symbol, like the reactive core, so two copies of the
 * package on one page still agree on the stack.
 */

/** Slot name modal surfaces provide for content that must stay interactive. */
export const LAYER_SLOT = "fw-layer";

interface LayerState {
  stack: HTMLElement[];
  listeners: Set<() => void>;
}

const KEY = Symbol.for("@formwright/ui#modal-layers.v1");
const state: LayerState = ((globalThis as Record<symbol, unknown>)[KEY] as
  | LayerState
  | undefined) ?? { stack: [], listeners: new Set() };
(globalThis as Record<symbol, unknown>)[KEY] = state;

function notify(): void {
  for (const listener of [...state.listeners]) listener();
}

/** Register `host` as the innermost open modal. Returns the matching leave. */
export function enterModalLayer(host: HTMLElement): () => void {
  state.stack.push(host);
  notify();
  let left = false;
  return () => {
    if (left) return;
    left = true;
    const at = state.stack.lastIndexOf(host);
    if (at !== -1) state.stack.splice(at, 1);
    notify();
  };
}

/** The innermost open modal still in the page, or null. */
export function topModalLayer(): HTMLElement | null {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const host = state.stack[i]!;
    if (host.isConnected) return host;
  }
  return null;
}

/** Called whenever a modal opens or closes. Returns the unsubscribe. */
export function onModalLayerChange(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}
