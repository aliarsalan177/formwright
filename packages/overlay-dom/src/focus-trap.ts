/**
 * Re-export of the shared focus trap.
 *
 * It was written here, but a dropdown, a command palette and a date
 * picker all need the same three jobs done, and none of them should have
 * to depend on the overlay renderer to get them. It lives in
 * `@formwright/ui-core` now; this file keeps the local imports and this
 * package's public API unchanged.
 */
export { focusableWithin, trapFocus, type FocusTrap } from "@formwright/ui-core";
