# @formwright/ui-core

## 0.13.0

### Patch Changes

- @formwright/reactive@0.13.0

## 0.12.1

### Patch Changes

- @formwright/reactive@0.12.1

## 0.12.0

### Patch Changes

- @formwright/reactive@0.12.0

## 0.11.1

### Patch Changes

- @formwright/reactive@0.11.1

## 0.11.0

### Minor Changes

- 36a5675: Add anchor positioning: `anchorTo(anchor, floating, options)` pins a floating element to the element it belongs to and keeps it there — flipping to the roomier side at the viewport edge, sliding along the anchor to stay on screen, mirroring start/end alignment in right-to-left text, and re-placing on scroll, resize and size changes, batched to one placement per frame. `computePosition` exposes the same arithmetic as a pure function. Also adds `observeResize`, which shares one ResizeObserver across every watched element.
- b19eee8: Add `createCollection`, headless keyboard movement through a list of items: arrow keys along a vertical, horizontal or two-way orientation, Home and End, type-to-find with repeated letters cycling through matches, disabled items skipped, optional wrapping, and left/right reversed for right-to-left text. It tracks the active item and reports changes; whether that means roving focus or `aria-activedescendant` is left to the component.

### Patch Changes

- @formwright/reactive@0.11.0

## 0.10.3

### Patch Changes

- @formwright/reactive@0.10.3

## 0.10.2

### Patch Changes

- @formwright/reactive@0.10.2

## 0.10.1

### Patch Changes

- Updated dependencies [afe74be]
  - @formwright/reactive@0.10.1
