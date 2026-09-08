---
"@formwright/reactive": minor
"@formwright/overlay-schema": minor
"@formwright/overlay-core": minor
"@formwright/overlay-dom": minor
---

`@formwright/reactive` keeps its tracking graph on `globalThis`, so two copies of the module share one dependency graph instead of silently failing to track each other's signals.

Overlays gain `classNames` for the panel, head, body, footer, action and backdrop; a `footer` field pinned outside the scrolling body; a `group` so only one overlay in a group stays open; and `titleHidden`, which names a dialog with `aria-label` rather than a hidden element. Dismissal now counts any press-and-release outside the panel, and the layer keeps taking pointer events through its exit so the dismissing tap cannot reach the page underneath.
