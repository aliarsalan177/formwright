# @formwright/grid-dom

## 0.13.1

### Patch Changes

- @formwright/grid-core@0.13.1
- @formwright/grid-schema@0.13.1
- @formwright/reactive@0.13.1
- @formwright/ui-core@0.13.1

## 0.13.0

### Patch Changes

- @formwright/grid-core@0.13.0
- @formwright/grid-schema@0.13.0
- @formwright/reactive@0.13.0
- @formwright/ui-core@0.13.0

## 0.12.1

### Patch Changes

- @formwright/grid-core@0.12.1
- @formwright/grid-schema@0.12.1
- @formwright/reactive@0.12.1
- @formwright/ui-core@0.12.1

## 0.12.0

### Patch Changes

- @formwright/grid-core@0.12.0
- @formwright/grid-schema@0.12.0
- @formwright/reactive@0.12.0
- @formwright/ui-core@0.12.0

## 0.11.1

### Patch Changes

- @formwright/grid-core@0.11.1
- @formwright/grid-schema@0.11.1
- @formwright/reactive@0.11.1
- @formwright/ui-core@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [36a5675]
- Updated dependencies [b19eee8]
  - @formwright/ui-core@0.11.0
  - @formwright/grid-core@0.11.0
  - @formwright/grid-schema@0.11.0
  - @formwright/reactive@0.11.0

## 0.10.3

### Patch Changes

- Updated dependencies [818f123]
  - @formwright/grid-core@0.10.3
  - @formwright/grid-schema@0.10.3
  - @formwright/reactive@0.10.3
  - @formwright/ui-core@0.10.3

## 0.10.2

### Patch Changes

- 8c39ea7: Fix Gridwright layout:

  - `flex` columns now share the width the fixed columns leave in the viewport
    (respecting `minWidth`; a user-resized column becomes fixed). Renderers
    measure the viewport and report it through the new `grid.setViewportWidth()`.
  - Rows rendered by the flow renderer (pagination, selection, grouping,
    master/detail) are styled: `.gw-flowrow`, `.gw-grouprow`, `.gw-grandtotal`,
    `.gw-detail` and selected rows previously had no default CSS, so their cells
    stacked vertically.
  - Virtualized rows are positioned absolutely on the canvas, so short grids no
    longer place each row twice its offset down.
  - Cells keep exactly their column width (`box-sizing: border-box`, no flex
    shrink), filter inputs fit their cells, and `align` (for example right-aligned
    number columns) is applied to header and body cells.

- Updated dependencies [8c39ea7]
  - @formwright/grid-core@0.10.2
  - @formwright/grid-schema@0.10.2
  - @formwright/reactive@0.10.2
  - @formwright/ui-core@0.10.2

## 0.10.1

### Patch Changes

- afe74be: Add package-level npm documentation with installation, quick-start, API, safety, and integration guidance.
- Updated dependencies [afe74be]
  - @formwright/reactive@0.10.1
  - @formwright/grid-schema@0.10.1
  - @formwright/grid-core@0.10.1
  - @formwright/ui-core@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [56b9528]
  - @formwright/reactive@0.10.0
  - @formwright/grid-core@0.10.0
  - @formwright/grid-schema@0.10.0

## 0.9.0

### Patch Changes

- @formwright/grid-core@0.9.0
- @formwright/grid-schema@0.9.0
- @formwright/reactive@0.9.0

## 0.8.0

### Patch Changes

- @formwright/grid-core@0.8.0
- @formwright/grid-schema@0.8.0
- @formwright/reactive@0.8.0

## 0.7.0

### Patch Changes

- @formwright/grid-core@0.7.0
- @formwright/grid-schema@0.7.0
- @formwright/reactive@0.7.0

## 0.6.0

### Patch Changes

- 0c8203a: Gridwright now stamps `data-row-id` on every data row, copies column `class` onto header cells, and accepts `onRowClick` on `mount` (clicks on checkboxes, expanders, buttons, and `[data-gw-interactive]` are ignored).
  - @formwright/grid-core@0.6.0
  - @formwright/grid-schema@0.6.0
  - @formwright/reactive@0.6.0

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
  - @formwright/grid-core@0.5.0

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
  - @formwright/grid-core@0.4.0

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
  - @formwright/grid-core@0.3.0

## 0.2.0

### Minor Changes

- Publish Gridwright packages to npm (`@formwright/schema`, `@formwright/core`, `@formwright/dom`) and ensure `@formwright/reactive` is on the registry (required by both Formwright and Gridwright).

### Patch Changes

- Updated dependencies
  - @formwright/schema@0.2.0
  - @formwright/core@0.2.0
  - @formwright/reactive@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [1e75258]
  - @formwright/reactive@0.2.0
  - @formwright/core@0.1.1
