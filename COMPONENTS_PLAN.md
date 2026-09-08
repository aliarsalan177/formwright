# Componentwright — the UI component library

> Plan, not yet code. Written 2026-09-08 against `main` @ 0.10.0.

---

## 0. The decision that shapes everything else

The obvious reading of "build a component library" is: make a new package,
put 150 components in it. That is the wrong shape here, for one measurable
reason.

`@formwright/dom` already renders text, email, password, number, textarea,
select, radio, checkbox, toggle, color, range, date, time, datetime,
daterange, file, phone and accordion. `@formwright/grid-dom` already renders
a sortable, filterable, selectable table with cell renderers.
`@formwright/overlay-dom` already renders modals, drawers, sheets, popovers
and toasts with a focus trap, a scroll lock and drag-to-dismiss.

That is roughly thirty of the components on the list, already written,
already tested, already shipping. A new package that renders its own text
input has not added a text input to the world — it has added a _second_ one,
and now every bug gets fixed twice.

So the component library is not a sibling of the three engines. **It is the
layer underneath them**, and the engines get refactored to sit on it.

```
                    ┌──────────────────────────────────────┐
                    │  apps  (gms, retail, playground…)    │
                    └──────────────────────────────────────┘
   ┌─────────────┬─────────────┬──────────────┬────────────────────┐
   │ @fw/dom     │ @fw/grid-dom│ @fw/overlay- │ @fw/ui             │
   │ (forms)     │ (tables)    │ dom          │ (components,       │
   │             │             │              │  standalone)       │
   └─────────────┴─────────────┴──────────────┴────────────────────┘
   ┌──────────────────────────────────────────────────────────────┐
   │ @fw/ui-core — Scope, h, bindings, behaviours (headless)       │
   └──────────────────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────────────────┐
   │ @fw/reactive — signal / computed / effect / batch  (1.0 KB)   │
   └──────────────────────────────────────────────────────────────┘
```

The payoff is not tidiness. It is that a fix to the focus trap fixes it for
the modal, the dropdown, the command palette and the date picker at once,
and that the library's size stops being the sum of its components.

### The duplication this fixes, today

`Scope` and `h` — the disposal primitive and the element helper that the
whole "no memory leaks" story rests on — live in `packages/dom/src/internal.ts`.
`grid-dom` and `overlay-dom` depend on `@formwright/grid-core`,
`@formwright/overlay-core` and `@formwright/reactive`. **Neither depends on
`@formwright/dom`.** They cannot reach `Scope` without pulling in 20 KB of
form renderer, so each has its own private equivalents, and the focus trap
that overlay-dom wrote is invisible to everyone else who needs one.

Phase 0 below is entirely about undoing that, and it ships zero new
components.

---

## 1. Measured starting point

Gzipped, `dist/index.js`, as built on `main` today:

| Package                      |     raw |       gzip |
| ---------------------------- | ------: | ---------: |
| `@formwright/reactive`       |  3.5 KB | **1.0 KB** |
| `@formwright/schema`         |  5.1 KB |     1.6 KB |
| `@formwright/core`           | 49.0 KB |    12.2 KB |
| `@formwright/dom`            | 89.4 KB |    20.2 KB |
| `@formwright/grid-schema`    |  1.6 KB |     0.6 KB |
| `@formwright/grid-core`      | 21.9 KB |     6.3 KB |
| `@formwright/grid-dom`       | 31.4 KB |     7.5 KB |
| `@formwright/overlay-schema` |  8.0 KB |     2.0 KB |
| `@formwright/overlay-core`   | 10.4 KB |     3.5 KB |
| `@formwright/overlay-dom`    | 27.1 KB |     7.6 KB |
| `@formwright/ai`             |  0.3 KB |     0.2 KB |
| **total**                    |         | **~62 KB** |

Every package is `"sideEffects": false`, ESM + CJS, `dts: true`, built by
tsup with `treeshake: true`, **single entry** (`src/index.ts`). That last
detail is the one that has to change — see §4.

---

## 2. Audit: what the 150 actually is

The list has three kinds of entry on it, and they need different answers.

### 2a. Already built (~30) — expose, don't rewrite

These exist as _form-bound_ or _grid-bound_ renderers. The work is to lift
the rendering out of the field wrapper so it can also be constructed
standalone, then have the form path call the standalone one.

Input, Textarea, Password, Number, Email, Search, Phone, Currency, Date,
Time, DateTime, Date Range, File Upload, Color Picker, Slider, Range,
Checkbox, Radio, Radio Group, Switch, Select, Form Field, Label, Helper
Text, Validation Message, Accordion, Skeleton, Table, Data Table, Sortable
/ Filterable / Selectable Table, Modal, Alert Dialog, Drawer, Bottom Sheet,
Popover, Toast, Confirmation Dialog, Stepper (wizard), Tabs (wizard tabs).

### 2b. The same component listed more than once

The list has ~150 bullets and fewer than that many components:

- **Tooltip** — §4, §5, §6. One.
- **Command Palette** — §3, §6, §10, §13. One.
- **Date Range Picker** — §1, §9. **Avatar** — §4, §8. **Color Picker** —
  §1, §13. **Rating** — §11, §13. **Lightbox** — §6, §8. **Timezone
  Selector** — §9, §11. **Context Menu / Dropdown** — §3, §6.
- **Success / Error / Warning / Empty state** are `<Alert tone="…">` and
  `<EmptyState>`. Four bullets, one component and a prop — exactly the
  variants-not-components rule stated at the bottom of the brief.
- **Product / Customer / User / Organization / Status / Country / Language
  Selector** are `<Select>` with an async options source.
  `packages/dom/src/options-source.ts` already does async options. Seven
  bullets, zero components.
- **Primary/Secondary/Danger/Loading/Icon/Link/Copy/Download/Upload Button**
  → `<Button variant size loading icon>` plus two thin wrappers.

Deduped and folded into variants, the list is roughly **75 real
components**, of which ~30 already have working code. **The genuinely new
surface is about 45 components.** That is a quarter's work, not a year's.

### 2c. Doesn't belong in a zero-dependency library

Stated plainly now so it doesn't get litigated later:

| Asked for                                  | Why not here                                                       | Instead                                                               |
| ------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Rich Text / Markdown / Code Editor         | A serious editor is 100–300 KB and a multi-year project of its own | `@formwright/ui-editor` adapter over ProseMirror / CodeMirror, opt-in |
| Charts (13 of them)                        | A chart engine is a peer library, not a component                  | `@formwright/ui-charts`, separate package, separate budget            |
| Map, Location Picker, Address Autocomplete | Needs a tile/geocoding vendor                                      | Adapter + slot                                                        |
| PDF Viewer                                 | pdf.js is ~350 KB                                                  | Adapter                                                               |
| CAPTCHA wrapper                            | Vendor-specific by definition                                      | Slot on `<Field>`                                                     |
| Video / Audio Player                       | `<video controls>` is 0 KB and better                              | Thin styled wrapper only                                              |

Keeping these out is what makes the size budget in §5 achievable. Every one
of them is still _reachable_ through a slot — see §7.

---

## 3. The behaviours, which are the real Tier 1

The brief's Tier 1 is a list of components. But components are cheap once
the behaviour under them exists, and expensive when it doesn't. Five
behaviours unlock about forty components between them:

| Behaviour                                                                                                                        | Unlocks                                                                                                             | Budget |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -----: |
| **Anchor positioning** — place a floating element against a trigger, flip / shift / clamp to viewport, follow on scroll & resize | Popover, Tooltip, Dropdown Menu, Context Menu, Select, Combobox, Autocomplete, Date Picker, Mega Menu, Color Picker | 2.0 KB |
| **Collection** — roving tabindex, arrow/Home/End, typeahead, active-descendant                                                   | Menu, Listbox, Select, Multi Select, Combobox, Tabs, Radio Group, Command Palette, Tree View                        | 1.5 KB |
| **Selection model** — single / multiple / range, controlled or not                                                               | Checkbox Group, Multi Select, Table selection, Tags Input, Bulk Actions, Transfer                                   | 0.8 KB |
| **Disclosure** — open/close with animation-aware unmount                                                                         | Accordion, Collapsible, Tree View, Expandable rows, Sidebar groups                                                  | 0.5 KB |
| **Virtualiser** — windowed rendering over a scroll container                                                                     | Long List, Data Table, big Select, Command Palette, Tree                                                            | 1.5 KB |

Two more come free from packages that already have them, once §0's
extraction is done: **focus trap** (from `overlay-dom`) and **dismiss**
(escape / outside-press / route change — also `overlay-dom`).

**This is the correct build order.** Anchor positioning first, because ten
components are blocked on it and every one of them is on the brief's Tier 1
and Tier 2.

---

## 4. Package shape

Four new packages, mirroring the naming already established by
`overlay-{schema,core,dom}`:

### `@formwright/ui-core` — headless, ~5 KB gz budget

`Scope`, `h`, `bindText` / `bindClass` / `bindHidden` / `bindDisabled` /
`on`, plus the behaviours in §3 and the style-injection helper. No
appearance, no component markup. **Moved here, not copied**: `Scope` and `h`
leave `packages/dom/src/internal.ts`, the focus trap leaves
`packages/overlay-dom/src/focus-trap.ts`, and all four DOM packages import
from one place.

`@formwright/dom` keeps re-exporting `Scope` and `h` so nothing downstream
breaks.

### `@formwright/ui-schema` — ~2 KB gz

Component schema types plus a dependency-free validator, the same shape as
`overlay-schema/src/validate.ts`. A component node is:

```ts
{ type: "button", props: { variant: "primary", size: "sm" },
  slots: { leading: {…} | HTMLElement }, children: [ … ] }
```

Serializable, so an LLM can write a whole screen the way it can already
write a form.

### `@formwright/ui` — the renderer, **multi-entry**

The single most important build decision in this document.

Today every package is `entry: ["src/index.ts"]`. For 150 components, one
entry means one JS file and one CSS blob, and tree-shaking is the only thing
standing between a consumer and the whole library. Instead:

```ts
// packages/ui/tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts", "src/components/*/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  treeshake: true,
  splitting: true,
});
```

```jsonc
"exports": {
  ".":        { "types": "./dist/index.d.ts",  "import": "./dist/index.js" },
  "./button": { "types": "./dist/button.d.ts", "import": "./dist/button.js" },
  "./select": { … }
}
```

`import { Button } from "@formwright/ui/button"` then costs one file plus
`ui-core`, regardless of how many components the package contains. The
barrel stays for convenience and for people who bundle anyway.

### `@formwright/ui-charts`, `@formwright/ui-editor` — later, separate, optional

So their weight can never leak into anyone who doesn't import them.

---

## 5. The three contracts

The brief asks for low size, zero memory leaks and slots. Each becomes a
rule the CI can fail on, not an intention.

### 5a. Size — a budget per entry point

`scripts/size-budget.ts` builds, gzips every entry, and compares against a
checked-in `size-budget.json`. Over budget fails the build; under budget by
more than 10% updates the file and tells you.

| Entry                                                         | Budget (gz) |
| ------------------------------------------------------------- | ----------: |
| `@formwright/ui-core`                                         |      5.0 KB |
| any layout primitive (Box, Stack, Grid, Divider…)             |      0.3 KB |
| any simple component (Button, Badge, Avatar, Spinner…)        |      1.0 KB |
| any composite (Select, Tabs, Pagination, Card…)               |      2.5 KB |
| any complex (Data Table, Date Range Picker, Command Palette…) |      5.0 KB |
| `@formwright/ui` barrel, everything                           |   **45 KB** |
| a realistic app slice — button, input, select, modal, table   |   **12 KB** |

For scale: the whole existing 11-package suite is 62 KB gz. Adding a
complete component library for another 45 KB, of which a typical app pays
12, is the target to hold.

### 5b. Memory leaks — made testable

The mechanism already exists — `Scope` collects disposers and tears them
down in reverse. What's missing is enforcement. Four rules:

1. **Every constructor returns `{ el, dispose }`.** Never a bare
   `HTMLElement`. A component that cannot be disposed is a leak with a
   delay.
2. **Nothing subscribes outside a `Scope`.** No `addEventListener`, no
   `effect`, no observer, no timer, without `scope.add(…)`.
3. **Observers are pooled.** One shared `ResizeObserver` and one shared
   `IntersectionObserver` in `ui-core`, keyed by a `WeakMap`, so a
   200-row table has one observer and not two hundred.
4. **Element-keyed state is `WeakMap` only.** A module-level
   `Map<Element, …>` is a leak by construction, and is banned by lint.

And a harness — `packages/ui-core/src/leak.test.ts` — that every component
runs through:

```
mount → interact → dispose → assert:
  · addEventListener count returned to baseline (patched counter)
  · reactive graph has no live effects for this scope
  · shared observers unobserved the node
  · no timers pending
  · node is detached and, after gc(), collected (FinalizationRegistry,
    node --expose-gc in the CI job)
```

One parameterised test over the component registry, so a new component is
covered the day it lands.

### 5c. Slots — two kinds, both first-class

`overlay-schema` already proves the pattern: a `{ type: "slot", name }`
block in the schema, a real DOM node handed in at mount:

```ts
overlay.open(schema, { slots: { content: myNode } });
```

Generalise it to every component:

- **Schema slots** — a nested component schema. Stays serializable, stays
  LLM-writable, stays exportable.
- **Host slots** — a real node (or a `mount(el)` callback) handed in at
  construction. The escape hatch that lets a React app, a Vue app, or a
  chart library live inside a Formwright component.

Every component declares its named slots in its own types, so they're
discoverable and typed:

| Component | Slots                                                                  |
| --------- | ---------------------------------------------------------------------- |
| Button    | `leading`, `trailing`                                                  |
| Field     | `label`, `help`, `error`, `prefix`, `suffix`                           |
| Card      | `header`, `media`, `body`, `footer`, `actions`                         |
| Table     | `toolbar`, `empty`, `header:<col>`, `cell:<col>`, `expanded`, `footer` |
| Select    | `trigger`, `option`, `empty`, `footer`                                 |
| Modal     | `header`, `body`, `footer`                                             |

`cell:<col>` matters more than it looks — it is what makes the table usable
without the library having to guess every cell type anyone will ever need.

---

## 6. Build order

### Phase 0 — extraction (no new components)

Create `ui-core`. Move `Scope`, `h` and the bindings out of
`dom/src/internal.ts`; move the focus trap, dismiss handling and scroll lock
out of `overlay-dom`. Repoint `dom`, `grid-dom` and `overlay-dom` at them.
Land the size-budget script and the leak harness against the _existing_
packages first, so the tooling is proven before anything depends on it.

Expected outcome: no API change, no new features, and a small net **decrease**
in total size from de-duplication. If the numbers don't move, the tooling is
wrong and it's better to find that out now.

> **Done — and the size prediction was wrong.** Measured: 61.25 KB before,
> **61.99 KB after (+0.74 KB)**. `dom` fell 19.73 → 19.48 and `overlay-dom`
> fell 7.45 → 6.23, but `ui-core` costs 2.21 on its own. Extracted code
> stops compressing against a large bundle and pays for its own module
> wrapper and export surface. With two consumers that does not pay for
> itself; the crossover is the third and fourth (`grid-dom`, then `ui`),
> which is where the de-duplication argument actually cashes in. The
> refactor still stands on its own merits — one focus trap, one Scope, one
> place to fix a bug — but "Phase 0 shrinks the bundle" was optimistic and
> the number is now checked in so the claim can't drift again.

> **`grid-dom` converted — and the crossover prediction was wrong too.**
> 7.33 → 7.32 KB. No saving, because the duplication I assumed was not
> there: `grid-dom` never reimplemented `Scope`, it threaded a bare
> `Dispose[]` through every function, which is a few bytes of inline code
> with nothing to hoist. The bytes only come back when many consumers
> share something _substantial_ — a focus trap, an anchor positioner —
> which is Phase 1, not Phase 0. Phase 0 should be argued on correctness,
> and the honest total for it is **+0.74 KB**.
>
> What the conversion did buy is real, just not size. Disposal now runs in
> reverse order rather than forward, so a binding always dies before what
> it was bound to. And the late-add rule caught a live bug the moment it
> was applied: `rowScope` was reused across every page, sort and filter,
> and because a Scope's dispose is final, every binding registered after
> the first teardown was undone the instant it was created — rows rendered
> empty with nothing failing loudly. The array it replaced had been
> silently tolerating that pattern. Each generation of rows now gets its
> own scope, and five leak tests hold the line across paging, sorting and
> the virtual renderer.

### Phase 1 — behaviours

The five in §3, anchor positioning first. Each with its own tests and its
own leak test. Still no components.

### Phase 2 — primitives

Layout (Box, Stack, Flex, Grid, Container, Divider, Spacer, AspectRatio,
ScrollArea) — nearly all CSS, nearly no JS. Then Button, Icon, Icon Button,
Button Group, Input, Textarea, Label, Field, Badge, Tag, Avatar, Spinner,
Progress, Skeleton, Alert, Empty State.

At this point `@formwright/dom` gets refactored to render _these_ for its
form fields instead of its own markup. That refactor is the proof the
architecture works — and it is the moment the total size should drop again.

### Phase 3 — the components the behaviours make cheap

Tooltip, Popover, Dropdown Menu, Context Menu, Select, Multi Select,
Combobox, Autocomplete, Tags Input, Tabs, Accordion, Breadcrumbs,
Pagination, Stepper, Menu, Command Palette, Card, Stat Card, List, Timeline,
Tree View, Avatar Group, Description List, Toast, Banner, Status Indicator,
Rating, Copy Button, Countdown, QR Code, Segmented Control.

### Phase 4 — the heavy ones, each judged on its own

Date Picker family (Calendar, Date, Time, Range, Month, Year), File Manager,
Drag & Drop + Sortable List, Kanban, Filter / Query Builder, Resizable
Panels, Split Pane, Carousel, Image Gallery, Lightbox, Signature Pad,
Emoji Picker, Mention Input.

Each ships as its own subpath and has to justify its budget line.

### Phase 5 — adapters

`ui-charts`, `ui-editor`, map and PDF adapters. Separate packages,
separately versioned, never in the barrel.

---

## 7. The demo, built on our own engines

The docs site is the argument. If a component library's own documentation is
built with React and Tailwind, nobody believes the library. So:

**The component index is a Gridwright table.** Every component is a row:
name, category, gzipped size, phase, slots, "already existed / new". Sort by
size. Filter by category. It is the §2 audit, live, and it doubles as the
size dashboard from §5a because the numbers come out of `size-budget.json`.

**Each component page's prop playground is a Formwright form.** The
component's own schema types generate a form schema; that form drives the
live component next to it; the JSON updates as you type. Change `variant` in
the form, the button changes. This is the demo that no other component
library can copy, because it requires a form engine that renders from a
schema — which is the whole point of the suite.

**A "kitchen sink" page** that mounts every component at once, then a button
that disposes all of them and prints the leak-harness assertions in the
page. The memory-leak claim, visible.

Site lives at `apps/playground/components.html` alongside `grid.html` and
`forge.html`, deployed to the same GitHub Pages site as the rest.

---

## 8. Naming

`overlay-*` became "Overlaywright" in its package descriptions. Consistent
options for this one: **Componentwright** (matches, mouthful), **UIwright**,
or just `@formwright/ui` with no separate brand. Recommendation: no separate
brand — this is the foundation of the suite, not another engine beside it,
and giving it its own name works against the §0 argument.

---

## 9. Open questions — worth answering before Phase 0

1. **Does `@formwright/dom` refactor onto `ui` primitives, or only onto
   `ui-core`?** Full refactor is the honest version and removes the
   duplicate markup, but it touches every existing form snapshot test.
   Recommendation: `ui-core` in Phase 0 (safe, no visual change), primitives
   in Phase 2 behind the existing test suite.
2. **CSS delivery.** One stylesheet per component, injected on first
   construction and deduped by id (pay per component), versus one sheet per
   package. Recommendation: per component, all selectors wrapped in
   `:where()` so specificity is zero and an app's own CSS always wins
   without `!important`.
3. **Web Components?** The suite already mentions them. A custom-element
   wrapper per component is a thin, separate entry (`@formwright/ui/wc`) and
   should not be in the core path.
4. **Does the grid's cell renderer become the generic slot mechanism**, or
   do they stay parallel? They should converge, but that's a breaking change
   to `grid-dom` and belongs in a 1.0.
5. **Icons.** 150 components will want icons and the library has none. An
   icon _component_ (0 deps, takes a path or a slot) yes; an icon _set_, no.

---

## 10. First commit

Phase 0, in this order, so each step is independently revertable:

1. `scripts/size-budget.ts` + `size-budget.json` from today's measured
   numbers, wired into CI.
2. `packages/ui-core` with `Scope`, `h`, bindings — moved out of
   `dom/src/internal.ts`, re-exported from there.
3. `leak.test.ts` harness, run against `overlay-dom` first because it is the
   package with the most listeners and observers to get wrong.

   > **Done.** It earned its keep immediately, though not the way expected —
   > three of the first five failures were the _harness_ being wrong, not
   > the code:
   >
   > - jsdom attaches a capturing `mouseover`/`mouseout` pair to `document`
   >   per stylesheet, so any component injecting styles looked like it
   >   leaked a pair. Filtered by shape, not by ignoring `document`.
   > - jsdom implements `requestAnimationFrame` on top of `setInterval`, so
   >   asking for one frame looked like opening an interval that never
   >   closes. Suppressed for the duration of the rAF shim.
   > - A listener on a node that has left the document was counted. It dies
   >   with the node; demanding `removeEventListener` for every child of a
   >   discarded subtree is busywork, and a harness that asks for it gets
   >   switched off. Now only `document`, `window` and still-connected
   >   nodes count.
   >
   > That last one drove the central rule: **anything that resolves itself
   > is a warning, anything that persists is a failure.** Pending timeouts
   > and animation frames fire once and are gone — a dispose that schedules
   > a final cleanup tick is correct, common, and not a leak. An interval
   > is not: nothing stops it. So `clean` covers listeners, observers and
   > intervals; timers and frames need `assertClean(msg, { strict: true })`.
   >
   > Known blind spot: `window`-level listeners are caught in a browser but
   > not under vitest's jsdom, which hands tests a proxied window whose own
   > methods cannot be replaced. Documented in the harness.
   >
   > With those corrected, `overlay-dom` came out clean across all seven
   > cases, including host-disposal-mid-dialog and a three-deep stack.

4. Focus trap, dismiss and scroll lock moved from `overlay-dom` to
   `ui-core`; `overlay-dom` imports them back.
5. Confirm total gzipped size went **down**. Publish as 0.11.0.

Nothing in that list is a component, and that is the point.
