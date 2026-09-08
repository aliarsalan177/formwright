import type { Dispose } from "@formwright/reactive";
import type { Grid, Row } from "@formwright/grid-core";

/** Fired when the user clicks a data row, not a control inside it. */
export type RowClickHandler = (row: Row, event: MouseEvent) => void;

/**
 * Clicks on these never count as a row activation: selection, expand,
 * editors, links, and anything a cell renderer marks as interactive.
 */
const INTERACTIVE =
  "input, button, a, select, textarea, option, label, .gw-check, .gw-expand, .gw-resize, .gw-pager, [data-gw-interactive], [contenteditable='true']";

const IGNORE_ROW =
  ".gw-header, .gw-filterrow, .gw-pager, .gw-detail, .gw-grouprow, .gw-grandtotal, .gw-loading, .gw-empty";

export function bindRowClick(
  root: HTMLElement,
  grid: Grid,
  onRowClick: RowClickHandler | undefined,
): Dispose {
  if (!onRowClick) return () => {};
  const handler = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(INTERACTIVE)) return;
    if (target.closest(IGNORE_ROW)) return;
    const rowEl = target.closest<HTMLElement>(".gw-flowrow, .gw-row");
    if (!rowEl) return;
    const id = rowEl.getAttribute("data-row-id");
    if (!id) return;
    const row = grid.getRow(id);
    if (!row) return;
    onRowClick(row, event);
  };
  root.addEventListener("click", handler);
  return () => root.removeEventListener("click", handler);
}
