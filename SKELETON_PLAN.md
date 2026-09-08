# Skeleton Loaders & Step Transitions — Plan

> Schema-driven skeleton UI for **Formwright** (forms, wizards, submit/save) and **Gridwright**
> (rows, columns, server fetch). Skeletons mirror the shape of the schema — not a generic
> spinner — so loading states feel like the real UI about to appear.

---

## 1. Problem

Today loading feedback is minimal:

| Surface                        | Current behaviour                                                             |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Form submit**                | Button text → `"Submitting…"`, `isSubmitting` signal; no body skeleton        |
| **Wizard step change**         | Panel swaps instantly (`replaceChildren` on step index change); no transition |
| **Draft save / persist**       | Silent write to `localStorage`; no in-flight indicator                        |
| **Async providers** (`$query`) | Query provider has `loading` in core; DOM does not show skeleton fields       |
| **Grid server mode**           | Text overlay `"Loading…"` (`.gw-loading`); not column/row shaped              |
| **Grid initial mount**         | Empty body until first datasource response                                    |

Users expect:

1. **Step transitions** — subtle motion when moving Next/Back (direction-aware).
2. **Submit / save loading** — form body or step panel shows a skeleton shaped like the fields being submitted.
3. **Schema-faithful skeletons** — if the schema has a 6-col email + toggle row, the skeleton matches that layout.
4. **Grid skeletons** — shimmer rows aligned to column widths/types, including grouped/master-detail layouts.

---

## 2. Goals & non-goals

### Goals

- **Schema-driven** — derive skeleton structure from `FormSchema` / `GridSchema`, not hand-written HTML per app.
- **Framework-agnostic core** — skeleton _plans_ (data describing placeholder shapes) live in `@formwright/core` / `@formwright/grid-core`; DOM renders them in `@formwright/dom` / `@formwright/grid-dom`.
- **Composable** — same skeleton builder used for: initial load, step transition, submit overlay, async options loading.
- **Accessible** — `aria-busy="true"`, `role="status"`, respect `prefers-reduced-motion`.
- **Unstyled hooks** — `.fw-skeleton`, `.fw-skeleton-*`, `.gw-skeleton-*`; apps style with CSS or Tailwind.
- **Wizard-first** — step enter/exit animation + per-step skeleton that matches that step's fields only.

### Non-goals (v1)

- Lottie / image skeletons.
- Skeleton for custom widgets where shape is unknown (fallback to generic block unless widget registers a skeleton).
- SSR streaming skeleton hydration (future).
- Skeleton during codegen / AI schema generation (separate concern).

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Schema (FormSchema / GridSchema)                                │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
        ┌───────▼────────┐            ┌─────────▼─────────┐
        │  Skeleton plan │            │  Skeleton plan     │
        │  (core)        │            │  (grid-core)       │
        │  buildSkeleton │            │  buildGridSkeleton │
        │  Plan(schema)  │            │  Plan(schema,rows) │
        └───────┬────────┘            └─────────┬─────────┘
                │                             │
        ┌───────▼────────┐            ┌─────────▼─────────┐
        │  @formwright/  │            │  @formwright/      │
        │  dom           │            │  grid-dom          │
        │  renderSkeleton│            │  renderGridSkeleton│
        │  + transitions │            │  + row shimmer     │
        └────────────────┘            └────────────────────┘
```

### 3.1 Skeleton plan (serializable intermediate)

A **skeleton plan** is a tree parallel to the field/column tree — no values, only layout hints:

```ts
// Form — packages/core/src/skeleton.ts (proposed)
interface SkeletonNode {
  readonly kind: "field" | "group" | "collection" | "steps" | "step" | "grid-row";
  readonly variant: SkeletonVariant; // "label+control", "toggle-row", "heading", …
  readonly colSpan?: number;
  readonly rows?: number; // collection: placeholder item count
  readonly children?: readonly SkeletonNode[];
  readonly width?: "full" | "short" | "medium"; // control bar width hint
}

type SkeletonVariant =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "range"
  | "color"
  | "heading"
  | "separator"
  | "paragraph"
  | "unknown";
```

```ts
// Grid — packages/grid-core/src/skeleton.ts (proposed)
interface GridSkeletonPlan {
  readonly columns: readonly {
    field: string;
    width: number;
    variant: "text" | "number" | "badge" | "chart";
  }[];
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly leadingWidth?: number; // selection / expand columns
}
```

Plans are **pure functions of schema** (+ optional overrides). DOM layer turns plans into DOM with shimmer classes.

### 3.2 Packages

| Package                   | Responsibility                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `@formwright/schema`      | Optional `loading?: LoadingSchema` on form/steps/fields; `skeleton?: SkeletonOptions` |
| `@formwright/core`        | `buildSkeletonPlan(schema, scope?)`, loading signals, step transition state           |
| `@formwright/dom`         | `renderSkeleton(plan, host)`, step transitions, submit overlay, CSS hooks             |
| `@formwright/grid-schema` | Optional `loading?: { rowCount?: number }` on grid schema                             |
| `@formwright/grid-core`   | `buildGridSkeletonPlan(schema, options)`                                              |
| `@formwright/grid-dom`    | Replace text overlay with column-aligned skeleton rows                                |

---

## 4. Formwright — feature spec

### 4.1 Schema extensions (optional, backward compatible)

```ts
/** Form-level loading UX */
interface LoadingSchema {
  /** Show skeleton on submit until response (default true when skeleton enabled). */
  readonly onSubmit?: boolean;
  /** Show skeleton when navigating wizard steps (default true). */
  readonly onStepChange?: boolean;
  /** Min duration ms to avoid flash (default 150). */
  readonly minDuration?: number;
  /** Step transition: "slide" | "fade" | "none" (default "slide"). */
  readonly stepTransition?: "slide" | "fade" | "none";
}

/** Per-field override */
interface SkeletonFieldOptions {
  readonly variant?: SkeletonVariant;
  readonly lines?: number; // textarea paragraph lines
}

// On FormSchema:
readonly loading?: LoadingSchema;

// On FieldSchema:
readonly skeleton?: SkeletonFieldOptions;
```

Wizard `steps` field inherits form-level `loading`; each `step` can override (e.g. heavier step → more lines).

### 4.2 Core signals & API

```ts
// Form (@formwright/core)
readonly isLoading: ReadSignal<boolean>;       // any loading reason
readonly loadingReason: ReadSignal<"submit" | "step" | "init" | "provider" | null>;

// StepsNode
next(): Promise<boolean>;  // async wrapper: validate → transition → goTo
prev(): Promise<boolean>;

// Imperative
form.showSkeleton(scope?: "form" | "step" | FieldNode);
form.hideSkeleton();
```

**Loading reasons**

| Reason     | Trigger                                              | Skeleton scope                |
| ---------- | ---------------------------------------------------- | ----------------------------- |
| `submit`   | `form.submit()` in flight                            | Full form body or active step |
| `step`     | `steps.next()` / `prev()` / `goTo()`                 | Active step panel only        |
| `init`     | `Form` constructed with `options.loadValues()` async | Full form                     |
| `provider` | `$query` field options loading                       | That field's control only     |

### 4.3 Step transition animation

**Flow (Next click):**

```
1. User clicks Next
2. validateStep() — if fail, stop
3. Set loadingReason = "step", direction = "forward"
4. Show skeleton plan for *target* step (or shimmer overlay on current)
5. Animate out current panel (slide-left + fade, 180ms)
6. steps.goTo(index + 1) — update signals
7. Animate in new panel (slide-from-right, 180ms)
8. Hide skeleton, loadingReason = null
```

**Back** uses `direction = "backward"` (reverse slide).

**Reduced motion:** skip translate; cross-fade only or instant swap.

**URL sync:** update URL after transition completes (or in parallel — configurable).

Implementation stays in `@formwright/dom` (`step-transition.ts`); core exposes `steps.isTransitioning` signal.

### 4.4 Submit / save skeleton

When `form.submit()`:

1. `isSubmitting` + `loadingReason = "submit"`.
2. Replace `.fw-form-body` (or `.fw-step-panel`) content with skeleton plan for **current visible fields** (wizard: active step only; flat form: all visible fields).
3. Nav buttons disabled; optional skeleton on submit button (`fw-skeleton-button`).
4. On success/error: animate out skeleton → show success screen or restore form.

**Persist save** (optional v1.1): brief skeleton pulse on consent grant or debounced auto-save — lower priority.

### 4.5 Skeleton rendering rules (form)

Walk `FieldSchema` tree (same order as `render.ts`):

| Field type                            | Skeleton shape                                                  |
| ------------------------------------- | --------------------------------------------------------------- |
| `text`, `email`, `password`, `number` | Label bar (40% width) + input bar (100%)                        |
| `textarea`                            | Label + 3 lines (configurable `skeleton.lines`)                 |
| `select`, `date`, `time`              | Label + input + chevron block                                   |
| `toggle`, `checkbox`                  | Row: label left, circle/switch right (`labelPosition: "start"`) |
| `radio`                               | Label + 2–3 pill bars                                           |
| `range`                               | Label + track bar                                               |
| `file`                                | Dashed drop zone rectangle                                      |
| `color`                               | Label + swatch square + input bar                               |
| `group`                               | Optional group label + indented children                        |
| `collection`                          | `minItems` or 1 placeholder card with child skeletons           |
| `steps`                               | Not skeletonized as whole — use active `step` only              |
| `step`                                | Children only                                                   |
| `heading`                             | Single wide bar (70%)                                           |
| `separator`                           | Thin horizontal bar                                             |
| `paragraph`                           | 2 lines varying width                                           |
| Presentational                        | Skip or minimal                                                 |

Respect **`colSpan`** — skeleton fields sit on the same 12-col grid as real fields (`.fw-field-grid`).

### 4.6 DOM/CSS hooks

```css
.fw-skeleton {
  /* shimmer via background gradient animation */
}
.fw-skeleton-label {
  height: 12px;
  width: 40%;
}
.fw-skeleton-control {
  height: 36px;
  width: 100%;
}
.fw-skeleton--multiline {
  /* textarea */
}
.fw-step-panel.is-entering {
  animation: fw-step-in 180ms ease;
}
.fw-step-panel.is-exiting {
  animation: fw-step-out 180ms ease;
}
.fw-form-body.is-loading {
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  /* fade only */
}
```

Shimmer implemented with CSS only (no JS animation frames) for perf.

### 4.7 Custom widgets

```ts
registerWidget("rating", {
  mount: …,
  skeleton?: (field) => ({ variant: "custom", blocks: [{ w: 120, h: 24 }] }),
});
```

If no `skeleton` registered → `variant: "unknown"` (single full-width bar).

---

## 5. Gridwright — feature spec

### 5.1 Replace text overlay

Current `.gw-loading { text: "Loading…" }` becomes **skeleton rows**:

- Header row stays visible (optional: skeleton filter inputs in filter row).
- Body shows `rowCount` shimmer rows (default **8**, or `schema.loading?.rowCount`).
- Each cell width matches column `width` / flex; number columns get shorter bars, badge columns get pill shape.

### 5.2 Grid skeleton plan

```ts
buildGridSkeletonPlan(schema: GridSchema, opts?: {
  rowCount?: number;
  includeLeading?: boolean; // selection + master-detail columns
}): GridSkeletonPlan
```

### 5.3 Modes

| Mode                     | When                    | Skeleton                                 |
| ------------------------ | ----------------------- | ---------------------------------------- |
| **Server fetch**         | `grid.loading()` true   | Body rows only; header live              |
| **Initial mount**        | Empty data + datasource | Same                                     |
| **Master/detail expand** | Detail panel opening    | Mini grid skeleton inside panel (3 rows) |
| **Column reorder**       | Optional v2             | Don't skeleton — keep cells              |

### 5.4 DOM/CSS hooks

```css
.gw-skeleton-row {
  display: flex;
  height: var(--row-height);
}
.gw-skeleton-cell {
  /* width from column def */
}
.gw-skeleton-shimmer {
  animation: gw-shimmer 1.2s infinite;
}
```

Flow renderer and virtual renderer share `renderGridSkeleton(plan, host)` in `grid-dom/src/skeleton.ts`.

---

## 6. Configuration & defaults

| Setting                   | Default                                            |
| ------------------------- | -------------------------------------------------- |
| Form skeleton on submit   | `true` when `schema.loading` present; else `false` |
| Step transition           | `"slide"` when wizard; `"none"` for flat forms     |
| Step skeleton on navigate | `true` for wizards                                 |
| `minDuration`             | `150` ms                                           |
| Grid skeleton rows        | `8`                                                |
| Shimmer                   | on; off when `prefers-reduced-motion`              |

Apps opt in globally:

```ts
new Form(schema, values, {
  loading: { onSubmit: true, onStepChange: true },
});
```

Or via schema:

```json
{ "loading": { "onSubmit": true, "stepTransition": "slide" } }
```

---

## 7. Implementation phases

### Phase 1 — Skeleton plan builder (core)

- [ ] `buildSkeletonPlan(schema, { scope: "form" | StepNode })` in `@formwright/core`
- [ ] Unit tests: each field type → expected plan node
- [ ] `buildGridSkeletonPlan` in `@formwright/grid-core`
- [ ] Export types from package indexes

**Exit:** plans generated for playground schemas; snapshot tests.

### Phase 2 — Form DOM skeleton renderer

- [ ] `@formwright/dom` — `renderSkeleton(plan, host)`, shimmer CSS
- [ ] Respect `colSpan`, group indent, collection cards
- [ ] Storybook stories: Skeleton / Basic, Skeleton / Wizard step

**Exit:** static skeleton visible when `form.showSkeleton()` called.

### Phase 3 — Submit & step loading integration

- [ ] Wire `submit()` → skeleton overlay
- [ ] `step-transition.ts` — enter/exit classes + `steps.next/prev` async
- [ ] `isLoading`, `loadingReason` signals on `Form`
- [ ] Schema `loading` block + validator
- [ ] Playground + Storybook wizard demos updated

**Exit:** wizard Next/Back animates; submit shows skeleton until mock API returns.

### Phase 4 — Grid skeleton overlay

- [ ] `grid-dom/src/skeleton.ts` — column-aligned rows
- [ ] Replace `.gw-loading` text in `flow.ts` (+ virtual renderer if applicable)
- [ ] Storybook Gridwright / Server pagination story shows skeleton during fetch

**Exit:** server mode shows shimmer rows instead of "Loading…".

### Phase 5 — Polish & extensibility

- [ ] Widget `skeleton` registration
- [ ] Provider-level field skeleton when `$query` loading
- [ ] `minDuration` anti-flash
- [ ] AI prompt update (`@formwright/ai`) for `loading` schema
- [ ] README + PLAN cross-links

**Exit:** documented public API; 0.3.x changeset.

---

## 8. Testing strategy

| Layer              | Tests                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **core**           | Plan builder snapshots per fixture schema; step loading state machine         |
| **dom**            | DOM structure assertions (field count, colSpan classes); reduced-motion class |
| **grid-core**      | Column widths → cell skeleton widths                                          |
| **grid-dom**       | Overlay visible when `loading()` true                                         |
| **e2e** (optional) | Playwright: click Next → skeleton visible → fields appear                     |

---

## 9. Open questions

1. **Should step transition block double-click on Next?** — Recommend yes (`isTransitioning` disables nav).
2. **Skeleton during step _validation_ only?** — No; validation is sync/instant. Skeleton only if `goTo` is async (e.g. prefetch step data).
3. **Async step data (future)** — `step.load?: { $query: … }` could trigger skeleton; defer to v2 unless needed now.
4. **Success screen transition** — Cross-fade from skeleton to success panel (reuse step fade).
5. **Grid virtual vs flow** — Both must implement skeleton; virtual may clip rows to viewport window count only.

---

## 10. Success criteria

- [ ] Wizard step change has visible direction-aware animation (< 200ms).
- [ ] Submit shows schema-shaped skeleton, not a blank form or spinner-only button.
- [ ] Grid server fetch shows column-aligned shimmer rows.
- [ ] Skeleton plan derives from schema with no duplicate layout definitions.
- [ ] Works in playground, Storybook, and vanilla `new Form().mount()` with zero app code.
- [ ] `prefers-reduced-motion` honoured.

---

## 11. References

- Form render path: `packages/dom/src/render.ts` (`renderSteps`, `renderNode`)
- Grid loading: `packages/grid-core/src/grid.ts` (`loadingSig`), `packages/grid-dom/src/flow.ts` (`.gw-loading`)
- Step navigation: `packages/core/src/nodes.ts` (`StepsNode.next/prev/goTo`)
- Existing CSS transitions: `apps/playground/src/styles.css` (progress bar only)

---

_Next step: review this plan, then implement **Phase 1** (skeleton plan builders + tests)._
