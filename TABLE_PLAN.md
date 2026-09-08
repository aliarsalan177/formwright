# Gridwright — Next-Generation Schema-Driven Data Grid

> A framework-agnostic, signal-reactive data grid that renders **anything from a schema** and
> ships every feature AG Grid charges for — for free — at a fraction of the bundle, with
> surgical cell-level updates that beat both AG Grid and TanStack on interaction latency.
>
> Sibling to **Formwright**: same philosophy (schema is data, runtime is a tiny signal core,
> you own the UI), same `wright` family, same monorepo and reactive engine.

---

## ✅ Implementation status (as of 2026-06-15)

**Built and green** (`@formwright/grid-schema` + `@formwright/grid-core` + `@formwright/grid-dom`, on the shared
`@formwright/reactive` core). Whole runtime + demo is **~8 KB gzipped**. 30 grid unit tests pass; the
live demo is at [grid.html](https://aliarsalan177.github.io/formwright/grid.html).

**npm @ 0.2.0** — `@formwright/grid-schema`, `@formwright/grid-core`, `@formwright/grid-dom`, and `@formwright/reactive`
(0.2.1). Install with `npm i @formwright/grid-core @formwright/grid-dom`.

**Done:**

- **Engine** — `Grid` class; per-row signals → **surgical cell updates**; reactive filter → sort
  pipeline; a live cell tick does **not** resort the view (verified by test).
- **Virtualization** — row windowing + **DOM node pooling** (only the visible window in the DOM;
  tested at 50k rows). Sticky header, click-to-sort (none→asc→desc), type-aware comparators.
- **Filtering** — global quick filter across all columns **and** per-column filters.
- **Multi-column sort** — shift-click to chain columns; header shows arrows + priority numbers.
- **Columns** — reactive **resize** (drag handle), **reorder** (drag header), **pinning**
  (sticky left/right with offsets), and **visibility** — all driven by a reactive column model.
- **Accessibility** — full ARIA grid roles + `aria-sort`/`selected`/`expanded`/`rowcount`.
- **CSV export** (`toCsv` / `downloadCsv`); no-rows + loading overlays.
- **Grouping + aggregation** — multi-level `groupBy`, `aggFunc` (sum/avg/min/max/count) per column,
  expandable group rows with subtotals, and a grand-total footer.
- **Pagination** — client-side **and server-side** (`datasource` → `{ rows, total }`); built-in
  pager (first/prev/next/last), reactive `pagination()` state, `setPage`/`setPageSize`,
  reset-to-page-1 on filter, loading overlay.
- **Selection** — `single` / `multi`, select-all-on-page, `selectedRows()` for **bulk actions**.
- **Master / detail** — expandable rows; the detail panel renders anything, including **another
  paginated grid from a second API**.
- **Editing** — inline cell editing (double-click), composable with live updates.
- **Renderer split** — node-pooled **virtualized** path for big/live data; **flow** path
  (variable height) for pagination / selection / master-detail. One `mount()` auto-dispatches.
- **Formatters / cell renderers** registry (currency/number/percent/date built in; custom badge,
  change, row-actions in the demo). Renderers return text (XSS-safe) or a `Node`.
- **Demo** — four scenarios: Live 50k virtualized · Server pagination · Master/detail with
  selection, bulk actions and inline editing · Your-data with controlled pagination.

---

## ⭐ Parity checklist — everything, in the FREE tier

Goal: match (then beat) **AG Grid Enterprise + TanStack Table** with all features free and MIT.
Status: ✅ done · 🟡 partial · ⬜ planned. Built in tiers by leverage.

**Tier 1 — credibility (table-stakes; even free competitors have these)**

- ✅ Multi-column sort (shift-click), type-aware comparator chain
- ✅ ARIA grid roles (`grid`/`row`/`columnheader`/`gridcell`, `aria-sort`/`selected`/`expanded`/`rowcount`)
- ✅ CSV export (`toCsv` / `downloadCsv`)
- ✅ No-rows + loading overlays
- ✅ Column **resize** (reactive widths + drag handle)
- ✅ Column **reorder** (drag header) and **pinning** (rendered sticky left/right, with offsets)
- ✅ Column **visibility** toggle (+ demo Columns menu: show/hide + pin)
- ⬜ Flex / auto-size / size-to-fit columns; column groups (multi-level headers)
- ⬜ Keyboard navigation (arrows, tab, enter-to-edit, page/home/end) + focus model — _next_
- ⬜ Column **virtualization** (wide grids)
- ⬜ More cell editors (select/date/checkbox/large-text) — **reuse Formwright widgets**

**Tier 2 — the enterprise headline (what AG Grid charges for)**

- ✅ Row **grouping** (multi-level) + **aggregation** (sum/avg/min/max/count), expandable group
  rows with subtotals, **grand-total footer** — all free
- ⬜ **Tree data** (hierarchical rows) — _next_
- ⬜ **Pivoting**
- ✅ Master / detail (expandable; detail can be another paginated grid)

**Tier 3 — Excel-class interaction**

- ⬜ Range selection (cell ranges) + **fill handle**
- ⬜ Clipboard **copy/paste** (TSV, Excel interop)
- ⬜ **Set filter** (checkbox list) + number/date operator filters + multi-filter + faceted values
- ⬜ **Excel export** (styled `.xlsx`)

**Tier 4 — tooling & polish**

- ⬜ Tool panels / sidebar (columns, filters); column menu; context menu (right-click)
- ⬜ Status bar (row count, selected, live aggregations)
- ⬜ State persistence (save/restore column + sort + filter state)
- ⬜ Pinned rows (top/bottom), row drag-reorder, full-width rows, row/cell spanning
- ⬜ Undo/redo for edits; animations; i18n + RTL; custom header renderers

**Tier 5 — ecosystem & leapfrog**

- ⬜ Integrated charts (plugin)
- ⬜ Framework adapters (`@formwright/grid-wc` / react / vue); AG-Grid `columnDefs` compatibility adapter
- ⬜ Web-Worker compute (sort/filter/group off the main thread)
- ⬜ **Benchmark harness in CI** (1M rows + real-time) — the scoreboard
- ⬜ **AI-generated grid schemas** (`@formwright/grid-ai`)

Already done from the original roadmap: virtualization + node pooling, surgical updates,
client+server pagination, selection + bulk actions, global + per-column filters, inline editing.

---

## 1. The thesis (why this wins)

Two products own the grid market and both leave a wide-open flank:

- **AG Grid** — feature-complete, but its best features (grouping, pivot, range selection,
  Excel export, server-side row model, tool panels, integrated charts) are behind **AG Grid
  Enterprise**, a per-developer commercial licence that costs teams real money. The bundle is
  large, the API is imperative and sprawling, and the framework wrappers (especially React)
  re-render heavily.
- **TanStack Table** — headless, tiny, elegant, MIT — but it's _only_ the logic. You bring your
  own DOM, your own virtualization (TanStack Virtual), your own everything. In React it
  re-renders through the framework's reconciler, so large grids with frequent updates get slow
  unless you hand-tune memoization. It has none of AG Grid's enterprise features built in.

**The gap:** nobody offers _AG-Grid-Enterprise feature parity_ + _TanStack-level lightness_ +
_zero framework lock-in_ + _a rendering model that updates only the cell that changed_.

That's Gridwright. The same wedge that makes Formwright compelling (a model emits a schema; a
tiny signal core renders real, surgically-updating DOM with no virtual DOM) is even more
valuable for grids, because grids are where framework reconciliation hurts most: thousands of
cells, high-frequency updates, scroll at 60fps.

### Positioning one-liner

> **All of AG Grid Enterprise, free and MIT. The lightness of TanStack. One grid for every
> framework. Cell-level reactivity that makes 1M rows and live data feel instant.**

---

## 2. Competitive analysis

| Capability                                | AG Grid Community | AG Grid Enterprise (paid) | TanStack Table              | **Gridwright (target)**             |
| ----------------------------------------- | ----------------- | ------------------------- | --------------------------- | ----------------------------------- |
| Row/column virtualization                 | ✅                | ✅                        | ⚠️ (bring TanStack Virtual) | ✅ built-in                         |
| Sort / filter / pagination                | ✅                | ✅                        | ✅                          | ✅                                  |
| Inline & custom cell editors              | ✅                | ✅                        | ⚠️ DIY                      | ✅ (reuses Formwright widgets)      |
| Row grouping + aggregation                | ❌                | ✅                        | ⚠️ DIY                      | ✅ free                             |
| Pivoting                                  | ❌                | ✅                        | ❌                          | ✅ free (phase 4)                   |
| Tree data / master-detail                 | ❌                | ✅                        | ⚠️ expanding DIY            | ✅ free                             |
| Range selection + fill handle + clipboard | ❌                | ✅                        | ❌                          | ✅ free                             |
| Set/multi/floating filters                | ❌                | ✅                        | ⚠️ DIY                      | ✅ free                             |
| Tool panels / sidebar / column menu       | ❌                | ✅                        | ❌                          | ✅ free                             |
| Status bar / aggregation footer           | ❌                | ✅                        | ❌                          | ✅ free                             |
| Server-side row model (huge/remote data)  | ❌                | ✅                        | ⚠️ DIY                      | ✅ free                             |
| CSV / Excel export                        | CSV only          | ✅ Excel                  | ❌                          | ✅ free (CSV core, Excel plugin)    |
| Integrated charts                         | ❌                | ✅                        | ❌                          | 🔌 plugin (later)                   |
| Real-time streaming updates               | ✅                | ✅                        | ⚠️ re-render cost           | ✅✅ surgical (flagship demo)       |
| Framework-agnostic                        | wrappers per fw   | wrappers per fw           | adapters per fw             | ✅ one core, thin adapters          |
| Bundle size                               | large             | large                     | tiny core                   | **small, pay-for-what-you-use**     |
| Licence                                   | MIT               | **commercial**            | MIT                         | **MIT (incl. enterprise features)** |

### Pain points we explicitly fix

1. **Cost** — enterprise features cost per-seat. Ours are free and MIT.
2. **Bundle bloat** — features are tree-shakeable modules; bundle scales with what you import.
3. **Framework lock-in & re-render cost** — one framework-agnostic core; cell-level signals
   instead of whole-grid reconciliation.
4. **Imperative, sprawling API** — declarative schema (column defs as data), like Formwright.
5. **Real-time data** — the case that breaks React grids becomes our flagship benchmark.

---

## 3. Repo, brand, and code reuse (recommendation)

**Recommendation: same monorepo, new product brand, shared reactive core.**

- Keep one monorepo (shared tooling: pnpm + Turborepo + tsup + vitest + changesets + CI). Less
  overhead, atomic cross-package changes, one release pipeline.
- **Extract the zero-dep signal engine** (`signal`/`computed`/`effect`/`batch`/`untrack`) out of
  `@formwright/core` into a standalone **`@formwright/reactive`** (working name). Both Formwright and
  Gridwright depend on it. This is the single most important reuse — it's the proven heart of the
  surgical-update model.
- **Brand:** Gridwright ships under the **`@formwright/*` npm scope** (e.g. `@formwright/grid-core`)
  — one org, one release pipeline. The product name stays **Gridwright** in docs and demos.
- **Synergy to exploit:** cell editors and filter controls are _forms_. Reuse Formwright's widget
  adapter system so a Gridwright cell editor is a Formwright field. One schema language spans
  "form" and "grid" — a differentiator neither competitor has.

### Package layout

```
packages/
  reactive/        @formwright/reactive     — extracted signal core (shared)
  grid-schema/     @formwright/grid-schema    — column/grid schema types + validator
  grid-core/       @formwright/grid-core      — data pipeline, row/column models, viewport state
  grid-dom/        @formwright/grid-dom       — direct-DOM renderer, virtualization, interaction
  grid-features/   @formwright/grid-features  — tree-shakeable modules (grouping, pivot, range-select, …)
  grid-export/     @formwright/grid-export    — CSV (core) + Excel (opt-in)
  grid-wc/         @formwright/grid-wc        — <gw-grid> web component
  grid-react/      @formwright/grid-react     — thin React adapter (no internal reconciliation)
  grid-vue/        @formwright/grid-vue
  grid-charts/     @formwright/grid-charts    — integrated charts (later, plugin)
  grid-ai/         @formwright/grid-ai        — natural-language → grid schema (ties to @formwright/ai)
apps/
  grid-playground/ — demos, benchmarks, visual grid builder ("Forge for grids")
```

---

## 4. Architecture

The same layering as Formwright: a DOM-free state core + a swappable renderer.

### 4.1 Reactive core (`@formwright/reactive`)

Shared signals. Every derived value in the grid (sorted rows, filtered set, visible window,
a single cell's value) is a `computed`/`signal`. A data change invalidates only the dependents
that read it — the foundation of cell-level updates.

### 4.2 Data layer — the Row Model abstraction (`@formwright/grid-core`)

A pluggable **RowModel** interface, mirroring AG Grid's biggest enterprise idea but free:

- **ClientRowModel** — all data in memory. Pipeline: `source → filter → sort → group/aggregate →
flatten → virtual window`. Each stage is a memoized `computed`; changing a filter only
  recomputes downstream. **Incremental invalidation:** a single edited/added row targets its
  group/sort bucket instead of recomputing the whole dataset where feasible.
- **ServerRowModel / InfiniteRowModel** — datasource callback fetches blocks on demand
  (`getRows({ startRow, endRow, sort, filter, groupKeys })`); supports millions of remote rows,
  server-side sort/filter/group. This is the AG Grid Enterprise SSRM, for free.
- **Columnar storage option** — store columns as typed arrays for fast sort/filter and cheap
  transfer to a Web Worker.

### 4.3 Heavy compute off the main thread

Sort / filter / group / aggregate on large client datasets run in a **Web Worker** over the
columnar store (transferable buffers), keeping scroll and input at 60fps. Falls back to main
thread for small datasets where worker overhead isn't worth it.

### 4.4 Column model

Column defs (and column groups) as data: width/flex, pinning (left/right), order, visibility,
sort, type, `valueGetter`/`valueFormatter`, `cellRenderer`, `cellEditor`, `aggFunc`, spanning.
All reactive — moving/resizing/pinning updates only affected cells.

### 4.5 Viewport & virtualization (`@formwright/grid-dom`)

- **Row + column windowing** with overscan; only visible cells exist in the DOM.
- **Node pooling / recycling** — reuse row and cell DOM nodes across scroll instead of
  create/destroy (kills GC churn; the thing naive virtualization gets wrong).
- **Transform-based scroll** (`translate3d`) — no per-frame reflow.
- **Row heights** — fixed (fast path), variable, and measured auto-height.
- **Sticky** headers, pinned rows (top/bottom), pinned columns, group headers.

### 4.6 Rendering = binding, not diffing

A cell binds to `(rowId, colId)` → text node / element. When that value's signal changes, only
that text node updates. No virtual DOM, no row re-render, no framework reconciliation. This is
the property that makes **real-time streaming** (finance tickers, dashboards, logs) smooth.

### 4.7 Interaction layer

Keyboard grid model (arrows, tab, page, home/end, type-to-edit), cell + row + **range selection**
with fill handle, **clipboard** (copy/paste TSV like Excel), editing (inline, full-row, popup;
custom editors = Formwright widgets), column drag-reorder / resize / pin, row drag, fill-down.

### 4.8 Features as tree-shakeable modules (`@formwright/grid-features`)

Grouping, pivot, tree-data, master-detail, set-filter, tool-panels, status-bar, range-selection,
clipboard, master-detail — each an opt-in module registered on the grid. **Bundle scales with
usage** — the direct answer to AG Grid's monolith _and_ its licensing tiers.

### 4.9 Theming & a11y

CSS variables + `part` hooks, a modern default theme, density modes (compact/standard/comfortable),
dark mode, RTL. Full ARIA grid roles and the standard keyboard interaction model from day one
(a11y is a common grid weakness and an easy differentiator).

---

## 5. The schema (DSL)

```ts
const grid: GridSchema = {
  id: "orders",
  rowModel: "client", // | "server" | "infinite"
  getRowId: (r) => r.id,
  columns: [
    { field: "name", header: "Customer", pinned: "left", sortable: true, filter: "text", flex: 1 },
    { field: "status", header: "Status", filter: "set", cellRenderer: "badge" }, // registered renderer, or a framework component
    {
      field: "total",
      header: "Total",
      type: "number",
      valueFormatter: "currency",
      aggFunc: "sum",
      filter: "number",
    },
    { field: "createdAt", header: "Created", type: "date", filter: "date" },
    { field: "actions", header: "", cellRenderer: { component: "RowMenu" } },
  ],
  group: { by: ["status"], aggFooter: true },
  selection: { mode: "range", checkboxes: true },
  features: ["grouping", "range-select", "clipboard", "tool-panels", "status-bar"],
  export: { csv: true, excel: true },
};

new Grid(grid, rows).mount(document.getElementById("app")!);
```

- **Serializable** like Formwright — can be authored by hand, generated by `@formwright/grid-ai`, or
  produced by a visual builder.
- **Renderers/editors** referenced by name (registered) or as a framework component (`mount`),
  exactly like Formwright widgets — same adapter code path.

---

## 6. Feature roadmap → AG Grid Enterprise parity

| Phase | Theme                             | Ships                                                                                                                                                                    |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0** | Foundations                       | Extract `@formwright/reactive`; scaffold grid packages; benchmark harness in CI                                                                                          |
| **1** | Core grid that already beats most | Virtualized rows+cols, node pooling, sort, multi-filter, pagination, resize/reorder/pin, inline edit, CSV export, modern theme, a11y, web component + React/Vue adapters |
| **2** | Real-time + selection (flagship)  | Cell-level streaming updates, range selection + fill handle, clipboard copy/paste, keyboard model, status bar. Publish benchmarks vs AG Grid + TanStack                  |
| **3** | Enterprise data features (free)   | Row grouping + aggregation, tree data, master-detail, set/floating filters, tool panels + sidebar, server-side/infinite row model                                        |
| **4** | Heavy hitters                     | Pivoting, Excel export, Web-Worker compute pipeline, column/cell spanning, auto-height                                                                                   |
| **5** | Ecosystem                         | Integrated charts plugin, AG-Grid columnDef compatibility adapter, TanStack adapter, visual grid builder ("Forge for grids"), `@formwright/grid-ai`                      |
| **6** | 1.0                               | Docs, recipes, migration guides, perf-budget gates, stability                                                                                                            |

**Sequencing logic:** ship a _core that is already best-in-class on lightness + real-time_
(phases 1–2) before chasing full enterprise parity (3–4). Don't try to out-feature AG Grid on
day one — out-_perform_ it, then close the feature gap while it's free.

---

## 7. Performance strategy (the technical bet we must win)

The grid wars are won on numbers. We commit to a public, reproducible benchmark suite from
phase 0, measuring against AG Grid and TanStack:

- **Scroll** — sustained FPS scrolling 100k / 1M rows.
- **Time-to-interactive** and **bundle size** (gzipped, by feature set).
- **Update throughput** — cells updated/second under live data without dropping frames (where
  our cell-level model should decisively win).
- **Sort/filter latency** on 100k–1M rows (worker vs main thread).
- **Memory** — DOM node count (pooled), heap under load.

Engineering levers: node pooling, transform scroll, columnar typed storage, Web-Worker compute,
incremental pipeline invalidation, and surgical binding. If we can't beat both competitors on
**update throughput** and **bundle size**, the wedge collapses — so those two are the gating
metrics for 1.0.

---

## 8. Go-to-market — how we break in

1. **Price wedge** — "everything AG Grid Enterprise charges per-seat for, MIT and free." Lands
   with every team currently paying for AG Grid Enterprise. Lead with the licence-cost story.
2. **Benchmark-driven launch** — a public benchmark site (Krausest-style "js-framework-benchmark"
   for grids) with reproducible numbers and a live 1M-row + real-time demo. Numbers travel.
3. **Migration adapters** — an AG Grid `columnDefs` compatibility layer and a TanStack adapter so
   teams switch with minimal rewrite. Lower switching cost = adoption.
4. **One grid for the whole org** — framework-agnostic core + thin adapters means React, Vue, and
   Angular teams use the same grid. Enterprise-wide standardization is a strong buyer narrative.
5. **DX & AI** — declarative schema, natural-language generation (`@formwright/grid-ai`), and a visual
   grid builder. "Describe the grid, get the grid."
6. **Forms + grid synergy** — Formwright + Gridwright share a schema language and widget system:
   editable grids whose cell editors are Formwright fields. A combined "app data layer" story.
7. **Open-core, fully free** — keep all features MIT to win adoption; monetize later (optional)
   via support, hosted services, premium charts/themes, or an enterprise dashboard — never by
   gating the grid features themselves.

---

## 9. Risks & mitigations

| Risk                                                 | Mitigation                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Scope is enormous** — AG Grid is years of work     | Phase ruthlessly; ship a best-in-class _core_ (1–2) before full parity; charts/pivot are late/plugins |
| Perf claims don't hold                               | Benchmark harness from phase 0; perf budgets gate every PR; update-throughput + bundle are 1.0 gates  |
| "Free enterprise" sustainability                     | Open-core; monetize adjacent (support/hosted/charts), not the grid                                    |
| Framework adapters maintenance burden                | Keep adapters _thin_ (pass schema + data; no logic); web component covers everything else             |
| a11y / RTL / cross-browser complexity                | ARIA grid model and RTL designed in from phase 1, not retrofitted                                     |
| Excel/pivot/charts depth                             | Treat as separate opt-in packages; partner with or wrap a charting lib rather than build from scratch |
| Reactive core must serve two very different products | Extract `@formwright/reactive` with a stable, minimal API; both products are integration tests for it |

---

## 10. Immediate next steps

1. ~~Decide brand/scope~~ — **decided:** `@formwright/grid-*` under the existing `@formwright` org.
2. Reserve the npm scope and the `gridwright` GitHub identity.
3. Extract `@formwright/reactive` from `@formwright/core`; repoint Formwright to it (no behavior change).
4. Scaffold `@formwright/grid-schema` + `@formwright/grid-core` (RowModel + ClientRowModel + column model).
5. Stand up the **benchmark harness** (1M rows, real-time feed) in CI _before_ building features —
   it's our scoreboard and our marketing.
6. Build the Phase 1 virtualized core behind one demo schema; prove node pooling + cell-level
   updates with a frame-budget test (the grid analogue of Formwright's mutation-count test).
