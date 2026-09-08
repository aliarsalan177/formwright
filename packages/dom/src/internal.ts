/**
 * Re-export of the shared DOM foundation.
 *
 * These helpers used to be defined here, which is why the grid and overlay
 * renderers — neither of which depends on this package — each grew their
 * own. They live in `@formwright/ui-core` now. This file stays so the
 * dozens of `./internal.js` imports across this package keep working, and
 * because `Scope` and `h` are part of this package's public API.
 */
export {
  Scope,
  h,
  on,
  bindText,
  bindClass,
  bindHidden,
  bindDisabled,
  type Dispose,
} from "@formwright/ui-core";
