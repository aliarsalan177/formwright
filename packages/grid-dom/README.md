# @formwright/grid-dom

Virtual-DOM-free Gridwright renderer with virtualization, sticky headers, selection, pagination, grouping, detail rows, inline editing, and row activation.

```bash
npm install @formwright/grid-core @formwright/grid-dom
```

## Quick start

```ts
import { Grid } from "@formwright/grid-core";
import { mount } from "@formwright/grid-dom";

const grid = new Grid(
  {
    id: "members",
    rowIdField: "id",
    columns: [
      { field: "name", headerName: "Member", flex: 2 },
      { field: "balance", type: "number", width: 120 },
    ],
  },
  rows,
);

const dispose = mount(grid, document.getElementById("app")!, {
  onRowClick: (row) => openMember(row),
});
```

`mount` automatically chooses the flow renderer for pagination, selection, grouping, and master/detail, or the pooled virtualized renderer for large flat datasets.

Clicks on inputs, buttons, links, expanders, and elements marked with `[data-gw-interactive]` do not trigger `onRowClick`.

Use `registerFormatter` and `registerCellRenderer` for custom cells, and `downloadCsv` for export. Call the returned disposer when unmounting.

## License

MIT
