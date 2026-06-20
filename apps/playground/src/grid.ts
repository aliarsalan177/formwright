/**
 * Gridwright demos — one schema-driven engine, four scenarios:
 *   1. Live      — 50k rows, virtualized, surgical real-time cell updates.
 *   2. Server    — server-side pagination via a datasource (page + total).
 *   3. Master    — expandable master/detail (detail is another paginated grid),
 *                  multi-selection + bulk actions, row actions, editable + live.
 *   4. Own data  — pass your own array + drive pagination imperatively.
 */
import {
  Grid,
  effect,
  type Dispose,
  type GridDatasource,
  type GridSchema,
  type Row,
} from "@formwright/grid-core";
import { downloadCsv, mount, registerCellRenderer, registerFormatter } from "@formwright/grid-dom";
import "./grid.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const rand = (n: number) => Math.floor(Math.random() * n);
const delay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), ms));

// ---- Shared formatters / renderers -----------------------------------------

registerFormatter("time", (v) => {
  const d = new Date(Number(v));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString();
});
registerCellRenderer("change", (value) => {
  const n = Number(value);
  const span = document.createElement("span");
  span.className = "gw-change " + (n > 0 ? "is-up" : n < 0 ? "is-down" : "");
  span.textContent = `${n > 0 ? "▲" : n < 0 ? "▼" : ""} ${Math.abs(n).toFixed(2)}%`;
  return span;
});
registerCellRenderer("badge", (value) => {
  const s = String(value);
  const span = document.createElement("span");
  span.className = "gw-badge badge-" + s.toLowerCase();
  span.textContent = s;
  return span;
});

// ---- Sample data ------------------------------------------------------------

const SYMBOLS = [
  ["AAPL", "Apple Inc."],
  ["MSFT", "Microsoft Corp."],
  ["GOOGL", "Alphabet Inc."],
  ["AMZN", "Amazon.com Inc."],
  ["NVDA", "NVIDIA Corp."],
  ["META", "Meta Platforms"],
  ["TSLA", "Tesla Inc."],
  ["JPM", "JPMorgan Chase"],
  ["V", "Visa Inc."],
  ["XOM", "Exxon Mobil"],
];
const OWNERS = ["Ava Chen", "Liam Patel", "Noah Kim", "Mia Rossi", "Omar Haddad", "Sara Vogel"];
const STATUSES = ["Open", "Filled", "Pending", "Cancelled"];

function makeTrades(count: number): Row[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const [symbol, name] = SYMBOLS[i % SYMBOLS.length]!;
    return {
      id: String(i),
      symbol: i % SYMBOLS.length === 0 ? symbol : `${symbol}.${i % 90}`,
      name,
      price: Math.round((20 + Math.random() * 480) * 100) / 100,
      change: Math.round((Math.random() * 8 - 4) * 100) / 100,
      qty: 1 + rand(5000),
      owner: OWNERS[rand(OWNERS.length)]!,
      status: STATUSES[rand(STATUSES.length)]!,
      updatedAt: now - rand(86_400_000),
    };
  });
}

const TRADE_COLUMNS = [
  { field: "symbol", header: "Symbol", width: 110 },
  { field: "name", header: "Company", width: 220 },
  {
    field: "price",
    header: "Price",
    type: "number",
    width: 110,
    valueFormatter: "currency",
    editable: true,
  },
  { field: "change", header: "Change", type: "number", width: 110, cellRenderer: "change" },
  { field: "qty", header: "Qty", type: "number", width: 90, editable: true },
  { field: "owner", header: "Owner", width: 140, editable: true },
  { field: "status", header: "Status", width: 120, cellRenderer: "badge" },
] as const;

// ---- Chrome (quick filter + count + footer) shared across examples ----------

interface Mounted {
  readonly grid: Grid;
  readonly dispose: Dispose;
}

let active: Mounted | null = null;
let countDispose: Dispose | null = null;

const quickInput = $<HTMLInputElement>("grid-quick");
quickInput.addEventListener("input", () => active?.grid.setQuickFilter(quickInput.value));

const exportBtn = $<HTMLButtonElement>("grid-export");
exportBtn.addEventListener("click", () => {
  if (active) downloadCsv(active.grid, "gridwright-export.csv");
});

// Columns menu — visibility + pin for the active grid.
function buildColsPanel(): void {
  const panel = $("grid-cols-panel");
  panel.replaceChildren();
  const g = active?.grid;
  if (!g) return;
  for (const col of g.columns) {
    const row = document.createElement("label");
    row.className = "grid-col-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !g.isColumnHidden(col.field);
    cb.addEventListener("change", () => g.setColumnHidden(col.field, !cb.checked));
    const name = document.createElement("span");
    name.className = "grid-col-name";
    name.textContent = col.header;
    const pin = document.createElement("select");
    pin.className = "grid-select";
    for (const [label, val] of [
      ["—", "none"],
      ["⇤", "left"],
      ["⇥", "right"],
    ] as const) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = label;
      if (g.columnPin(col.field) === val) o.selected = true;
      pin.append(o);
    }
    pin.addEventListener("change", () =>
      g.setColumnPin(col.field, pin.value as "none" | "left" | "right"),
    );
    row.append(cb, name, pin);
    panel.append(row);
  }
}
$<HTMLButtonElement>("grid-cols-btn").addEventListener("click", () => {
  const p = $("grid-cols-panel");
  const willShow = p.hidden;
  if (willShow) buildColsPanel();
  p.hidden = !willShow;
});
document.addEventListener("click", (e) => {
  if (!$("grid-colmenu").contains(e.target as Node)) $("grid-cols-panel").hidden = true;
});

function attachCount(grid: Grid): void {
  countDispose?.();
  const el = $("grid-count");
  countDispose = effect(() => {
    el.textContent = `${grid.rowCount().toLocaleString()} rows`;
  });
}

// ---- Example 1: live virtualized -------------------------------------------

function exampleLive(host: HTMLElement): Mounted {
  const schema: GridSchema = {
    id: "trades",
    rowHeight: 38,
    headerHeight: 42,
    columns: [
      ...TRADE_COLUMNS,
      { field: "updatedAt", header: "Updated", type: "number", width: 110, valueFormatter: "time" },
    ],
  };
  const ROWS = 50_000;
  const grid = new Grid(schema, makeTrades(ROWS));
  const dispose = mount(grid, host, { customStyles: true });

  // Live ticker with a start/stop button + rate readout in the actions slot.
  const actions = $("grid-actions");
  const btn = document.createElement("button");
  btn.className = "grid-btn";
  btn.textContent = "▶ Start live updates";
  const rate = document.createElement("span");
  rate.className = "grid-rate";
  actions.append(btn, rate);

  let timer: number | undefined;
  let perSec = 0;
  const tick = () => {
    const now = Date.now();
    for (let k = 0; k < 250; k++) {
      const id = String(rand(ROWS));
      const row = grid.getRow(id);
      if (!row) continue;
      const drift = Math.random() * 6 - 3;
      grid.updateCell(
        id,
        "price",
        Math.max(1, Math.round((Number(row.price) + drift) * 100) / 100),
      );
      grid.updateCell(id, "change", Math.round(drift * 100) / 100);
      grid.updateCell(id, "updatedAt", now);
      perSec += 3;
    }
  };
  const rateTimer = window.setInterval(() => {
    rate.textContent = timer ? `~${perSec.toLocaleString()} cell updates/sec` : "";
    perSec = 0;
  }, 1000);
  btn.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
      btn.textContent = "▶ Start live updates";
      btn.classList.remove("is-live");
      rate.textContent = "";
    } else {
      timer = window.setInterval(tick, 100);
      btn.textContent = "⏸ Stop live updates";
      btn.classList.add("is-live");
    }
  });

  setFoot(
    "50,000 rows, virtualized — only the visible window is in the DOM. Double-click Price / Qty / Owner to edit.",
  );
  return {
    grid,
    dispose: () => {
      clearInterval(rateTimer);
      if (timer) clearInterval(timer);
      dispose();
    },
  };
}

// ---- Example 2: server-side pagination -------------------------------------

function exampleServer(host: HTMLElement): Mounted {
  const all = makeTrades(2_000);
  const datasource: GridDatasource = async (req) => {
    let rows = all;
    const q = req.quickFilter.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (req.sort.length) {
      rows = [...rows].sort((a, b) => {
        for (const { field, dir } of req.sort) {
          const x = a[field];
          const y = b[field];
          const c =
            typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x).localeCompare(String(y));
          if (c !== 0) return dir === "asc" ? c : -c;
        }
        return 0;
      });
    }
    const start = (req.page - 1) * req.pageSize;
    return delay({ rows: rows.slice(start, start + req.pageSize), total: rows.length });
  };

  const schema: GridSchema = { id: "server", columns: [...TRADE_COLUMNS] };
  const grid = new Grid(schema, [], { datasource, pagination: { pageSize: 20 } });
  const dispose = mount(grid, host, { customStyles: true });
  setFoot(
    "Server mode — the grid fetches one page at a time from a (simulated) API that owns sort, filter, and the total count. Sort, search, and page all round-trip.",
  );
  return { grid, dispose: () => (dispose(), grid.destroy()) };
}

// ---- Example 3: master / detail + selection + bulk + editable + live -------

function makeOrders(customer: string): Row[] {
  const n = 8 + rand(40);
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    id: `${customer}-${i}`,
    ref: `ORD-${1000 + i}`,
    item: SYMBOLS[rand(SYMBOLS.length)]![1],
    amount: Math.round((50 + Math.random() * 9500) * 100) / 100,
    placed: now - rand(86_400_000 * 30),
    status: STATUSES[rand(STATUSES.length)]!,
  }));
}

function exampleMaster(host: HTMLElement): Mounted {
  const customers = makeTrades(120).map((r) => ({ ...r }));
  const schema: GridSchema = {
    id: "master",
    headerHeight: 42,
    columns: [
      ...TRADE_COLUMNS,
      {
        field: "actions",
        header: "",
        width: 70,
        sortable: false,
        filter: false,
        cellRenderer: "rowActions",
      },
    ],
  };
  const grid = new Grid(schema, customers, {
    selection: "multi",
    masterDetail: true,
    pagination: { pageSize: 12 },
  });

  // Row action renderer (closes over this grid).
  registerCellRenderer("rowActions", (_v, row) => {
    const btn = document.createElement("button");
    btn.className = "gw-rowaction";
    btn.title = "Remove";
    btn.textContent = "✕";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      grid.removeRow(String(row.id));
    });
    return btn;
  });

  // Detail = another paginated grid from a different "API".
  const dispose = mount(grid, host, {
    customStyles: true,
    detail: (row, panel, id) => {
      const orders = makeOrders(id);
      const sub = new Grid(
        {
          id: `orders-${id}`,
          rowHeight: 32,
          headerHeight: 36,
          columns: [
            { field: "ref", header: "Order", width: 120 },
            { field: "item", header: "Item", width: 200 },
            {
              field: "amount",
              header: "Amount",
              type: "number",
              width: 130,
              valueFormatter: "currency",
            },
            {
              field: "placed",
              header: "Placed",
              type: "number",
              width: 130,
              valueFormatter: "time",
            },
            { field: "status", header: "Status", width: 120, cellRenderer: "badge" },
          ],
        },
        [],
        {
          pagination: { pageSize: 6 },
          datasource: async (req) => {
            const start = (req.page - 1) * req.pageSize;
            return delay(
              { rows: orders.slice(start, start + req.pageSize), total: orders.length },
              200,
            );
          },
        },
      );
      const title = document.createElement("div");
      title.className = "gw-detail-title";
      title.textContent = `Orders for ${row.name} (${row.symbol})`;
      panel.append(title);
      const subHost = document.createElement("div");
      subHost.className = "gw-detail-grid";
      panel.append(subHost);
      const subDispose = mount(sub, subHost, { customStyles: true });
      return () => {
        subDispose();
        sub.destroy();
      };
    },
  });

  // Bulk-action toolbar.
  const actions = $("grid-actions");
  const mark = document.createElement("button");
  mark.className = "grid-btn";
  const clear = document.createElement("button");
  clear.className = "grid-btn";
  clear.textContent = "Clear";
  actions.append(mark, clear);
  const bulkDispose = effect(() => {
    const n = grid.selectionCount();
    mark.textContent = `Mark ${n} Filled`;
    mark.disabled = n === 0;
    clear.disabled = n === 0;
  });
  mark.addEventListener("click", () => {
    for (const sid of grid.selectedIds()) grid.updateCell(sid, "status", "Filled");
  });
  clear.addEventListener("click", () => grid.clearSelection());

  setFoot(
    "Expand a row to load its orders from a second paginated API. Select rows (or all) for bulk actions, edit Price / Qty / Owner inline, ✕ to remove.",
  );
  return { grid, dispose: () => (bulkDispose(), dispose()) };
}

// ---- Example 4: your own data + controlled pagination ----------------------

function exampleOwn(host: HTMLElement): Mounted {
  const myData: Row[] = makeTrades(57);
  const schema: GridSchema = { id: "own", columns: [...TRADE_COLUMNS] };
  const grid = new Grid(schema, myData, { pagination: { pageSize: 8 } });
  const dispose = mount(grid, host, { customStyles: true });

  // Imperative external controls (in addition to the built-in pager).
  const actions = $("grid-actions");
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "grid-count";
  sizeLabel.textContent = "Rows/page";
  const size = document.createElement("select");
  size.className = "grid-select";
  for (const n of [5, 8, 15, 25]) {
    const o = document.createElement("option");
    o.value = String(n);
    o.textContent = String(n);
    if (n === 8) o.selected = true;
    size.append(o);
  }
  size.addEventListener("change", () => grid.setPageSize(Number(size.value)));
  const jump = document.createElement("button");
  jump.className = "grid-btn";
  jump.textContent = "Jump to last";
  jump.addEventListener("click", () => grid.lastPage());
  actions.append(sizeLabel, size, jump);

  setFoot(
    "Your own array (57 rows). Pagination is fully reactive — the built-in pager, the page-size selector, and the Jump button all drive the same signal-backed state.",
  );
  return { grid, dispose };
}

// ---- Example 5: grouping + aggregation -------------------------------------

function exampleGroup(host: HTMLElement): Mounted {
  const schema: GridSchema = {
    id: "grouped",
    groupBy: ["status", "owner"],
    columns: [
      { field: "owner", header: "Owner", width: 200 },
      { field: "symbol", header: "Symbol", width: 110 },
      { field: "name", header: "Company", width: 220 },
      {
        field: "price",
        header: "Price",
        type: "number",
        width: 130,
        valueFormatter: "currency",
        aggFunc: "sum",
      },
      { field: "qty", header: "Qty", type: "number", width: 110, aggFunc: "sum" },
      { field: "status", header: "Status", width: 130, cellRenderer: "badge" },
    ],
  };
  const grid = new Grid(schema, makeTrades(400));
  const dispose = mount(grid, host, { customStyles: true });

  const actions = $("grid-actions");
  const expand = document.createElement("button");
  expand.className = "grid-btn";
  expand.textContent = "Expand all";
  expand.addEventListener("click", () => grid.expandAllGroups());
  const collapse = document.createElement("button");
  collapse.className = "grid-btn";
  collapse.textContent = "Collapse all";
  collapse.addEventListener("click", () => grid.collapseAllGroups());
  actions.append(expand, collapse);

  setFoot(
    "Grouped by Status → Owner with sum aggregations on Price and Qty. Group rows show subtotals; the footer shows grand totals. Click ▸ to collapse a group.",
  );
  return { grid, dispose };
}

// ---- Tab wiring -------------------------------------------------------------

const EXAMPLES: Record<string, (host: HTMLElement) => Mounted> = {
  live: exampleLive,
  server: exampleServer,
  master: exampleMaster,
  group: exampleGroup,
  own: exampleOwn,
};

function setFoot(text: string): void {
  $("grid-foot").textContent = text;
}

function show(name: string): void {
  active?.dispose();
  countDispose?.();
  $("grid-host").replaceChildren();
  $("grid-actions").replaceChildren();
  quickInput.value = "";
  const build = EXAMPLES[name] ?? exampleLive;
  active = build($("grid-host"));
  attachCount(active.grid);
}

const tabs = $("grid-tabs");
for (const tab of tabs.querySelectorAll<HTMLButtonElement>(".grid-tab")) {
  tab.addEventListener("click", () => {
    for (const t of tabs.querySelectorAll(".grid-tab")) t.classList.toggle("is-active", t === tab);
    show(tab.dataset.ex ?? "live");
  });
}

show("live");
