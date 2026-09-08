# @formwright/grid-schema

Serializable Gridwright column definitions, grid types, and dependency-free runtime validation.

```bash
npm install @formwright/grid-schema
```

## Quick start

```ts
import { validateSchema, type GridSchema } from "@formwright/grid-schema";

const schema: GridSchema = {
  id: "members",
  rowIdField: "id",
  columns: [
    { field: "name", headerName: "Member", flex: 2 },
    { field: "status", width: 120 },
    { field: "balance", type: "number", width: 120 },
  ],
};

const result = validateSchema(schema);
if (!result.valid) {
  console.error(result.issues);
}
```

The package exports `GridSchema`, `ColumnDef`, `Row`, sorting, filtering, aggregation, and cell-value types. Schemas are plain data, so they can be generated, stored, and validated before reaching a renderer.

For the grid engine and DOM renderer, install `@formwright/grid-core` and `@formwright/grid-dom`.

## License

MIT
