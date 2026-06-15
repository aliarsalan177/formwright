# @formwright/core

## 0.2.0

### Minor Changes

- 0b57dd5: A large feature release.

  **Core**

  - Nested `group` (object) and repeatable `collection` (array, add/remove, min/max) fields with cross-scope, lexically-resolved conditions.
  - `submit(transform)` and a non-throwing `submit()` that resolves with `{ ok, data | error, errors }`.
  - Runtime schema patching: `form.setFieldSchema(path, patch)` and `form.patch({...})` (e.g. switch a field's type live).
  - Per-rule validation message overrides; real-time field-by-field validation.
  - Presentational fields (`heading`, `separator`, `paragraph`), form `actions`, `localized` fields → `{ en, ar }` payload, and `submit(transform)`.
  - Hidden and `omit` fields are excluded from the payload.

  **DOM**

  - Widget adapter system: map a field to a custom element, a registered widget, or any framework component via `mount`, with `toValue`/`fromValue` transformers.
  - New widgets: `toggle`, `color` (picker), drag-and-drop `file` uploader with thumbnails.
  - Authoring rendering: tooltips, closable error alert, configurable action buttons (align + full-width), `labelPosition` (iPad-style row), `description`, input slots, and per-part class overrides (Tailwind-ready).
  - Localized fields render one input with an in-input language switcher and RTL/LTR.

  **AI**

  - `@formwright/ai`: generate a validated schema from a natural-language description in any language, provider-agnostic (Claude default, OpenAI, or a custom provider), with a validate→repair loop.

- 1e75258: Extract the zero-dependency signal engine (`signal`/`computed`/`effect`/`batch`/`untrack`/`isTracking`)
  into a new shared package, **`@wright/reactive`**, so it can back both Formwright and the upcoming
  Gridwright data grid from a single instance.

  `@formwright/core` now depends on `@wright/reactive` and re-exports it; the public
  `@formwright/core/reactive` subpath is unchanged, so this is non-breaking for consumers.

### Patch Changes

- Updated dependencies [0b57dd5]
- Updated dependencies [1e75258]
  - @formwright/schema@0.2.0
  - @wright/reactive@0.2.0

## 0.1.0

### Minor Changes

- 0206e64: Initial release: schema types + runtime validator, the signal-reactive core and
  `Form` class, and the surgical virtual-DOM-free renderer with core widgets.

### Patch Changes

- Updated dependencies [0206e64]
  - @formwright/schema@0.1.0
