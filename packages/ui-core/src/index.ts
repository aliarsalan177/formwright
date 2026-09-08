/**
 * @formwright/ui-core — the headless foundation every renderer sits on.
 *
 * No markup, no styling, no opinions about what a button looks like. Just
 * the two things every renderer in this suite needs and had been copying:
 * a disposal scope, and reactive bindings that write to exactly one node.
 */
export { Scope, h, on, bindText, bindClass, bindHidden, bindDisabled } from "./dom.js";
export type { Dispose } from "@formwright/reactive";

/**
 * Behaviours. These were each written inside one renderer and needed by
 * three: a dropdown, a command palette and a date picker all have to trap
 * focus, and a drawer is not the only surface that freezes the page behind
 * it.
 */
export { focusableWithin, trapFocus, type FocusTrap } from "./focus-trap.js";
export { lockScroll, unlockScroll, resetScrollLock } from "./scroll-lock.js";
