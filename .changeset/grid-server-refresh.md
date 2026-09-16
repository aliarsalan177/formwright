---
"@formwright/grid-core": patch
---

`grid.refresh()` now refetches the current page in server (datasource) mode.
It previously re-set the page signal to the same value, which signals ignore,
so filters or search terms the grid does not own could never trigger a reload.
