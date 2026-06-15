import { Grid, type GridDatasource, type GridSchema, type Row } from "@formwright/grid-core";
import { mount, registerCellRenderer, registerFormatter } from "@formwright/grid-dom";

const rand = (n: number) => Math.floor(Math.random() * n);
const delay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), ms));

const SYMBOLS = [
  ["AAPL", "Apple Inc."],
  ["MSFT", "Microsoft Corp."],
  ["GOOGL", "Alphabet Inc."],
  ["AMZN", "Amazon.com Inc."],
  ["NVDA", "NVIDIA Corp."],
] as const;
const OWNERS = ["Ava Chen", "Liam Patel", "Noah Kim"];
const STATUSES = ["Open", "Filled", "Pending", "Cancelled"];

export const TRADE_COLUMNS: GridSchema["columns"] = [
  { field: "symbol", header: "Symbol", width: 110 },
  { field: "name", header: "Company", width: 200 },
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
];

let gridRenderersRegistered = false;

export function ensureGridRenderers(): void {
  if (gridRenderersRegistered) return;
  gridRenderersRegistered = true;
  registerFormatter("currency", (v) =>
    Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" }),
  );
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
}

export function makeTrades(count: number): Row[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const [symbol, name] = SYMBOLS[i % SYMBOLS.length]!;
    return {
      id: String(i),
      symbol,
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

export interface GridDemoResult {
  dispose: () => void;
}

export function mountLiveDemo(
  host: HTMLElement,
  toolbar: HTMLElement,
  onFoot: (t: string) => void,
): GridDemoResult {
  ensureGridRenderers();
  const ROWS = 5000;
  const schema: GridSchema = {
    id: "trades",
    rowHeight: 38,
    columns: [
      ...TRADE_COLUMNS,
      { field: "updatedAt", header: "Updated", type: "number", width: 110, valueFormatter: "time" },
    ],
  };
  const grid = new Grid(schema, makeTrades(ROWS));
  const disposeMount = mount(grid, host);

  const btn = document.createElement("button");
  btn.className = "grid-btn";
  btn.textContent = "▶ Start live updates";
  const rate = document.createElement("span");
  rate.className = "grid-rate";
  toolbar.append(btn, rate);

  let timer: number | undefined;
  let perSec = 0;
  const tick = () => {
    const now = Date.now();
    for (let k = 0; k < 100; k++) {
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
      rate.textContent = "";
    } else {
      timer = window.setInterval(tick, 100);
      btn.textContent = "⏸ Stop live updates";
    }
  });

  onFoot(`${ROWS.toLocaleString()} rows, virtualized — double-click Price / Qty / Owner to edit.`);
  return {
    dispose: () => {
      clearInterval(rateTimer);
      if (timer) clearInterval(timer);
      disposeMount();
      grid.destroy();
    },
  };
}

export function mountServerDemo(host: HTMLElement, onFoot: (t: string) => void): GridDemoResult {
  ensureGridRenderers();
  const all = makeTrades(2000);
  const datasource: GridDatasource = async (req) => {
    let rows = all;
    const q = req.quickFilter.trim().toLowerCase();
    if (q)
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
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
  const grid = new Grid({ id: "server", columns: [...TRADE_COLUMNS] }, [], {
    datasource,
    pagination: { pageSize: 20 },
  });
  const disposeMount = mount(grid, host);
  onFoot("Server-side pagination — sort, filter, and page round-trip to a simulated API.");
  return { dispose: () => (disposeMount(), grid.destroy()) };
}

export function mountMasterDetailDemo(
  host: HTMLElement,
  toolbar: HTMLElement,
  onFoot: (t: string) => void,
): GridDemoResult {
  ensureGridRenderers();
  const customers = makeTrades(80);
  const grid = new Grid(
    {
      id: "master",
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
    },
    customers,
    { selection: "multi", masterDetail: true, pagination: { pageSize: 10 } },
  );

  registerCellRenderer("rowActions", (_v, row) => {
    const btn = document.createElement("button");
    btn.className = "gw-rowaction";
    btn.textContent = "✕";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      grid.removeRow(String(row.id));
    });
    return btn;
  });

  const disposeMount = mount(grid, host, {
    detail: (row, panel, id) => {
      const subHost = document.createElement("div");
      subHost.style.minHeight = "120px";
      panel.append(subHost);
      const orders = Array.from({ length: 6 + rand(8) }, (_, i) => ({
        id: `${id}-${i}`,
        ref: `ORD-${1000 + i}`,
        item: SYMBOLS[rand(SYMBOLS.length)]![1],
        amount: Math.round((50 + Math.random() * 9500) * 100) / 100,
        status: STATUSES[rand(STATUSES.length)]!,
      }));
      const sub = new Grid(
        {
          id: `orders-${id}`,
          rowHeight: 32,
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
            { field: "status", header: "Status", width: 120, cellRenderer: "badge" },
          ],
        },
        orders,
        { pagination: { pageSize: 5 } },
      );
      const subDispose = mount(sub, subHost);
      return () => {
        subDispose();
        sub.destroy();
      };
    },
  });

  const mark = document.createElement("button");
  mark.className = "grid-btn";
  mark.textContent = "Mark selected Filled";
  mark.addEventListener("click", () => {
    for (const sid of grid.selectedIds()) grid.updateCell(sid, "status", "Filled");
  });
  toolbar.append(mark);

  onFoot("Expand a row for a nested paginated grid. Multi-select + bulk status update.");
  return {
    dispose: () => {
      disposeMount();
      grid.destroy();
    },
  };
}

export function mountGroupingDemo(
  host: HTMLElement,
  toolbar: HTMLElement,
  onFoot: (t: string) => void,
): GridDemoResult {
  ensureGridRenderers();
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
  const disposeMount = mount(grid, host);

  for (const [label, fn] of [
    ["Expand all", () => grid.expandAllGroups()],
    ["Collapse all", () => grid.collapseAllGroups()],
  ] as const) {
    const b = document.createElement("button");
    b.className = "grid-btn";
    b.textContent = label;
    b.addEventListener("click", fn);
    toolbar.append(b);
  }

  onFoot("Grouped by Status → Owner with sum aggregations and grand-total footer.");
  return { dispose: () => (disposeMount(), grid.destroy()) };
}

export function mountOwnDataDemo(
  host: HTMLElement,
  toolbar: HTMLElement,
  onFoot: (t: string) => void,
): GridDemoResult {
  ensureGridRenderers();
  const grid = new Grid({ id: "own", columns: [...TRADE_COLUMNS] }, makeTrades(57), {
    pagination: { pageSize: 8 },
  });
  const disposeMount = mount(grid, host);

  const size = document.createElement("select");
  size.className = "grid-select";
  for (const n of [5, 8, 15, 25]) {
    const o = document.createElement("option");
    o.value = String(n);
    o.textContent = `${n} / page`;
    if (n === 8) o.selected = true;
    size.append(o);
  }
  size.addEventListener("change", () => grid.setPageSize(Number(size.value)));
  const jump = document.createElement("button");
  jump.className = "grid-btn";
  jump.textContent = "Jump to last page";
  jump.addEventListener("click", () => grid.lastPage());
  toolbar.append(size, jump);

  onFoot("Your own array with client pagination — reactive page size and jump controls.");
  return { dispose: () => (disposeMount(), grid.destroy()) };
}
