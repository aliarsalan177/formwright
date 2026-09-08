---
"@formwright/overlay-schema": minor
"@formwright/overlay-dom": minor
---

Overlays take a `backdrop` option — `color`, `opacity` and `blur` — applied as CSS custom properties so a host theme still decides how they are used.

Fixes a focus-trap hang: with two overlays open, both traps pulled focus into themselves and recursed until the stack gave out. Only the top-most trap enforces now.
