import type { Dispose } from "@wright/reactive";
import type { Grid } from "@gridwright/core";
import { mountVirtual } from "./render.js";
import { mountFlow, type FlowOptions } from "./flow.js";

export type { DetailRenderer, FlowOptions } from "./flow.js";

/**
 * Mount a {@link Grid} into `host`. Picks the renderer automatically: a flow
 * layout (pagination, selection, master/detail) when any of those are enabled,
 * otherwise the node-pooled virtualized renderer for large/live datasets.
 */
export function mount(grid: Grid, host: Element, options: FlowOptions = {}): Dispose {
  const needsFlow = grid.paginated || grid.masterDetail || grid.selectionMode !== "none";
  return needsFlow ? mountFlow(grid, host, options) : mountVirtual(grid, host);
}

export { mountVirtual, mountFlow };
export {
  registerFormatter,
  registerCellRenderer,
  getFormatter,
  getCellRenderer,
  type ValueFormatter,
  type CellRenderer,
} from "./registry.js";
