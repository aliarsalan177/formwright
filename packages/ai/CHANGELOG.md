# @formwright/ai

## 0.3.0

### Minor Changes

- c23997f: Feature release since 0.2.2.

  **Form schema & core**

  - Multi-step wizards (`steps` fields) with step navigation, validation gating, and URL sync.
  - Draft persistence with resume banner and consent mode before writing to storage.
  - Submit loading UX: skeleton overlay and disabled actions while submitting.
  - Async field options via `$query` (TanStack Query): lazy fetch on open, preload, map/transform hooks.
  - `subscribe` / `getValues` stateless read APIs.
  - `FormTitleSchema`: configurable form title tag, class, and wrappers.

  **DOM**

  - Custom wrappers on fields, actions, and title — single host or nested array (innermost first).
  - Wrapper `props` for custom-element properties (e.g. `active`) alongside `attrs`.
  - Resume/success screens, persist consent banner, and skeleton rendering.

  **Grid (`@formwright/grid-*`)**

  - Package rename to `@formwright/grid-schema`, `@formwright/grid-core`, `@formwright/grid-dom`.
  - CSV export, multi-column sort, column menu, resize, and pin support.

### Patch Changes

- Updated dependencies [c23997f]
  - @formwright/schema@0.3.0

## 0.2.2

### Patch Changes

- @formwright/schema@0.2.2

## 0.2.1

### Patch Changes

- @formwright/schema@0.2.1

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

### Patch Changes

- Updated dependencies [0b57dd5]
  - @formwright/schema@0.2.0
