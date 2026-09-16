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

/**
 * Share the width the fixed columns leave over between the `flex` columns.
 *
 * A column the user has resized is fixed from then on, even if the schema gave
 * it a `flex`. A share smaller than a column's `minWidth` is clamped, and the
 * clamped column drops out so the rest is shared again among the others. Shares
 * are whole pixels; the rounding remainder goes to the last flex column so the
 * row fills the viewport exactly instead of leaving a sub-pixel gap or a
 * horizontal scrollbar.
 *
 * Returns only the flex columns. Before the viewport is measured (`available`
 * is 0) it returns nothing, and callers fall back to each column's `width`.
 */
export function layoutFlexColumns(
  columns: readonly ResolvedColumn[],
  overrides: Readonly<Record<string, number>>,
  available: number,
): Record<string, number> {
  const isFlex = (c: ResolvedColumn) =>
    c.flex !== undefined && c.flex > 0 && overrides[c.field] === undefined;
  let pending = columns.filter(isFlex);
  if (available <= 0 || pending.length === 0) return {};

  const fixed = columns.reduce((w, c) => (isFlex(c) ? w : w + (overrides[c.field] ?? c.width)), 0);
  let pool = Math.max(0, available - fixed);
  const widths: Record<string, number> = {};

  for (let clamped = true; clamped && pending.length > 0; ) {
    clamped = false;
    const totalFlex = pending.reduce((sum, c) => sum + (c.flex ?? 0), 0);
    for (const c of pending) {
      if ((pool * (c.flex ?? 0)) / totalFlex < c.minWidth) {
        widths[c.field] = c.minWidth;
        pool = Math.max(0, pool - c.minWidth);
        pending = pending.filter((p) => p !== c);
        clamped = true;
        break;
      }
    }
  }

  const totalFlex = pending.reduce((sum, c) => sum + (c.flex ?? 0), 0);
  let assigned = 0;
  pending.forEach((c, i) => {
    const width =
      i === pending.length - 1 ? pool - assigned : Math.floor((pool * (c.flex ?? 0)) / totalFlex);
    widths[c.field] = width;
    assigned += width;
  });
  return widths;
}
