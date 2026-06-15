import { effect, type Dispose } from "@formwright/reactive";
import type { Grid } from "@formwright/grid-core";
import { beginEdit, bindCellWidthPin, makeCell, px, renderCellInto } from "./cells.js";
import { buildHeader, EXP_W, SEL_W } from "./header.js";

/** Mount a detail panel for an expanded row; return a disposer to tear it down. */
export type DetailRenderer = (
  row: Record<string, unknown>,
  host: HTMLElement,
  id: string,
) => Dispose | void;

export interface FlowOptions {
  readonly detail?: DetailRenderer;
}

/**
 * Flow renderer — rows in normal document flow (variable height), so it supports
 * master/detail expansion, selection, and pagination. Cells still bind per-row,
 * so live updates remain surgical. Used when pagination, selection, or
 * master/detail is enabled.
 */
export function mountFlow(grid: Grid, host: Element, options: FlowOptions = {}): Dispose {
  const disposers: Dispose[] = [];
  const rowDisposers: Dispose[] = [];
  const detailDisposers = new Map<string, Dispose>();
  const hasSelection = grid.selectionMode !== "none";

  const root = document.createElement("div");
  root.className = "gw-grid gw-grid-flow";
  root.setAttribute("role", "grid");
  root.setAttribute("aria-colcount", String(grid.columns.length));
  const viewport = document.createElement("div");
  viewport.className = "gw-viewport";

  const { header, filterRow, hasFilters, leadingWidth } = buildHeader(grid, disposers, {
    selection: hasSelection,
    expand: grid.masterDetail,
  });
  const totalWidth = () => leadingWidth + grid.totalColumnsWidth();

  const body = document.createElement("div");
  body.className = "gw-body";
  disposers.push(
    effect(() => {
      body.style.width = px(totalWidth());
    }),
  );

  viewport.append(header);
  if (hasFilters) viewport.append(filterRow);
  viewport.append(body);
  root.append(viewport);

  // Loading overlay (server mode).
  const overlay = document.createElement("div");
  overlay.className = "gw-loading";
  overlay.textContent = "Loading…";
  root.append(overlay);
  disposers.push(
    effect(() => {
      overlay.style.display = grid.loading() ? "flex" : "none";
    }),
  );

  // No-rows overlay.
  const empty = document.createElement("div");
  empty.className = "gw-empty";
  empty.textContent = "No rows";
  root.append(empty);
  disposers.push(
    effect(() => {
      const n = grid.displayRowIds.get().length;
      empty.style.display = n === 0 && !grid.loading() ? "flex" : "none";
      root.setAttribute("aria-rowcount", String(grid.rowCount()));
    }),
  );

  // Pagination footer.
  if (grid.paginated) root.append(buildPager(grid, disposers));

  host.append(root);

  function disposeRows(): void {
    for (const d of rowDisposers) d();
    rowDisposers.length = 0;
    for (const d of detailDisposers.values()) d();
    detailDisposers.clear();
    body.replaceChildren();
  }

  function buildRow(id: string, index: number): void {
    const row = document.createElement("div");
    row.className = "gw-flowrow";
    row.setAttribute("role", "row");
    row.setAttribute("aria-rowindex", String(index + 1));
    if (index % 2 === 1) row.classList.add("gw-row-odd");
    row.style.minHeight = px(grid.rowHeight);
    rowDisposers.push(
      effect(() => {
        row.style.width = px(totalWidth());
      }),
    );

    if (grid.masterDetail) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "gw-expand";
      toggle.style.width = px(EXP_W);
      toggle.addEventListener("click", () => grid.toggleExpand(id));
      rowDisposers.push(
        effect(() => {
          const open = grid.isExpanded(id);
          toggle.textContent = open ? "▾" : "▸";
          toggle.setAttribute("aria-expanded", String(open));
        }),
      );
      row.appendChild(toggle);
    }

    if (hasSelection) {
      const selCell = document.createElement("div");
      selCell.className = "gw-cell gw-lead";
      selCell.style.width = px(SEL_W);
      const cb = document.createElement("input");
      cb.type = grid.selectionMode === "single" ? "radio" : "checkbox";
      cb.className = "gw-check";
      cb.addEventListener("change", () => grid.toggleSelect(id));
      rowDisposers.push(
        effect(() => {
          const sel = grid.isSelected(id);
          cb.checked = sel;
          row.classList.toggle("gw-selected", sel);
          row.setAttribute("aria-selected", String(sel));
        }),
      );
      selCell.appendChild(cb);
      row.appendChild(selCell);
    }

    for (const col of grid.orderedColumns.peek()) {
      const cell = makeCell(col);
      rowDisposers.push(bindCellWidthPin(grid, col, cell, leadingWidth));
      if (col.editable) {
        cell.addEventListener("dblclick", () => beginEdit(grid, col, cell, id));
      }
      rowDisposers.push(
        effect(() => {
          grid.rowSignal(id).get(); // subscribe to this row's data
          renderCellInto(grid, col, cell, id);
        }),
      );
      row.appendChild(cell);
    }
    body.appendChild(row);

    // Detail panel (mounted lazily while expanded).
    if (grid.masterDetail && options.detail) {
      rowDisposers.push(
        effect(() => {
          const open = grid.isExpanded(id);
          const existing = detailDisposers.get(id);
          if (open && !existing) {
            const panel = document.createElement("div");
            panel.className = "gw-detail";
            panel.style.width = px(totalWidth());
            body.insertBefore(panel, row.nextSibling);
            const data = grid.getRow(id);
            const dispose = data ? options.detail!(data, panel, id) : undefined;
            detailDisposers.set(id, () => {
              if (typeof dispose === "function") dispose();
              panel.remove();
            });
          } else if (!open && existing) {
            existing();
            detailDisposers.delete(id);
          }
        }),
      );
    }
  }

  // Re-render the row list when the displayed page / data / column set changes.
  disposers.push(
    effect(() => {
      const ids = grid.displayRowIds.get();
      grid.orderedColumns.get(); // rebuild rows when columns reorder / hide / pin
      disposeRows();
      ids.forEach((id, i) => buildRow(id, i));
    }),
  );

  return () => {
    disposeRows();
    for (const d of disposers) d();
    root.remove();
  };
}

function buildPager(grid: Grid, disposers: Dispose[]): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "gw-pager";

  const info = document.createElement("span");
  info.className = "gw-pager-info";

  const mk = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gw-pager-btn";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  };
  const first = mk("«", () => grid.firstPage());
  const prev = mk("‹ Prev", () => grid.prevPage());
  const next = mk("Next ›", () => grid.nextPage());
  const last = mk("»", () => grid.lastPage());

  disposers.push(
    effect(() => {
      const p = grid.pagination();
      info.textContent = `Page ${p.page} of ${p.totalPages} · ${p.total.toLocaleString()} rows`;
      first.disabled = prev.disabled = !p.hasPrev;
      next.disabled = last.disabled = !p.hasNext;
    }),
  );

  bar.append(first, prev, info, next, last);
  return bar;
}
