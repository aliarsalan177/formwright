---
"@wright/reactive": minor
"@formwright/core": minor
---

Extract the zero-dependency signal engine (`signal`/`computed`/`effect`/`batch`/`untrack`/`isTracking`)
into a new shared package, **`@wright/reactive`**, so it can back both Formwright and the upcoming
Gridwright data grid from a single instance.

`@formwright/core` now depends on `@wright/reactive` and re-exports it; the public
`@formwright/core/reactive` subpath is unchanged, so this is non-breaking for consumers.
