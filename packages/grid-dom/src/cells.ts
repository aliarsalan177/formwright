import type { Grid, ResolvedColumn } from "@gridwright/core";
import { getCellRenderer, getFormatter } from "./registry.js";

/** The cell currently being edited — its binding is paused so updates don't clobber the input. */
let editingCell: HTMLElement | null = null;

export function px(n: number): string {
  return `${n}px`;
}

function cellText(col: ResolvedColumn, value: unknown, row: Record<string, unknown>): string {
  if (col.valueFormatter) {
    const f = getFormatter(col.valueFormatter);
    if (f) return f(value, row);
  }
  return value == null ? "" : String(value);
}

/** Build a data cell element (no binding) for a column. */
export function makeCell(col: ResolvedColumn): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "gw-cell";
  cell.setAttribute("role", "gridcell");
  cell.style.width = px(col.width);
  cell.style.textAlign = col.align;
  if (col.class) cell.classList.add(col.class);
  if (col.editable) cell.classList.add("gw-cell-editable");
  return cell;
}

/** Render a cell's content for a given row id (skips the cell being edited). */
export function renderCellInto(
  grid: Grid,
  col: ResolvedColumn,
  cell: HTMLElement,
  id: string,
): void {
  if (cell === editingCell) return;
  const row = grid.getRow(id);
  if (!row) {
    cell.textContent = "";
    return;
  }
  const value = row[col.field];
  if (col.cellRenderer) {
    const r = getCellRenderer(col.cellRenderer);
    if (r) {
      const out = r(value, row);
      if (typeof out === "string") cell.textContent = out;
      else cell.replaceChildren(out);
      return;
    }
  }
  cell.textContent = cellText(col, value, row);
}

/** Start inline editing of a cell. Commits to the grid on Enter/blur, cancels on Escape. */
export function beginEdit(grid: Grid, col: ResolvedColumn, cell: HTMLElement, id: string): void {
  const row = grid.getRow(id);
  if (!row) return;
  editingCell = cell;
  cell.classList.add("gw-editing");
  const input = document.createElement("input");
  input.className = "gw-editor";
  input.type = col.type === "number" ? "number" : "text";
  const raw = row[col.field];
  input.value = raw == null ? "" : String(raw);
  cell.replaceChildren(input);
  input.focus();
  input.select();

  const finish = (commit: boolean) => {
    if (editingCell !== cell) return;
    editingCell = null;
    cell.classList.remove("gw-editing");
    if (commit) {
      const v =
        col.type === "number" ? (input.value === "" ? null : Number(input.value)) : input.value;
      grid.updateCell(id, col.field, v); // re-runs the cell binding → fresh text
    } else {
      renderCellInto(grid, col, cell, id);
    }
  };
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });
}
