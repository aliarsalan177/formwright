import { effect } from "@formwright/reactive";
import type { OverlaySchema } from "@formwright/overlay-schema";
import {
  getOverlayStore,
  type OverlayEntry,
  type OverlayId,
  type OverlayStore,
} from "@formwright/overlay-core";
import { trapFocus, type FocusTrap } from "./focus-trap.js";
import { lockScroll, unlockScroll } from "./scroll-lock.js";
import { enableDrag } from "./drag.js";
import { renderPanel, type RenderContext } from "./render.js";
import { injectStyles, OVERLAY_STYLES } from "./styles.js";

export { OVERLAY_STYLES } from "./styles.js";
export { focusableWithin, trapFocus, type FocusTrap } from "./focus-trap.js";
export { lockScroll, unlockScroll, resetScrollLock } from "./scroll-lock.js";
export { enableDrag, type DragOptions } from "./drag.js";
export { renderPanel, type RenderContext, type RenderedPanel } from "./render.js";

export interface MountOptions {
  /** Where the overlay root is appended. Defaults to <body>. */
  container?: HTMLElement;
  /** `false` to inject nothing, a string to inject your own sheet. */
  styles?: string | boolean;
  /** Which store to paint. Defaults to the ambient one, which is what
   *  makes `overlay.modal()` from anywhere reach this host. */
  store?: OverlayStore;
  /** Renders a `form` body block. Wire this up to keep the overlay
   *  package independent of the form engine. */
  renderForm?: RenderContext["renderForm"];
  /** How long the exit transition runs before the entry is dropped.
   *  Must match the CSS; 0 removes immediately. */
  exitMs?: number;
}

interface Mounted {
  layer: HTMLElement;
  panel: HTMLElement;
  trap: FocusTrap | null;
  stopDrag: (() => void) | null;
  disposeContent: () => void;
  locked: boolean;
  closing: boolean;
}

/**
 * Paint an overlay store into the document.
 *
 * Call once, near the top of the app. Everything else — opening,
 * closing, awaiting a result — happens through the store from wherever
 * the code lives, which is the point of the whole design.
 *
 * The stack drives the DOM rather than the other way round, so a
 * mount/unmount pass is a diff of ids: anything on the stack that has no
 * element gets one, anything closed plays its exit and is removed.
 */
export function mountOverlays(options: MountOptions = {}): () => void {
  const store = options.store ?? getOverlayStore();
  const container = options.container ?? document.body;
  const exitMs = options.exitMs ?? 220;
  injectStyles(options.styles ?? OVERLAY_STYLES);

  const root = document.createElement("div");
  root.className = "ow-root";
  container.appendChild(root);

  const mounted = new Map<OverlayId, Mounted>();

  const dismiss = (entry: OverlayEntry) => {
    // Only the top entry answers Escape or a backdrop click, and an
    // alert answers neither — that is the store's rule, not ours.
    if (entry.dismiss === "alert") return;
    store.close(entry.id);
  };

  const mount = (entry: OverlayEntry) => {
    const layer = document.createElement("div");
    layer.className = "ow-layer";
    layer.dataset.open = "false";
    layer.style.zIndex = String(entry.index);

    const backdrop = document.createElement("div");
    backdrop.className = "ow-backdrop";
    applyBackdrop(backdrop, entry.schema.backdrop);
    if (entry.dismiss !== "non-modal") {
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target !== backdrop) return;
        dismiss(entry);
      });
      layer.appendChild(backdrop);
    }

    const rendered = renderPanel(entry, {
      slots: entry.slots as Record<string, unknown>,
      ...(options.renderForm ? { renderForm: options.renderForm } : {}),
      onAction: (action) => {
        if (action.closeOnRun === false) return;
        store.close(entry.id, action.value);
      },
    });
    layer.appendChild(rendered.panel);
    root.appendChild(layer);

    const record: Mounted = {
      layer,
      panel: rendered.panel,
      trap: null,
      stopDrag: null,
      disposeContent: rendered.dispose,
      locked: false,
      closing: false,
    };
    mounted.set(entry.id, record);

    // Let the browser paint the closed state once, so the transition to
    // open actually runs instead of the panel appearing in place.
    requestAnimationFrame(() => {
      if (!mounted.has(entry.id)) return;
      layer.dataset.open = "true";
    });

    if (entry.dismiss !== "non-modal") {
      lockScroll();
      record.locked = true;
      record.trap = trapFocus(rendered.panel);
    }

    if (entry.kind === "sheet" || entry.kind === "drawer") {
      const snapPoints = entry.schema.snapPoints ?? [];
      applySnap(rendered.panel, snapPoints, entry.snap);
      record.stopDrag = enableDrag({
        panel: rendered.panel,
        side: entry.side,
        snapPoints,
        snap: entry.snap,
        handle: rendered.grip,
        onSnap: (index) => {
          store.setSnap(entry.id, index);
          applySnap(rendered.panel, snapPoints, index);
        },
        onDismiss: () => dismiss(entry),
      });
    }
  };

  const unmount = (id: OverlayId) => {
    const record = mounted.get(id);
    if (!record || record.closing) return;
    record.closing = true;
    record.layer.dataset.open = "false";
    record.stopDrag?.();
    // Release focus before the element goes, so the previously focused
    // control is still there to receive it.
    record.trap?.release();
    if (record.locked) unlockScroll();

    const finish = () => {
      record.disposeContent();
      record.layer.remove();
      mounted.delete(id);
      store.remove(id);
    };
    if (exitMs <= 0) finish();
    else window.setTimeout(finish, exitMs);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const top = store.top.get();
    if (!top || top.dismiss === "alert") return;
    event.preventDefault();
    store.close(top.id);
  };
  document.addEventListener("keydown", onKeyDown);

  const stopEffect = effect(() => {
    const stack = store.stack.get();
    const seen = new Set<OverlayId>();
    for (const entry of stack) {
      seen.add(entry.id);
      const record = mounted.get(entry.id);
      if (!record) {
        if (entry.open) mount(entry);
        continue;
      }
      record.layer.style.zIndex = String(entry.index);
      if (!entry.open) unmount(entry.id);
    }
    // An entry removed from the store without passing through close()
    // still has to give its DOM and its locks back.
    for (const id of [...mounted.keys()]) {
      if (!seen.has(id)) unmount(id);
    }
  });

  return () => {
    stopEffect();
    document.removeEventListener("keydown", onKeyDown);
    for (const [id, record] of mounted) {
      record.stopDrag?.();
      record.trap?.release();
      if (record.locked) unlockScroll();
      record.disposeContent();
      record.layer.remove();
      mounted.delete(id);
    }
    root.remove();
  };
}

/**
 * Per-overlay scrim overrides.
 *
 * Written as custom properties rather than as `background` and
 * `backdrop-filter` directly, so a host stylesheet still decides how
 * they are used — a theme that wants a gradient scrim, or no blur on
 * low-end devices, keeps that control instead of being overruled by an
 * inline style it cannot beat.
 */
function applyBackdrop(el: HTMLElement, backdrop: OverlaySchema["backdrop"]): void {
  if (!backdrop) return;
  if (backdrop.color) el.style.setProperty("--ow-backdrop-color", backdrop.color);
  if (backdrop.opacity != null) {
    el.style.setProperty("--ow-backdrop-opacity", String(backdrop.opacity));
  }
  if (backdrop.blur != null) {
    el.style.setProperty("--ow-backdrop-blur", `${backdrop.blur}px`);
  }
}

/** A sheet resting at a snap point is sized to that fraction. */
function applySnap(panel: HTMLElement, snapPoints: readonly number[], index: number): void {
  const point = snapPoints[index];
  if (point == null) {
    panel.style.removeProperty("--ow-snap");
    return;
  }
  panel.style.setProperty("--ow-snap", `${Math.round(point * 100)}dvh`);
}
