/**
 * Re-export of the shared scroll lock. See ./focus-trap.ts — same reason:
 * a drawer is not the only thing that needs to freeze the page behind it.
 */
export { lockScroll, unlockScroll, resetScrollLock } from "@formwright/ui-core";
