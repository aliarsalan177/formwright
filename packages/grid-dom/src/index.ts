import type { Dispose } from "@formwright/reactive";
import type { Grid } from "@formwright/grid-core";
import { mountVirtual } from "./render.js";
import { mountFlow, type FlowOptions } from "./flow.js";
import { applyGridMountStyles } from "./styles.js";
import { GRID_DEFAULT_CSS } from "./default-grid-styles.js";

export type { DetailRenderer, FlowOptions } from "./flow.js";

/** Mount options — extends flow features with styling overrides. */
export interface GridMountOptions extends FlowOptions {
  readonly styles?: false | "default" | string;
  readonly customStyles?: boolean;
  readonly className?: string;
}

/**
 * Mount a {@link Grid} into `host`. Picks the renderer automatically: a flow
 * layout (pagination, selection, master/detail) when any of those are enabled,
 * otherwise the node-pooled virtualized renderer for large/live datasets.
 */
export function mount(grid: Grid, host: Element, options: GridMountOptions = {}): Dispose {
  applyGridMountStyles(host, GRID_DEFAULT_CSS, options);
  const needsFlow =
    grid.paginated || grid.masterDetail || grid.grouped || grid.selectionMode !== "none";
  const { styles: _s, customStyles: _c, className: _cn, ...flowOpts } = options;
  return needsFlow ? mountFlow(grid, host, flowOpts) : mountVirtual(grid, host);
}

export { mountVirtual, mountFlow };
export { downloadCsv } from "./export.js";
export {
  registerFormatter,
  registerCellRenderer,
  getFormatter,
  getCellRenderer,
  type ValueFormatter,
  type CellRenderer,
} from "./registry.js";
