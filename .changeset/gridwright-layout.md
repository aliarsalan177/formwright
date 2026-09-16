---
"@formwright/grid-core": patch
"@formwright/grid-dom": patch
---

Fix Gridwright layout:

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
