import {
  batch,
  computed,
  effect,
  signal,
  type Dispose,
  type ReadSignal,
  type WriteSignal,
} from "@wright/reactive";
import type { GridSchema, Row, SortDirection } from "@gridwright/schema";
import { resolveColumn, type ResolvedColumn } from "./columns.js";

export type SelectionMode = "none" | "single" | "multi";

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: SortState | null;
  readonly quickFilter: string;
  readonly columnFilters: Readonly<Record<string, string>>;
}

export interface PageResponse {
  readonly rows: readonly Row[];
  readonly total: number;
}

/** A server-side data source — called whenever page/sort/filter changes. */
export type GridDatasource = (req: PageRequest) => Promise<PageResponse>;

export interface GridOptions {
  /** Compute a row's stable id (defaults to `row[schema.rowIdField ?? "id"]`). */
  readonly getRowId?: (row: Row) => string;
  /** Row selection mode (default "none"). */
  readonly selection?: SelectionMode;
  /** Enable expandable master/detail rows. */
  readonly masterDetail?: boolean;
  /** Enable pagination; pass a config to set the initial page/size. */
  readonly pagination?: boolean | { readonly pageSize?: number; readonly page?: number };
  /** Provide a server data source — switches the grid to server mode (paginated). */
  readonly datasource?: GridDatasource;
}

export interface SortState {
  readonly field: string;
  readonly dir: SortDirection;
}

export interface VisibleRange {
  readonly start: number;
  readonly end: number;
}

export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
}

const compare = (a: unknown, b: unknown, type: string): number => {
  const an = a == null || a === "";
  const bn = b == null || b === "";
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (type === "number") return Number(a) - Number(b);
  if (type === "date") return new Date(a as string).getTime() - new Date(b as string).getTime();
  if (type === "boolean") return Number(Boolean(a)) - Number(Boolean(b));
  return String(a).localeCompare(String(b));
};

const DEFAULT_PAGE_SIZE = 25;

/**
 * The Gridwright engine — a DOM-free, signal-reactive grid model.
 *
 * Each row's data lives in its own {@link WriteSignal}, so updating a single cell
 * re-runs only the bindings that read that row (surgical, no-reflow live updates).
 * Filtering and sorting are derived {@link computed}s. Pagination, selection, and
 * master/detail expansion are all reactive state you can drive imperatively or
 * read with signals. Pass a {@link GridDatasource} to switch to server mode, where
 * the engine fetches one page at a time and the server owns sort/filter/total.
 */
export class Grid {
  readonly columns: readonly ResolvedColumn[];
  readonly rowHeight: number;
  readonly headerHeight: number;
  readonly overscan: number;
  readonly selectionMode: SelectionMode;
  readonly masterDetail: boolean;
  readonly paginated: boolean;
  readonly serverMode: boolean;

  private readonly rowIdField: string;
  private readonly getRowId: (row: Row) => string;
  private readonly datasource: GridDatasource | undefined;
  private readonly store = new Map<string, WriteSignal<Row>>();
  private order: string[] = [];

  private readonly structure = signal(0);
  private readonly sort = signal<SortState | null>(null);
  private readonly quick = signal("");
  private readonly colFilters = signal<Record<string, string>>({});

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);

  private readonly page = signal(1);
  private readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly serverTotal = signal(0);
  private readonly loadingSig = signal(false);

  private readonly selected = signal<ReadonlySet<string>>(new Set());
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  private reqSeq = 0;
  private fetchDispose: Dispose | undefined;

  /** Filtered + sorted row ids across the whole client dataset (client mode). */
  readonly viewRowIds: ReadSignal<string[]>;
  /** The ids to actually display — the current page (paginated) or the full view. */
  readonly displayRowIds: ReadSignal<string[]>;
  /** The window of display-row indices to render for the current scroll position. */
  readonly visibleRange: ReadSignal<VisibleRange>;

  constructor(
    readonly schema: GridSchema,
    rows: readonly Row[] = [],
    options: GridOptions = {},
  ) {
    this.columns = schema.columns.map(resolveColumn);
    this.rowHeight = schema.rowHeight ?? 36;
    this.headerHeight = schema.headerHeight ?? 40;
    this.overscan = schema.overscan ?? 6;
    this.rowIdField = schema.rowIdField ?? "id";
    this.getRowId = options.getRowId ?? ((row) => String(row[this.rowIdField]));
    this.selectionMode = options.selection ?? "none";
    this.masterDetail = options.masterDetail ?? false;
    this.datasource = options.datasource;
    this.serverMode = options.datasource !== undefined;
    this.paginated = this.serverMode || options.pagination !== undefined;

    if (typeof options.pagination === "object") {
      if (options.pagination.pageSize) this.pageSize.set(options.pagination.pageSize);
      if (options.pagination.page) this.page.set(options.pagination.page);
    }

    this.seed(rows);

    this.viewRowIds = computed(() => {
      this.structure.get();
      if (this.serverMode) return this.order; // server already filtered/sorted
      const quick = this.quick.get().trim().toLowerCase();
      const filters = this.colFilters.get();
      const sort = this.sort.get();

      let ids = this.order.filter((id) => {
        const row = this.store.get(id)!.peek();
        if (quick && !this.matchesQuick(row, quick)) return false;
        for (const [field, term] of Object.entries(filters)) {
          if (term && !this.cellString(row, field).includes(term.toLowerCase())) return false;
        }
        return true;
      });

      if (sort) {
        const type = this.columns.find((c) => c.field === sort.field)?.type ?? "text";
        const dir = sort.dir === "asc" ? 1 : -1;
        ids = [...ids].sort(
          (x, y) =>
            compare(
              this.store.get(x)!.peek()[sort.field],
              this.store.get(y)!.peek()[sort.field],
              type,
            ) * dir,
        );
      }
      return ids;
    });

    this.displayRowIds = computed(() => {
      const all = this.viewRowIds.get();
      if (this.serverMode || !this.paginated) return all;
      const size = this.pageSize.get();
      const page = this.clampPage(this.page.get(), Math.max(1, Math.ceil(all.length / size)));
      const start = (page - 1) * size;
      return all.slice(start, start + size);
    });

    this.visibleRange = computed(() => {
      const total = this.displayRowIds.get().length;
      const h = this.rowHeight;
      const vh = this.viewportHeight.get();
      if (vh === 0) return { start: 0, end: Math.min(total, this.overscan * 4) };
      const start = Math.max(0, Math.floor(this.scrollTop.get() / h) - this.overscan);
      const visible = Math.ceil(vh / h) + this.overscan * 2;
      return { start, end: Math.min(total, start + visible) };
    });

    if (this.serverMode) this.startServerFetch();
  }

  private cellString(row: Row, field: string): string {
    return String(row[field] ?? "").toLowerCase();
  }

  private matchesQuick(row: Row, q: string): boolean {
    for (const col of this.columns) {
      if (this.cellString(row, col.field).includes(q)) return true;
    }
    return false;
  }

  private seed(rows: readonly Row[]): void {
    this.store.clear();
    this.order = [];
    for (const row of rows) {
      const id = this.getRowId(row);
      this.store.set(id, signal(row));
      this.order.push(id);
    }
  }

  private startServerFetch(): void {
    this.fetchDispose = effect(() => {
      const req: PageRequest = {
        page: this.page.get(),
        pageSize: this.pageSize.get(),
        sort: this.sort.get(),
        quickFilter: this.quick.get(),
        columnFilters: this.colFilters.get(),
      };
      const reqId = ++this.reqSeq;
      this.loadingSig.set(true);
      void this.datasource!(req)
        .then((res) => {
          if (reqId !== this.reqSeq) return; // a newer request superseded this one
          batch(() => {
            this.seed(res.rows);
            this.serverTotal.set(res.total);
            this.structure.update((n) => n + 1);
            this.loadingSig.set(false);
          });
        })
        .catch(() => {
          if (reqId === this.reqSeq) this.loadingSig.set(false);
        });
    });
  }

  // ---- data --------------------------------------------------------------

  /** Replace the entire (client) dataset. */
  setRowData(rows: readonly Row[]): void {
    batch(() => {
      this.seed(rows);
      this.structure.update((n) => n + 1);
    });
  }

  /** The reactive signal backing one row — cell renderers bind to this. */
  rowSignal(id: string): ReadSignal<Row> {
    const sig = this.store.get(id);
    if (!sig) throw new Error(`Gridwright: unknown row id "${id}"`);
    return sig;
  }

  getRow(id: string): Row | undefined {
    return this.store.get(id)?.peek();
  }

  rowIdAt(index: number): string | undefined {
    return this.displayRowIds.get()[index];
  }

  /** Number of rows in the current view (client) or across all pages (server). */
  rowCount(): number {
    return this.serverMode ? this.serverTotal.get() : this.viewRowIds.get().length;
  }

  /** Total scrollable content height for the displayed page, in px. */
  totalHeight(): number {
    return this.displayRowIds.get().length * this.rowHeight;
  }

  /** Surgical single-cell update — re-renders only the cells bound to this row. */
  updateCell(id: string, field: string, value: unknown): void {
    const sig = this.store.get(id);
    if (!sig) return;
    sig.set({ ...sig.peek(), [field]: value });
  }

  addRow(row: Row): void {
    const id = this.getRowId(row);
    batch(() => {
      this.store.set(id, signal(row));
      this.order.push(id);
      this.structure.update((n) => n + 1);
    });
  }

  removeRow(id: string): void {
    if (!this.store.has(id)) return;
    batch(() => {
      this.store.delete(id);
      this.order = this.order.filter((x) => x !== id);
      this.structure.update((n) => n + 1);
    });
  }

  /** Re-run the server fetch for the current page (no-op in client mode). */
  refresh(): void {
    if (this.serverMode)
      this.page.update((p) => p); // bump deps → effect re-runs
    else this.structure.update((n) => n + 1);
  }

  loading(): boolean {
    return this.loadingSig.get();
  }

  // ---- sort / filter -----------------------------------------------------

  sortState(): SortState | null {
    return this.sort.get();
  }

  /** Cycle a column's sort: none → asc → desc → none. */
  toggleSort(field: string): void {
    const cur = this.sort.peek();
    if (!cur || cur.field !== field) this.sort.set({ field, dir: "asc" });
    else if (cur.dir === "asc") this.sort.set({ field, dir: "desc" });
    else this.sort.set(null);
    this.resetPage();
  }

  setSort(state: SortState | null): void {
    this.sort.set(state);
    this.resetPage();
  }

  /** Global filter — matches across every column. */
  setQuickFilter(text: string): void {
    this.quick.set(text);
    this.resetPage();
  }

  quickFilter(): string {
    return this.quick.get();
  }

  setColumnFilter(field: string, term: string): void {
    this.colFilters.update((prev) => {
      const next = { ...prev };
      if (term) next[field] = term;
      else delete next[field];
      return next;
    });
    this.resetPage();
  }

  private resetPage(): void {
    if (this.paginated && this.page.peek() !== 1) this.page.set(1);
  }

  // ---- pagination --------------------------------------------------------

  pagination(): PaginationState {
    const pageSize = this.pageSize.get();
    const total = this.rowCount();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = this.clampPage(this.page.get(), totalPages);
    return { page, pageSize, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(1, page), Math.max(1, totalPages));
  }

  setPage(page: number): void {
    this.page.set(this.clampPage(page, this.pagination().totalPages));
  }

  nextPage(): void {
    this.setPage(this.page.peek() + 1);
  }

  prevPage(): void {
    this.setPage(this.page.peek() - 1);
  }

  firstPage(): void {
    this.setPage(1);
  }

  lastPage(): void {
    this.setPage(this.pagination().totalPages);
  }

  setPageSize(size: number): void {
    batch(() => {
      this.pageSize.set(Math.max(1, size));
      this.page.set(1);
    });
  }

  // ---- selection ---------------------------------------------------------

  isSelected(id: string): boolean {
    return this.selected.get().has(id);
  }

  selectedIds(): string[] {
    return [...this.selected.get()];
  }

  selectedRows(): Row[] {
    return this.selectedIds()
      .map((id) => this.getRow(id))
      .filter((r): r is Row => r !== undefined);
  }

  toggleSelect(id: string): void {
    if (this.selectionMode === "none") return;
    const next = new Set(this.selectionMode === "single" ? [] : this.selected.peek());
    if (this.selected.peek().has(id) && this.selectionMode === "multi") next.delete(id);
    else if (this.selectionMode === "single" && this.selected.peek().has(id)) {
      /* clicking the selected single row clears it */
    } else next.add(id);
    this.selected.set(next);
  }

  /** Select (or clear) every row on the current display page. */
  selectAllOnPage(select: boolean): void {
    if (this.selectionMode !== "multi") return;
    const next = new Set(this.selected.peek());
    for (const id of this.displayRowIds.get()) {
      if (select) next.add(id);
      else next.delete(id);
    }
    this.selected.set(next);
  }

  clearSelection(): void {
    if (this.selected.peek().size) this.selected.set(new Set());
  }

  selectionCount(): number {
    return this.selected.get().size;
  }

  // ---- master / detail ---------------------------------------------------

  isExpanded(id: string): boolean {
    return this.expanded.get().has(id);
  }

  toggleExpand(id: string): void {
    if (!this.masterDetail) return;
    const next = new Set(this.expanded.peek());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded.set(next);
  }

  expandedIds(): string[] {
    return [...this.expanded.get()];
  }

  // ---- viewport ----------------------------------------------------------

  setScrollTop(px: number): void {
    this.scrollTop.set(px);
  }

  setViewportHeight(px: number): void {
    this.viewportHeight.set(px);
  }

  /** Tear down the server-fetch effect (if any). */
  destroy(): void {
    this.fetchDispose?.();
  }
}
