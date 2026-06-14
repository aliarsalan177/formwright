---
"@formwright/schema": minor
"@formwright/core": minor
"@formwright/dom": minor
"@formwright/ai": minor
---

A large feature release.

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
