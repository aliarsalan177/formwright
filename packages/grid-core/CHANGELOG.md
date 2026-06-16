# @formwright/grid-core

## 0.5.0

### Minor Changes

- 51cad8a: Feature release since 0.2.2.

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
  - `widget.bind` maps field state (value, error, disabled, options, …) to custom component props.
  - `readPath`, `valueKey`, `valueMode`, `valueShape`, and `optionsMap` normalize custom event payloads.
  - `FormOptions.widgetTransforms` for named value/event normalization (`toValue`, `fromValue`, `read`, `write`).
  - Accordion `layout` supports `widget` tag overrides (`tag`, `headerTag`, `bodyTag`, `titleProp`, `openProp`).
  - Action `widget` override — render actions as custom elements or links (`widget: { tag }`) instead of `<button>`.
  - Resume/success screens, persist consent banner, and skeleton rendering.

  **Grid (`@formwright/grid-*`)**

  - Package rename to `@formwright/grid-schema`, `@formwright/grid-core`, `@formwright/grid-dom`.
  - CSV export, multi-column sort, column menu, resize, and pin support.

### Patch Changes

- Updated dependencies [51cad8a]
  - @formwright/reactive@0.5.0
  - @formwright/grid-schema@0.5.0

## 0.4.0

### Minor Changes

- 1d327c4: Feature release since 0.2.2.

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
  - `widget.bind` maps field state (value, error, disabled, …) to custom component props.
  - `FormOptions.widgetTransforms` for named value/event normalization (`toValue`, `fromValue`, `read`, `write`).
  - Action `widget` override — render actions as custom elements or links (`widget: { tag }`) instead of `<button>`.
  - Resume/success screens, persist consent banner, and skeleton rendering.

  **Grid (`@formwright/grid-*`)**

  - Package rename to `@formwright/grid-schema`, `@formwright/grid-core`, `@formwright/grid-dom`.
  - CSV export, multi-column sort, column menu, resize, and pin support.

### Patch Changes

- Updated dependencies [1d327c4]
  - @formwright/reactive@0.4.0
  - @formwright/grid-schema@0.4.0

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
  - @formwright/reactive@0.3.0
  - @formwright/grid-schema@0.3.0

## 0.2.0

### Minor Changes

- Publish Gridwright packages to npm (`@formwright/schema`, `@formwright/core`, `@formwright/dom`) and ensure `@formwright/reactive` is on the registry (required by both Formwright and Gridwright).

### Patch Changes

- Updated dependencies
  - @formwright/schema@0.2.0
  - @formwright/reactive@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [1e75258]
  - @formwright/reactive@0.2.0
