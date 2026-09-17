# @formwright/overlay-dom

## 0.12.0

### Patch Changes

- @formwright/overlay-core@0.12.0
- @formwright/overlay-schema@0.12.0
- @formwright/reactive@0.12.0
- @formwright/ui-core@0.12.0

## 0.11.1

### Patch Changes

- a129d18: @formwright/ui: components register with bundlers that honour `sideEffects` (the `customElements.define()` calls live in shared chunks, which are now marked), and `<fw-tab panel>` / `<fw-tab-panel name>` reflect, so tabs and panels set through properties (React, Vue) pair up.

  @formwright/overlay-dom: dialog action hovers use `--ow-hover` instead of hard-coded colours (which followed the OS colour scheme rather than the app's theme), and confirm and danger buttons keep their colours on hover (`--ow-accent-hover`, `--ow-danger-hover`).
  - @formwright/overlay-core@0.11.1
  - @formwright/overlay-schema@0.11.1
  - @formwright/reactive@0.11.1
  - @formwright/ui-core@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [36a5675]
- Updated dependencies [b19eee8]
  - @formwright/ui-core@0.11.0
  - @formwright/overlay-core@0.11.0
  - @formwright/overlay-schema@0.11.0
  - @formwright/reactive@0.11.0

## 0.10.3

### Patch Changes

- @formwright/overlay-core@0.10.3
- @formwright/overlay-schema@0.10.3
- @formwright/reactive@0.10.3
- @formwright/ui-core@0.10.3

## 0.10.2

### Patch Changes

- @formwright/overlay-core@0.10.2
- @formwright/overlay-schema@0.10.2
- @formwright/reactive@0.10.2
- @formwright/ui-core@0.10.2

## 0.10.1

### Patch Changes

- afe74be: Add package-level npm documentation with installation, quick-start, API, safety, and integration guidance.
- 1122750: Ship visible, stacked, animated toast styles with safe-area positioning and
  theme tokens for success and danger notices.
- Updated dependencies [afe74be]
  - @formwright/reactive@0.10.1
  - @formwright/overlay-schema@0.10.1
  - @formwright/overlay-core@0.10.1
  - @formwright/ui-core@0.10.1

## 0.10.0

### Minor Changes

- 56b9528: `@formwright/reactive` keeps its tracking graph on `globalThis`, so two copies of the module share one dependency graph instead of silently failing to track each other's signals.

  Overlays gain `classNames` for the panel, head, body, footer, action and backdrop; a `footer` field pinned outside the scrolling body; a `group` so only one overlay in a group stays open; and `titleHidden`, which names a dialog with `aria-label` rather than a hidden element. Dismissal now counts any press-and-release outside the panel, and the layer keeps taking pointer events through its exit so the dismissing tap cannot reach the page underneath.

### Patch Changes

- Updated dependencies [56b9528]
  - @formwright/reactive@0.10.0
  - @formwright/overlay-schema@0.10.0
  - @formwright/overlay-core@0.10.0

## 0.9.0

### Minor Changes

- 9df39be: Adds a `toast` kind: a passing notice that stacks in a corner, announces itself politely, dismisses on a timer, and never takes focus or locks the page. `overlay.toast({ text, tone, duration, position })`; `duration: 0` keeps it up for a "working…" notice with no known end.

### Patch Changes

- Updated dependencies [9df39be]
  - @formwright/overlay-schema@0.9.0
  - @formwright/overlay-core@0.9.0
  - @formwright/reactive@0.9.0

## 0.8.0

### Minor Changes

- 3f71d46: Overlays take a `backdrop` option — `color`, `opacity` and `blur` — applied as CSS custom properties so a host theme still decides how they are used.

  Fixes a focus-trap hang: with two overlays open, both traps pulled focus into themselves and recursed until the stack gave out. Only the top-most trap enforces now.

### Patch Changes

- Updated dependencies [3f71d46]
  - @formwright/overlay-schema@0.8.0
  - @formwright/overlay-core@0.8.0
  - @formwright/reactive@0.8.0

## 0.7.0

### Minor Changes

- cac7912: Add `@formwright/overlay-dom`, the renderer for Overlaywright: focus trap with `inert`, iOS-safe scroll lock, pointer drag-to-dismiss with snap points, and a default stylesheet. No dependencies outside Formwright.

  The overlay schema validator now rejects non-finite snap points, judges `defaultSnap` independently, and type-checks block and action fields.

### Patch Changes

- Updated dependencies [cac7912]
  - @formwright/overlay-schema@0.7.0
  - @formwright/overlay-core@0.7.0
  - @formwright/reactive@0.7.0
