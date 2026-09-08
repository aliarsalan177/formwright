import { effect, signal, type Dispose, type WriteSignal } from "@formwright/reactive";
import type { Grid, ResolvedColumn } from "@formwright/grid-core";
import { beginEdit, bindCellWidthPin, makeCell, px, renderCellInto } from "./cells.js";
import { buildHeader } from "./header.js";
import { bindRowClick, type RowClickHandler } from "./row-click.js";
import { Scope } from "@formwright/ui-core";

interface Slot {
  readonly el: HTMLElement;
  readonly rowId: WriteSignal<string | null>;
  readonly scope: Scope;
}

/**
 * Virtualized renderer — uniform row height, node-pooled rows. Only the visible
 * window exists in the DOM and a single cell updates surgically when its row
 * changes. Columns (width / order / pin) are reactive.
 */
export function mountVirtual(
  grid: Grid,
  host: Element,
  options: { readonly onRowClick?: RowClickHandler } = {},
): Dispose {
  const scope = new Scope();

  const root = document.createElement("div");
  root.className = "gw-grid";
  root.setAttribute("role", "grid");
  root.setAttribute("aria-colcount", String(grid.columns.length));
  const viewport = document.createElement("div");
  viewport.className = "gw-viewport";

  const { header, filterRow, hasFilters } = buildHeader(grid, scope, {
    selection: false,
    expand: false,
  });

  const canvas = document.createElement("div");
  canvas.className = "gw-canvas";
  scope.add(
    effect(() => {
      canvas.style.width = px(grid.totalColumnsWidth());
    }),
  );

  viewport.append(header);
  if (hasFilters) viewport.append(filterRow);
  viewport.append(canvas);
  root.append(viewport);

  const empty = document.createElement("div");
  empty.className = "gw-empty";
  empty.textContent = "No rows";
  root.append(empty);
  scope.add(
    effect(() => {
      empty.style.display = grid.displayRowIds.get().length === 0 ? "flex" : "none";
      root.setAttribute("aria-rowcount", String(grid.rowCount()));
    }),
  );

  host.append(root);

  let slots: Slot[] = [];
  let colSig = "";

  function disposeSlots(): void {
    for (const slot of slots) slot.scope.dispose();
    slots = [];
    canvas.replaceChildren();
  }

  function createSlot(): Slot {
    const el = document.createElement("div");
    el.className = "gw-row";
    el.setAttribute("role", "row");
    el.style.height = px(grid.rowHeight);
    const rowId = signal<string | null>(null);
    const slot: Slot = { el, rowId, scope: new Scope() };
    slot.scope.add(
      effect(() => {
        el.style.width = px(grid.totalColumnsWidth());
      }),
    );
    for (const col of grid.orderedColumns.peek()) {
      const cell = makeCell(col);
      slot.scope.add(bindCellWidthPin(grid, col, cell, 0));
      if (col.editable) {
        cell.addEventListener("dblclick", () => {
          const id = rowId.peek();
          if (id != null) beginEdit(grid, col, cell, id);
        });
      }
      slot.scope.add(
        effect(() => {
          rowId.get();
          const id = rowId.peek();
          if (id != null) grid.rowSignal(id).get();
          if (id == null) cell.textContent = "";
          else renderCellInto(grid, col, cell, id);
        }),
      );
      el.appendChild(cell);
    }
    canvas.appendChild(el);
    return slot;
  }

  scope.add(
    effect(() => {
      const cols = grid.orderedColumns.get();
      const sig = cols.map((c) => c.field).join("|");
      if (sig !== colSig) {
        colSig = sig;
        disposeSlots(); // column set changed → rebuild the pool
      }
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
          slot.el.setAttribute("data-row-id", ids[i]!);
          slot.rowId.set(ids[i]!);
        } else {
          slot.el.style.display = "none";
          slot.el.removeAttribute("data-row-id");
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
  scope.add(bindRowClick(root, grid, options.onRowClick));

  return () => {
    disposeSlots();
    scope.dispose();
    viewport.removeEventListener("scroll", onScroll);
    ro?.disconnect();
    root.remove();
  };
}

export type { ResolvedColumn };
