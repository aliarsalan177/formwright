# @formwright/overlay-core

## 0.10.0

### Minor Changes

- 56b9528: `@formwright/reactive` keeps its tracking graph on `globalThis`, so two copies of the module share one dependency graph instead of silently failing to track each other's signals.

  Overlays gain `classNames` for the panel, head, body, footer, action and backdrop; a `footer` field pinned outside the scrolling body; a `group` so only one overlay in a group stays open; and `titleHidden`, which names a dialog with `aria-label` rather than a hidden element. Dismissal now counts any press-and-release outside the panel, and the layer keeps taking pointer events through its exit so the dismissing tap cannot reach the page underneath.

### Patch Changes

- Updated dependencies [56b9528]
  - @formwright/reactive@0.10.0
  - @formwright/overlay-schema@0.10.0

## 0.9.0

### Minor Changes

- 9df39be: Adds a `toast` kind: a passing notice that stacks in a corner, announces itself politely, dismisses on a timer, and never takes focus or locks the page. `overlay.toast({ text, tone, duration, position })`; `duration: 0` keeps it up for a "working…" notice with no known end.

### Patch Changes

- Updated dependencies [9df39be]
  - @formwright/overlay-schema@0.9.0
  - @formwright/reactive@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [3f71d46]
  - @formwright/overlay-schema@0.8.0
  - @formwright/reactive@0.8.0

## 0.7.0

### Patch Changes

- cac7912: Add `@formwright/overlay-dom`, the renderer for Overlaywright: focus trap with `inert`, iOS-safe scroll lock, pointer drag-to-dismiss with snap points, and a default stylesheet. No dependencies outside Formwright.

  The overlay schema validator now rejects non-finite snap points, judges `defaultSnap` independently, and type-checks block and action fields.

- Updated dependencies [cac7912]
  - @formwright/overlay-schema@0.7.0
  - @formwright/reactive@0.7.0

## 0.6.0

### Minor Changes

- e4d7b04: Add Overlaywright to npm: `@formwright/overlay-schema` and `@formwright/overlay-core` for schema-driven modals, drawers, and sheets.

### Patch Changes

- Updated dependencies [e4d7b04]
  - @formwright/overlay-schema@0.6.0
  - @formwright/reactive@0.6.0
