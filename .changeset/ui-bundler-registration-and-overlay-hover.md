---
"@formwright/ui": patch
"@formwright/overlay-dom": patch
---

@formwright/ui: components register with bundlers that honour `sideEffects` (the `customElements.define()` calls live in shared chunks, which are now marked), and `<fw-tab panel>` / `<fw-tab-panel name>` reflect, so tabs and panels set through properties (React, Vue) pair up.

@formwright/overlay-dom: dialog action hovers use `--ow-hover` instead of hard-coded colours (which followed the OS colour scheme rather than the app's theme), and confirm and danger buttons keep their colours on hover (`--ow-accent-hover`, `--ow-danger-hover`).
