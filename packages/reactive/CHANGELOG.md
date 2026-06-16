# @formwright/reactive

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

## 0.2.1

### Patch Changes

- Publish Gridwright packages to npm (`@formwright/grid-schema`, `@formwright/grid-core`, `@formwright/grid-dom`) and ensure `@formwright/reactive` is on the registry (required by both Formwright and Gridwright).

## 0.2.0

### Minor Changes

- 1e75258: Extract the zero-dependency signal engine (`signal`/`computed`/`effect`/`batch`/`untrack`/`isTracking`)
  into a new shared package, **`@formwright/reactive`**, so it can back both Formwright and the upcoming
  Gridwright data grid from a single instance.

  `@formwright/core` now depends on `@formwright/reactive` and re-exports it; the public
  `@formwright/core/reactive` subpath is unchanged, so this is non-breaking for consumers.
