import { effect, type Dispose } from "@formwright/reactive";
import type { Grid, ResolvedColumn } from "@formwright/grid-core";
import { applyPin, px } from "./cells.js";

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

/**
 * Build the sticky header (sort + optional select-all / expand columns) and filter
 * row. Header cells rebuild reactively when columns change (reorder / hide / pin),
 * support drag-to-reorder, drag-to-resize, and pinned-sticky positioning.
 */
export function buildHeader(grid: Grid, disposers: Dispose[], leading: LeadingFlags): HeaderParts {
  const leadingWidth = (leading.selection ? SEL_W : 0) + (leading.expand ? EXP_W : 0);

  const header = document.createElement("div");
  header.className = "gw-header";
  header.setAttribute("role", "row");
  header.style.height = px(grid.headerHeight);

  const filterRow = document.createElement("div");
  filterRow.className = "gw-filterrow";
  filterRow.style.top = px(grid.headerHeight);
  const hasFilters = grid.columns.some((c) => c.filter);

  // Reactive total width.
  disposers.push(
    effect(() => {
      const w = px(leadingWidth + grid.totalColumnsWidth());
      header.style.width = w;
      filterRow.style.width = w;
    }),
  );

  // Rebuild header + filter children when the column set/order changes.
  let childDisposers: Dispose[] = [];
  function leadCells(into: HTMLElement, cls: string): void {
    if (leading.expand) into.appendChild(leadingCell(`${cls} gw-lead`, EXP_W));
    if (leading.selection) {
      if (cls === "gw-hcell" && grid.selectionMode === "multi") {
        const cell = leadingCell("gw-hcell gw-lead", SEL_W);
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "gw-check";
        cb.addEventListener("change", () => grid.selectAllOnPage(cb.checked));
        childDisposers.push(
          effect(() => {
            const ids = grid.displayRowIds.get();
            cb.checked = ids.length > 0 && ids.every((id) => grid.isSelected(id));
          }),
        );
        cell.appendChild(cb);
        into.appendChild(cell);
      } else {
        into.appendChild(leadingCell(`${cls} gw-lead`, SEL_W));
      }
    }
  }

  disposers.push(
    effect(() => {
      const cols = grid.orderedColumns.get();
      for (const d of childDisposers) d();
      childDisposers = [];
      header.replaceChildren();
      filterRow.replaceChildren();

      leadCells(header, "gw-hcell");
      leadCells(filterRow, "gw-fcell");

      for (const col of cols) buildHeaderCell(col);
      for (const col of cols) buildFilterCell(col);
    }),
  );

  function buildHeaderCell(col: ResolvedColumn): void {
    const hcell = document.createElement("div");
    hcell.className = "gw-hcell";
    hcell.setAttribute("role", "columnheader");
    hcell.style.textAlign = col.align;
    childDisposers.push(
      effect(() => {
        hcell.style.width = px(grid.columnWidth(col.field));
      }),
    );
    childDisposers.push(
      effect(() => {
        grid.columnPin(col.field);
        grid.totalColumnsWidth(); // re-pin when widths/pins change
        applyPin(grid, hcell, col.field, leadingWidth);
      }),
    );

    const label = document.createElement("span");
    label.className = "gw-hlabel";
    label.textContent = col.header;
    const ind = document.createElement("span");
    ind.className = "gw-sort";
    hcell.append(label, ind);

    if (col.sortable) {
      hcell.classList.add("gw-sortable");
      hcell.addEventListener("click", (ev) => grid.toggleSort(col.field, ev.shiftKey));
    }
    childDisposers.push(
      effect(() => {
        const model = grid.sortModel();
        const i = model.findIndex((s) => s.field === col.field);
        if (i === -1) {
          ind.textContent = "";
          hcell.setAttribute("aria-sort", "none");
        } else {
          const dir = model[i]!.dir;
          ind.textContent = (dir === "asc" ? "▲" : "▼") + (model.length > 1 ? String(i + 1) : "");
          hcell.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
        }
      }),
    );

    // Drag-to-reorder.
    hcell.draggable = true;
    hcell.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("application/x-gw-col", col.field);
    });
    hcell.addEventListener("dragover", (e) => e.preventDefault());
    hcell.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = e.dataTransfer?.getData("application/x-gw-col");
      if (from && from !== col.field) grid.moveColumn(from, grid.columnOrder().indexOf(col.field));
    });

    // Drag-to-resize handle.
    const handle = document.createElement("div");
    handle.className = "gw-resize";
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = grid.columnWidth(col.field);
      handle.setPointerCapture(e.pointerId);
      const onMove = (m: PointerEvent) =>
        grid.setColumnWidth(col.field, startW + (m.clientX - startX));
      const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
    hcell.appendChild(handle);

    header.appendChild(hcell);
  }

  function buildFilterCell(col: ResolvedColumn): void {
    const fcell = document.createElement("div");
    fcell.className = "gw-fcell";
    childDisposers.push(
      effect(() => {
        fcell.style.width = px(grid.columnWidth(col.field));
      }),
    );
    childDisposers.push(
      effect(() => {
        grid.columnPin(col.field);
        grid.totalColumnsWidth();
        applyPin(grid, fcell, col.field, leadingWidth);
      }),
    );
    if (col.filter) {
      const input = document.createElement("input");
      input.className = "gw-finput";
      input.type = "text";
      input.placeholder = "Filter…";
      input.value = "";
      input.addEventListener("input", () => grid.setColumnFilter(col.field, input.value));
      fcell.appendChild(input);
    }
    filterRow.appendChild(fcell);
  }

  disposers.push(() => {
    for (const d of childDisposers) d();
  });

  return { header, filterRow, hasFilters, leadingWidth };
}
