---
"@formwright/ui-core": minor
---

Add anchor positioning: `anchorTo(anchor, floating, options)` pins a floating element to the element it belongs to and keeps it there — flipping to the roomier side at the viewport edge, sliding along the anchor to stay on screen, mirroring start/end alignment in right-to-left text, and re-placing on scroll, resize and size changes, batched to one placement per frame. `computePosition` exposes the same arithmetic as a pure function. Also adds `observeResize`, which shares one ResizeObserver across every watched element.
