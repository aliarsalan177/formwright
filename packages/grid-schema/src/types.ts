/**
 * Gridwright schema — a grid described as **serializable data**, the same idea as
 * Formwright's form schema. Columns, sizing, sorting, filtering, and editing are
 * all declared here; code-level transforms (formatters, renderers, editors) are
 * referenced by name and registered in the renderer.
 */

/** A single data row. The grid never mutates your objects in place. */
export type Row = Record<string, unknown>;

/** Any cell value. */
export type CellValue = unknown;

export type ColumnType = "text" | "number" | "date" | "boolean" | (string & {});

export type SortDirection = "asc" | "desc";

/** A built-in or registered filter kind for a column. */
export type FilterKind = "text" | "number" | false;

export interface ColumnDef {
  /** Key into the row object (also the column id). */
  readonly field: string;
  /** Header text (defaults to a title-cased `field`). */
  readonly header?: string;
  /** Value type — drives default alignment, sort comparator, and filter. */
  readonly type?: ColumnType;
  /** Fixed width in px (default 150). Ignored when `flex` is set. */
  readonly width?: number;
  /** Flex weight — distributes leftover horizontal space. */
  readonly flex?: number;
  /** Minimum width in px when flexing/resizing (default 60). */
  readonly minWidth?: number;
  /** Allow click-to-sort on the header (default true). */
  readonly sortable?: boolean;
  /** Allow inline editing of cells in this column (default false). */
  readonly editable?: boolean;
  /** Pin the column to a side; pinned columns don't scroll horizontally. */
  readonly pinned?: "left" | "right";
  /** Text alignment (defaults: number → right, boolean → center, else left). */
  readonly align?: "left" | "right" | "center";
  /** Name of a registered value formatter (e.g. "currency", "percent"). */
  readonly valueFormatter?: string;
  /** Name of a registered cell renderer (overrides text rendering). */
  readonly cellRenderer?: string;
  /** Filter kind, or `false` to disable. Defaults from `type`. */
  readonly filter?: FilterKind;
  /** Per-part / per-column class hooks. */
  readonly class?: string;
}

export interface GridSchema {
  readonly id: string;
  readonly columns: readonly ColumnDef[];
  /** Field whose value uniquely identifies a row (default "id"). */
  readonly rowIdField?: string;
  /** Row height in px (default 36). */
  readonly rowHeight?: number;
  /** Header height in px (default 40). */
  readonly headerHeight?: number;
  /** Extra rows rendered above/below the viewport to smooth scrolling (default 6). */
  readonly overscan?: number;
}
