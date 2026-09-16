---
"@formwright/ui": minor
---

`<fw-dropdown>` supports nested submenus with `<fw-submenu slot="submenu">` inside a `<fw-menu-item>`, to any depth: ArrowRight, Enter or Space open one (ArrowLeft in right-to-left pages), ArrowLeft or Escape close only that level, hovering opens with a short delay and a grace period for diagonal moves, and choosing an item at any depth emits `fw-select` from the dropdown and closes the whole tree.
