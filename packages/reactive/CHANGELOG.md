# @formwright/reactive

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
