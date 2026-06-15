import type { AggFunc, ColumnDef, ColumnType } from "@formwright/grid-schema";

/** A column with every default resolved — what the renderer consumes. */
export interface ResolvedColumn {
  readonly field: string;
  readonly header: string;
  readonly type: ColumnType;
  readonly width: number;
  readonly minWidth: number;
  readonly flex: number | undefined;
  readonly sortable: boolean;
  readonly editable: boolean;
  readonly pinned: "left" | "right" | undefined;
  readonly align: "left" | "right" | "center";
  readonly valueFormatter: string | undefined;
  readonly cellRenderer: string | undefined;
  readonly filter: "text" | "number" | false;
  readonly aggFunc: AggFunc | undefined;
  readonly class: string | undefined;
}

const DEFAULT_WIDTH = 150;
const DEFAULT_MIN_WIDTH = 60;

function titleCase(field: string): string {
  return field
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function defaultAlign(type: ColumnType): "left" | "right" | "center" {
  if (type === "number") return "right";
  if (type === "boolean") return "center";
  return "left";
}

function defaultFilter(type: ColumnType): "text" | "number" | false {
  return type === "number" ? "number" : "text";
}

export function resolveColumn(def: ColumnDef): ResolvedColumn {
  const type = def.type ?? "text";
  return {
    field: def.field,
    header: def.header ?? titleCase(def.field),
    type,
    width: def.width ?? DEFAULT_WIDTH,
    minWidth: def.minWidth ?? DEFAULT_MIN_WIDTH,
    flex: def.flex,
    sortable: def.sortable ?? true,
    editable: def.editable ?? false,
    pinned: def.pinned,
    align: def.align ?? defaultAlign(type),
    valueFormatter: def.valueFormatter,
    cellRenderer: def.cellRenderer,
    filter: def.filter === undefined ? defaultFilter(type) : def.filter,
    aggFunc: def.aggFunc,
    class: def.class,
  };
}
