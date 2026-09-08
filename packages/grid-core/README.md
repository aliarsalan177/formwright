# @formwright/grid-core

Signal-reactive Gridwright engine for rows, columns, sorting, filtering, selection, pagination, grouping, and viewport state.

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
      { field: "name", flex: 2 },
      { field: "status", width: 120 },
    ],
  },
  [
    { id: "1", name: "Ada", status: "Active" },
    { id: "2", name: "Grace", status: "Paused" },
  ],
  { selection: "multi", pagination: { pageSize: 25 } },
);

const dispose = mount(grid, document.getElementById("app")!);
```

`Grid` owns state and data operations; it does not require a UI framework. Use `@formwright/grid-dom` for the default virtual-DOM-free renderer or bind the reactive state to your own renderer.

The package also exports CSV helpers, resolved-column utilities, schema types, validation, and the shared signal primitives.

## License

MIT
