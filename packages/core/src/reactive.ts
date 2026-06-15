/**
 * The signal engine now lives in `@wright/reactive` (shared with Gridwright).
 * This module re-exports it so `@formwright/core`'s internal imports and the
 * public `@formwright/core/reactive` subpath stay unchanged.
 *
 * Re-exports are listed explicitly (not `export *`) so the bundler can resolve
 * named imports through this shim while `@wright/reactive` stays external — that
 * keeps a single shared signal instance across Formwright and Gridwright.
 */
export {
  signal,
  computed,
  effect,
  untrack,
  batch,
  isTracking,
  type ReadSignal,
  type WriteSignal,
  type Dispose,
} from "@wright/reactive";
