import { effect, type Dispose } from "@wright/reactive";
import type { Grid } from "@gridwright/core";
import { px } from "./cells.js";

export const SEL_W = 44;
export const EXP_W = 40;

export interface LeadingFlags {
  readonly selection: boolean;
  readonly expand: boolean;
}

export interface HeaderParts {
  readonly header: HTMLElement;
  readonly filterRow: HTMLElement;
  readonly hasFilters: boolean;
  readonly leadingWidth: number;
}

function leadingCell(className: string, width: number): HTMLElement {
  const c = document.createElement("div");
  c.className = className;
  c.style.width = px(width);
  return c;
}

/** Build the sticky header (sort + optional select-all / expand columns) and filter row. */
export function buildHeader(
  grid: Grid,
  disposers: Dispose[],
  dataWidth: number,
  leading: LeadingFlags,
): HeaderParts {
  const leadingWidth = (leading.selection ? SEL_W : 0) + (leading.expand ? EXP_W : 0);
  const totalWidth = dataWidth + leadingWidth;

  const header = document.createElement("div");
  header.className = "gw-header";
  header.style.width = px(totalWidth);
  header.style.height = px(grid.headerHeight);

  if (leading.expand) header.appendChild(leadingCell("gw-hcell gw-lead", EXP_W));
  if (leading.selection) {
    const cell = leadingCell("gw-hcell gw-lead", SEL_W);
    if (grid.selectionMode === "multi") {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "gw-check";
      cb.addEventListener("change", () => grid.selectAllOnPage(cb.checked));
      disposers.push(
        effect(() => {
          const ids = grid.displayRowIds.get();
          cb.checked = ids.length > 0 && ids.every((id) => grid.isSelected(id));
        }),
      );
      cell.appendChild(cb);
    }
    header.appendChild(cell);
  }

  const sortIndicators = new Map<string, HTMLElement>();
  for (const col of grid.columns) {
    const hcell = document.createElement("div");
    hcell.className = "gw-hcell";
    hcell.style.width = px(col.width);
    hcell.style.textAlign = col.align;
    const label = document.createElement("span");
    label.className = "gw-hlabel";
    label.textContent = col.header;
    const ind = document.createElement("span");
    ind.className = "gw-sort";
    sortIndicators.set(col.field, ind);
    hcell.append(label, ind);
    if (col.sortable) {
      hcell.classList.add("gw-sortable");
      hcell.addEventListener("click", () => grid.toggleSort(col.field));
    }
    header.appendChild(hcell);
  }
  disposers.push(
    effect(() => {
      const s = grid.sortState();
      for (const [field, ind] of sortIndicators) {
        ind.textContent = s && s.field === field ? (s.dir === "asc" ? "▲" : "▼") : "";
      }
    }),
  );

  const filterRow = document.createElement("div");
  filterRow.className = "gw-filterrow";
  filterRow.style.width = px(totalWidth);
  filterRow.style.top = px(grid.headerHeight);
  if (leadingWidth) filterRow.appendChild(leadingCell("gw-fcell gw-lead", leadingWidth));
  let hasFilters = false;
  for (const col of grid.columns) {
    const fcell = document.createElement("div");
    fcell.className = "gw-fcell";
    fcell.style.width = px(col.width);
    if (col.filter) {
      hasFilters = true;
      const input = document.createElement("input");
      input.className = "gw-finput";
      input.type = "text";
      input.placeholder = "Filter…";
      input.addEventListener("input", () => grid.setColumnFilter(col.field, input.value));
      fcell.appendChild(input);
    }
    filterRow.appendChild(fcell);
  }

  return { header, filterRow, hasFilters, leadingWidth };
}
