# @formwright/overlay-dom

## 0.7.0

### Minor Changes

- cac7912: Add `@formwright/overlay-dom`, the renderer for Overlaywright: focus trap with `inert`, iOS-safe scroll lock, pointer drag-to-dismiss with snap points, and a default stylesheet. No dependencies outside Formwright.

  The overlay schema validator now rejects non-finite snap points, judges `defaultSnap` independently, and type-checks block and action fields.

### Patch Changes

- Updated dependencies [cac7912]
  - @formwright/overlay-schema@0.7.0
  - @formwright/overlay-core@0.7.0
  - @formwright/reactive@0.7.0
