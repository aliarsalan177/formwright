# @formwright/overlay-schema

## 0.8.0

### Minor Changes

- 3f71d46: Overlays take a `backdrop` option — `color`, `opacity` and `blur` — applied as CSS custom properties so a host theme still decides how they are used.

  Fixes a focus-trap hang: with two overlays open, both traps pulled focus into themselves and recursed until the stack gave out. Only the top-most trap enforces now.

### Patch Changes

- @formwright/schema@0.8.0

## 0.7.0

### Minor Changes

- cac7912: Add `@formwright/overlay-dom`, the renderer for Overlaywright: focus trap with `inert`, iOS-safe scroll lock, pointer drag-to-dismiss with snap points, and a default stylesheet. No dependencies outside Formwright.

  The overlay schema validator now rejects non-finite snap points, judges `defaultSnap` independently, and type-checks block and action fields.

### Patch Changes

- @formwright/schema@0.7.0

## 0.6.0

### Minor Changes

- e4d7b04: Add Overlaywright to npm: `@formwright/overlay-schema` and `@formwright/overlay-core` for schema-driven modals, drawers, and sheets.

### Patch Changes

- @formwright/schema@0.6.0
