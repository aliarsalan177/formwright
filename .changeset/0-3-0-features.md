---
"@formwright/schema": minor
"@formwright/core": minor
"@formwright/dom": minor
"@formwright/ai": minor
"@formwright/reactive": minor
"@formwright/grid-schema": minor
"@formwright/grid-core": minor
"@formwright/grid-dom": minor
---

Feature release since 0.2.2.

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
