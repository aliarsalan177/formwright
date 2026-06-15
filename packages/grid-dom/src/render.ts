import { effect, signal, type Dispose, type WriteSignal } from "@formwright/reactive";
import type { Grid, ResolvedColumn } from "@formwright/grid-core";
import { beginEdit, makeCell, px, renderCellInto } from "./cells.js";
import { buildHeader } from "./header.js";

interface Slot {
  readonly el: HTMLElement;
  readonly rowId: WriteSignal<string | null>;
}

/**
 * Virtualized renderer — uniform row height, node-pooled rows. Only the visible
 * window exists in the DOM and a single cell updates surgically when its row
 * changes. Used for large/live datasets without master/detail.
 */
export function mountVirtual(grid: Grid, host: Element): Dispose {
  const disposers: Dispose[] = [];
  const totalWidth = grid.columns.reduce((w, c) => w + c.width, 0);

  const root = document.createElement("div");
  root.className = "gw-grid";
  root.setAttribute("role", "grid");
  root.setAttribute("aria-colcount", String(grid.columns.length));
  const viewport = document.createElement("div");
  viewport.className = "gw-viewport";

  const { header, filterRow, hasFilters } = buildHeader(grid, disposers, {
    selection: false,
    expand: false,
  });

  const canvas = document.createElement("div");
  canvas.className = "gw-canvas";
  canvas.style.width = px(totalWidth);

  viewport.append(header);
  if (hasFilters) viewport.append(filterRow);
  viewport.append(canvas);
  root.append(viewport);

  const empty = document.createElement("div");
  empty.className = "gw-empty";
  empty.textContent = "No rows";
  root.append(empty);
  disposers.push(
    effect(() => {
      const n = grid.displayRowIds.get().length;
      empty.style.display = n === 0 ? "flex" : "none";
      root.setAttribute("aria-rowcount", String(grid.rowCount()));
    }),
  );

  host.append(root);

  const slots: Slot[] = [];

  function createSlot(): Slot {
    const el = document.createElement("div");
    el.className = "gw-row";
    el.setAttribute("role", "row");
    el.style.height = px(grid.rowHeight);
    el.style.width = px(totalWidth);
    const rowId = signal<string | null>(null);
    for (const col of grid.columns) {
      const cell = makeCell(col);
      if (col.editable) {
        cell.addEventListener("dblclick", () => {
          const id = rowId.peek();
          if (id != null) beginEdit(grid, col, cell, id);
        });
      }
      disposers.push(
        effect(() => {
          rowId.get();
          const id = rowId.peek();
          if (id != null) grid.rowSignal(id).get(); // subscribe to row data
          if (id == null) {
            cell.textContent = "";
            return;
          }
          renderCellInto(grid, col, cell, id);
        }),
      );
      el.appendChild(cell);
    }
    canvas.appendChild(el);
    return { el, rowId };
  }

  disposers.push(
    effect(() => {
      const { start, end } = grid.visibleRange.get();
      const ids = grid.displayRowIds.get();
      canvas.style.height = px(grid.totalHeight());
      const need = end - start;
      while (slots.length < need) slots.push(createSlot());
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s]!;
        const i = start + s;
        if (s < need && i < ids.length) {
          slot.el.style.transform = `translateY(${px(i * grid.rowHeight)})`;
          slot.el.style.display = "flex";
          slot.el.classList.toggle("gw-row-odd", i % 2 === 1);
          slot.rowId.set(ids[i]!);
        } else {
          slot.el.style.display = "none";
          slot.rowId.set(null);
        }
      }
    }),
  );

  const onScroll = () => grid.setScrollTop(viewport.scrollTop);
  viewport.addEventListener("scroll", onScroll, { passive: true });
  let ro: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => grid.setViewportHeight(viewport.clientHeight));
    ro.observe(viewport);
  }
  grid.setViewportHeight(viewport.clientHeight);

  return () => {
    for (const d of disposers) d();
    viewport.removeEventListener("scroll", onScroll);
    ro?.disconnect();
    root.remove();
  };
}

export type { ResolvedColumn };
