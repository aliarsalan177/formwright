---
"@formwright/overlay-dom": minor
"@formwright/overlay-schema": minor
"@formwright/overlay-core": patch
---

Add `@formwright/overlay-dom`, the renderer for Overlaywright: focus trap with `inert`, iOS-safe scroll lock, pointer drag-to-dismiss with snap points, and a default stylesheet. No dependencies outside Formwright.

The overlay schema validator now rejects non-finite snap points, judges `defaultSnap` independently, and type-checks block and action fields.
