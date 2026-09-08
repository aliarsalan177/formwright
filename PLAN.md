# Formwright — LLM Schema-Driven Form Engine

> A framework-agnostic, signal-reactive library that turns a JSON/LLM-generated schema
> into real, surgically-updating DOM — and can generate real-world source code from the
> same schema. Define a form once, inject it anywhere: `new Form(schema, initialValue)`.

---

## ✅ Implementation Status (as of 2026-06-15)

**Published to npm:** `@formwright/schema`, `@formwright/core`, `@formwright/dom` @ **0.1.0**
(0.2.x feature release queued via changeset — includes wizard UX, `@formwright/grid-*` rename).
Full runtime is **~12 KB gzipped, zero deps**.
**150 unit tests** pass (schema 12, core 58, dom 23, ai 5, reactive 12, grid-core 26,
grid-schema 4, grid-dom 10); format / typecheck / build all green.

### Done

- **Monorepo** — pnpm + Turborepo + tsup + vitest + changesets; CI, release (npm provenance), and
  GitHub Pages deploy workflows. **Husky + lint-staged** pre-commit (hardened to never block when
  node isn't on PATH, e.g. GitHub Desktop). Published 0.1.0 to npm.
- **`@formwright/schema`** — types + dependency-free, path-addressed validator. Extended well beyond
  the original plan (see field types below).
- **`@formwright/core`** — custom zero-dep signal engine (`signal`/`computed`/`effect`/`batch`),
  `Form` class, nested **node tree** (groups, collections, **steps**), JSONLogic **condition engine** with
  lexical scope resolution, validation bridge, provider registry, submission pipeline, **runtime
  schema patching**, **form caching** (`persistKey` + resume banner + step restore), and **step
  navigation** (`StepsNode.next/prev/goTo`, per-step validation, full validation on submit,
  **`step` events**, **success-screen state**).
- **`@formwright/dom`** — surgical renderer + **widget adapter system** (declarative tag / mount),
  including a **multi-step wizard UI** (progress bar / tabs / numbers / **fill** % bar, Back/Next/Submit
  nav, **resume-draft banner**, **URL step sync**, **built-in or custom success screen**).
- **`@formwright/ai`** — any-language prompt → validated schema, **provider-agnostic** (Claude
  default + OpenAI/GPT + custom), with a validate→repair loop.
- **Playground** — live schema editor (`index.html`) with wizard UX demos,
  **Forge**, **Theme Builder**, **Settings Builder**, and **Gridwright** (`grid.html`).
- **Storybook** (`apps/storybook`) — interactive catalog of forms, grid demos, and app embeds
  (`pnpm storybook` on port 6006).
- **Forge (visual form builder)** — palette of field types → drag onto a canvas → reorder
  (native DnD), toggle **½-width** for side-by-side, edit each field in an **inspector** (label,
  placeholder, description, required, width, options, id). A **live preview** renders through the
  real `@formwright/dom` runtime (identical output) and **Export schema** copies the exact JSON.
- **Settings Builder** — sidebar → drill-down sub-sections (General → About → Legal; Date & Time)
  with an **iOS-style nav bar** (leading Back, centered title), an **Instant / Save** segmented
  control (apply each change immediately vs. buffer until **Save all**), per-field PATCH log, and a
  complete-payload view.

### Implemented features (cumulative)

- **Field types**: text, email, password, number, textarea, select, radio, checkbox, **toggle**,
  **color** (swatch + hex), **range** (slider + live value bubble; `props.min/max/step/unit`),
  **date / time / datetime / daterange** (with or without time), **file** (drag-drop,
  multi/single, accept, thumbnails), **group** (object), **collection** (array, add/remove,
  min/max), **steps** / **step** (multi-step wizard — one step visible at a time, per-step
  validation, nested payload), **heading / separator / paragraph** (presentational), plus any
  custom type / widget.
- **Conditions**: `visibleWhen` / `enabledWhen` / `requiredWhen`, lexical scope (sibling → outward).
  Hidden fields fully hide (inline `display` beats CSS) and drop from the payload.
- **Validation**: declarative rules + formats, **real-time field-by-field**, **per-rule message
  overrides** (`validation.messages`).
- **Runtime patching**: `form.setFieldSchema(id, partial)` / `form.patch(...)` re-render in place.
- **Payload**: nested; hidden, `omit`, and presentational fields excluded; `localized` fields →
  `{ en, ar }` with a single input + in-input language switcher, `defaultLocale`, RTL/LTR.
- **Submission**: `validate → transform → send → onSuccess/onError`; inline `submit(transform)`;
  **`submit()` resolves with `{ ok, data | error, errors }`** (never throws); configurable
  **submit/reset/delete action buttons** (start/end/between, full-width, responsive); closable
  top-of-form **error alert**.
- **Authoring / layout**: **required marker** (`*`) next to label; **`colSpan`** side-by-side
  fields over a 12-col grid; `description` + `descriptionPosition`; **`labelPosition: "start"`**
  iPad-row layout; **input `slots`** (`fw-slot-start` / `fw-slot-end`, rendered inside the input);
  **tooltips**; static heading / separator / paragraph.
- **a11y**: globally-unique `domId` per field (no duplicate ids), correct `label[for]`, and
  **`autocomplete`** (per-field or type-default).
- **Bring-your-own UI**: map a field to a custom element (`widget: { tag }`), a registered widget,
  or a **React/Vue/any-framework** component via `mount`; `toValue`/`fromValue` transformers.
- **Styling**: unstyled with stable hooks; per-part `class` / `classes` overrides (**Tailwind-ready**).
- **Caching**: `persistKey` restores entered values **and active step** on refresh (normal forms and
  wizards). `persist.mode: "consent"` asks before writing to storage; `"auto"` saves on every change.
  Optional **resume-draft banner** (`persist` schema copy); cleared on successful submit or **Start over**
  (`form.discardDraft()`).
- **Multi-step forms**: `steps` container with `step` children — progress indicator
  (`layout: "bar" | "tabs" | "numbers" | "fill"`), Back/Next/Submit navigation, validate current step
  on Next (`validateOnNext`, default true), validate all steps on Submit; imperative API via
  `form.findSteps()` → `.next()` / `.prev()` / `.goTo(i)` / `.goToId(id)` / `.validateStep()`;
  **`urlSync`** keeps the active step in the browser URL (`/apply/step/:step`); **`success`** schema
  shows a post-submit screen with `{{response}}` placeholders; override via `options.dom.renderSuccess`.

### Deviations from the original plan

- Reactivity: shipped a **custom zero-dep engine** instead of vendoring `alien-signals`
  (the facade is still swappable). `alien-signals` dependency removed.
- Validation: built-in validators only so far; the **Standard Schema / Valibot** bridge is not wired.

### Not done yet (roadmap)

- **Promote Forge to a package** — Forge currently lives as a playground page (`forge.html`). Next:
  extract it into a publishable `@formwright/builder` package, and grow it with field-type
  switching in the inspector, nested group/collection/**steps** building, validation-rule editing,
  and an import-existing-schema flow. The same engine would back the theme/settings builders.
- `@formwright/wc` (web component), `@formwright/react` / `/vue` adapters, `@formwright/codegen`,
  `@formwright/cli`, first-party `@formwright/providers` (i18n / TanStack Query).
- Standard Schema / Valibot validation bridge.
- **Skeleton loaders & step transitions** — see [SKELETON_PLAN.md](SKELETON_PLAN.md).

---

## 0. Repo Name Recommendation

**Primary: `formwright`** — evokes craftsmanship (cf. `playwright`, `shipwright`), short, npm-available-sounding, brandable.

Alternates:
| Name | Vibe | Notes |
|------|------|-------|
| `signalform` | technical | foregrounds the reactivity model |
| `schemaforge` | tooling | foregrounds codegen |
| `morphform` | dynamic | foregrounds conditional/dynamic rendering |
| `formsmith` | craft | similar feel to `formwright` |

npm scope suggestion: **`@formwright/core`**, `@formwright/codegen`, `@formwright/react`, etc.
GitHub: `formwright/formwright` (org) or `<you>/formwright`.

---

## 1. Vision

Most form libraries (`react-hook-form`, `formik`, `tanstack-form`) are **bound to one framework** and assume you _write the form in JSX_. We invert that:

1. **Schema is the source of truth.** A plain-data schema (hand-written or LLM-generated) describes fields, validation, layout, conditions, data sources, and submission.
2. **The runtime is framework-agnostic.** A signal-reactive core renders directly to the DOM with no virtual DOM and no full re-render — only the exact text node / attribute that changed updates.
3. **It works everywhere.** Vanilla JS, React, Vue, Svelte, Angular, Solid, web components, mobile webviews — via a Web Components interop boundary plus thin per-framework adapters.
4. **It generates code.** The same schema can be _compiled_ to idiomatic source (React + RHF, Vue, Angular, HTML, etc.) for teams that want to eject.
5. **Class-based, imperative-friendly.** `const form = new Form(schema, initialValue); form.mount(el);` — injectable into any window/DOM node, with lifecycle, transforms, and typed submission.

### Why this is hard-to-copy / differentiated

- LLM-native schema (designed to be emitted by a model, validated, and self-healing).
- Provider injection (i18n, data-fetching, theming) declared _in schema_, resolved at runtime.
- Conditional rendering expressed _in schema_ (not in code), evaluated reactively.
- Both a **runtime renderer** AND a **codegen compiler** from one schema.

---

## 2. Technology Choices (and why)

### 2.1 Reactivity core — **alien-signals** (or a vendored equivalent)

- Fine-grained, **push-pull** reactivity. The exact primitive now used inside **Vue's core / Vapor mode**; extremely fast; most engineers have never heard of it.
- No virtual DOM, no diffing. A `signal` change notifies only the effects that read it → only those DOM bindings re-run.
- Framework-agnostic: it's just `signal()`, `computed()`, `effect()`. We build our DOM bindings on top.
- Alternatives considered: `@preact/signals-core` (good, slightly heavier graph), SolidJS reactivity (great but couples us to Solid's compiler), Svelte 5 runes (compiler-bound). **alien-signals wins** for a standalone runtime library: zero-dep, tiny, fastest published benchmarks.

### 2.2 Rendering — direct DOM bindings (Solid/Lit-style), **no VDOM**

- Each field is rendered once to real DOM nodes. Reactive `effect()`s bind a signal to a specific `textNode.data`, `input.value`, `el.hidden`, `el.classList`, etc.
- For templates we use **cloneable `<template>` elements** + targeted binding (the technique behind Solid's `dom-expressions` and Lit) — clone is O(1), updates are surgical.
- Result: changing one field's value updates _only_ that field's bound nodes. No tree re-render. This is the "surgical update" the user asked for.

### 2.3 Universal interop — **Web Components (Custom Elements)**

- A `<formwright-form>` custom element wraps a `Form` instance so it drops into **any** framework or plain HTML ("support all JavaScript native apps and others").
- Thin adapters (`@formwright/react`, `/vue`, `/svelte`, `/angular`, `/solid`) give idiomatic ergonomics + typing on top of the same core.

### 2.4 Schema + validation — **Standard Schema** + **Valibot** (default), pluggable to Zod

- Adopt the **Standard Schema** spec so users bring Zod / Valibot / ArkType for field validation.
- Default bundled validator: **Valibot** (tree-shakeable, tiny) for zero-config.

### 2.5 Tooling

- **Language:** TypeScript (strict), ESM-first, with CJS fallback via build.
- **Build:** `tsup` (per-package) or `unbuild`; **monorepo** via `pnpm` workspaces + **Turborepo**.
- **Test:** `vitest` + `@testing-library/dom` + Playwright (browser/e2e + codegen output verification).
- **Codegen AST:** `ts-morph` / `@babel/generator` + `prettier` for emitting formatted real code.
- **Docs:** `vitepress` or `astro` + `starlight`; interactive playground via `vite`.
- **Release:** `changesets` (versioning + changelog + npm publish), CI on GitHub Actions.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SCHEMA (JSON)                          │
│   fields · layout · conditions · providers · validation ·    │
│   submission(transform/onSuccess/onError)                     │
└───────────────┬─────────────────────────────┬────────────────┘
                │                              │
        ┌───────▼────────┐            ┌────────▼─────────┐
        │  RUNTIME (Form) │            │  CODEGEN          │
        │  signal core    │            │  schema → AST →   │
        │  surgical DOM   │            │  formatted source │
        └───────┬────────┘            └────────┬─────────┘
                │                              │
   ┌────────────┼───────────────┐     React / Vue / Angular /
   │            │               │     HTML / Solid output files
Web Component  React adapter   Vue adapter ...
```

### 3.1 Packages (monorepo)

| Package                                         | Responsibility                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@formwright/core`                              | signal reactivity wrappers, `Form` class, field model, condition engine, provider registry, validation bridge |
| `@formwright/dom`                               | direct-DOM renderer (template clone + reactive bindings), default field widgets                               |
| `@formwright/wc`                                | `<formwright-form>` custom element wrapper                                                                    |
| `@formwright/react`                             | `<Form>` component + `useForm` hook over core                                                                 |
| `@formwright/vue` `/svelte` `/angular` `/solid` | framework adapters                                                                                            |
| `@formwright/codegen`                           | schema → source compiler, per-target emitters                                                                 |
| `@formwright/schema`                            | schema types, JSON Schema, runtime schema validator, LLM helpers                                              |
| `@formwright/providers`                         | first-party providers: i18n, tanstack-query, theme                                                            |
| `@formwright/cli`                               | `formwright generate`, `formwright validate`, scaffolding                                                     |
| `playground` / `docs`                           | not published                                                                                                 |

---

## 4. The Schema (DSL)

A field is resolved **by `id`/`name`** to a widget. Conditions, providers, and data sources are declared in-schema.

```jsonc
{
  "id": "signup",
  "version": "1.0",
  "providers": {
    "i18n": { "type": "i18n", "namespace": "signup" },
    "query": { "type": "tanstack-query" },
  },
  "fields": [
    {
      "id": "email",
      "type": "text",
      "label": { "$t": "fields.email" }, // i18n provider resolves
      "validation": { "kind": "string", "format": "email", "required": true },
    },
    {
      "id": "country",
      "type": "select",
      "label": { "$t": "fields.country" },
      "options": { "$query": "countries" }, // data provider resolves async
    },
    {
      "id": "state",
      "type": "select",
      "options": { "$query": ["states", { "country": "{{country}}" }] },
      "visibleWhen": { "==": [{ "var": "country" }, "US"] }, // condition engine
    },
  ],
  "submit": {
    "transform": "buildPayload", // named transform from registry
    "endpoint": { "method": "POST", "url": "/api/signup" },
    "onSuccess": "redirectHome",
    "onError": "mapServerErrors",
  },
}
```

### 4.1 Condition engine

- Conditions are **data** (JSONLogic-style: `==`, `>`, `in`, `and`, `or`, `var`).
- Compiled once into a `computed()` over the relevant field signals → re-evaluates only when those fields change → toggles `hidden`/mount surgically.
- Supports: `visibleWhen`, `enabledWhen`, `requiredWhen`, dynamic `options`, computed default values.

### 4.2 Provider system

- A **provider registry** maps a declared provider (`i18n`, `tanstack-query`, `theme`, custom) to a runtime implementation injected by the host app.
- Schema references providers via sigils: `{ "$t": "key" }`, `{ "$query": [...] }`, `{ "$theme": "..." }`.
- Providers expose **signals**, so when i18n locale changes or a query resolves, only bound nodes update.
- Users register their own: `Form.registerProvider("stripe", myStripeProvider)`.

### 4.3 Multi-step wizards (implemented)

- A **`steps`** container holds **`step`** children (each step is a nested object, like `group`).
- The DOM renderer shows **one step at a time** with a progress indicator (`layout: "bar" | "tabs" |
"numbers" | "fill"`) and **Back / Next / Submit** navigation (replaces root `actions` when a
  top-level `steps` field is present).
- **Next** validates the current step only (`validateOnNext`, default true); **Submit** validates all steps.
- Imperative API: `form.findSteps()?.next()`, `.prev()`, `.goTo(i)`, `.goToId(id)`, `.validateStep()`.
- **`form.on("step", ({ index, id }) => …)`** fires when the active step changes.
- Payload is nested by step id: `{ wizard: { personal: {…}, account: {…} } }`.
- **`urlSync`**: pattern like `/apply/step/:step` syncs step ↔ URL via `history.replaceState` and
  `popstate` (`urlSyncBy: "id"` default, or `"index"`).
- **`persist` + `persistKey`**: restore draft values and step; **`mode: "consent"`** shows an opt-in
  banner before saving (`form.grantPersistConsent()` / `declinePersistConsent()`); **`mode: "auto"`**
  saves on every change. On restore, show a **resume banner** with Continue / Start over
  (`form.dismissResumeBanner()`, `form.discardDraft()`).
- **`success`**: built-in post-submit screen — `heading`, `message`, `details[]` support `{{key}}`
  placeholders from the submit response; optional `actions` (e.g. `handler: "closeSuccess"`).
  Replace entirely with `options.dom.renderSuccess(ctx, host)` (`ctx.interpolate`, `ctx.dismiss()`).
- `@formwright/ai` system prompt includes `steps`/`step` so LLMs can emit wizard schemas.

---

## 5. Class-Based API

```ts
import { Form } from "@formwright/core";
import schema from "./signup.schema.json";

const form = new Form(
  schema,
  { email: "" },
  {
    providers: { i18n: myI18n, query: myQueryClient },
    transforms: { buildPayload: (data) => ({ ...data, source: "web" }) },
    handlers: {
      redirectHome: () => location.assign("/"),
      mapServerErrors: (err, form) => form.setErrors(err.fields),
    },
  },
);

form.mount(document.getElementById("root")!); // injectable into any DOM node / window

// Imperative surface
form.values; // reactive snapshot (signals under the hood)
form.setValue("email", "a@b.com");
form.errors; // validation + server errors
form.isValid;
form.isDirty;
form.isSubmitting; // computed signals
form.on("submit", (payload) => {});
await form.submit(); // validate → transform → endpoint → onSuccess/onError
form.reset();
form.destroy();
```

- The `Form` class owns: the field-signal graph, validation, condition engine, provider wiring, and submission pipeline.
- `mount(el)` renders via `@formwright/dom`; the class itself is **render-agnostic** so the same instance can drive a web component or a framework adapter.
- **Submission pipeline:** `validate → transform(payload) → send → onSuccess(result) | onError(err)`. Each stage is overridable and schema-declared by name (so it's serializable / LLM-emittable).

---

## 6. Codegen (schema → real-world code)

`@formwright/codegen` walks the schema and emits **idiomatic source** per target via an AST + `prettier`:

```
formwright generate signup.schema.json --target react-rhf --out ./src/forms/Signup.tsx
formwright generate signup.schema.json --target vue        --out ./Signup.vue
formwright generate signup.schema.json --target html       --out ./signup.html
```

- Targets v1: **React + react-hook-form**, **Vue 3**, **plain HTML + vanilla JS**.
- Targets v2: Angular, Solid, Svelte, React Native.
- Each target is a pluggable **emitter** (community-contributable). Output is formatted, typed, and runnable without the runtime — i.e. true "eject."
- Codegen and runtime share the same schema validator, so what renders == what generates.

---

## 7. Roadmap (Phases)

### Phase 0 — Foundations (weeks 1–2)

- Monorepo scaffold (pnpm + Turborepo + tsup + vitest + changesets + CI).
- Schema types + JSON Schema + runtime validator (`@formwright/schema`).
- Decide & vendor reactivity (`alien-signals`); wrap `signal/computed/effect` in `@formwright/core`.
- **Exit:** schema validates; reactive core unit-tested.

### Phase 1 — Runtime MVP (weeks 3–6)

- `Form` class: field signals, values/errors/dirty/valid, `mount/destroy`.
- `@formwright/dom` renderer: template-clone + surgical bindings; core widgets (text, number, select, checkbox, radio, textarea).
- Validation bridge (Valibot default + Standard Schema).
- **Exit:** render a real form from schema; typing a field updates only that field's nodes (prove with DOM-mutation tests).

### Phase 2 — Conditions, Providers, Submission (weeks 7–10)

- JSONLogic condition engine → reactive `visibleWhen/enabledWhen/requiredWhen`, dynamic options/defaults.
- Provider registry + first-party `i18n` and `tanstack-query` providers.
- Submission pipeline (transform → endpoint → onSuccess/onError), server-error mapping.
- **Exit:** the §4 example schema runs end-to-end with async options + i18n + conditional fields.

### Phase 3 — Universal interop (weeks 11–13)

- `@formwright/wc` custom element.
- `@formwright/react` + `@formwright/vue` adapters; SSR/hydration story.
- **Exit:** same schema mounts in vanilla HTML, React, and Vue from one codebase.

### Phase 4 — Codegen (weeks 14–17)

- `@formwright/codegen` + emitters: react-rhf, vue, html. `@formwright/cli`.
- Snapshot + Playwright tests that _run_ generated output.
- **Exit:** `formwright generate` produces runnable, formatted source for 3 targets.

### Phase 5 — LLM-native layer (weeks 18–20)

- Schema authoring helpers: JSON Schema for model function-calling, repair/normalize pass, examples + system-prompt kit.
- Optional `@formwright/ai` to call a model (Claude via the Anthropic SDK) → validated schema.
- **Exit:** "describe a form in English → valid schema → rendered + codegen."

### Phase 6 — DX, docs, 1.0 (weeks 21–24)

- Interactive playground, docs site, theming/widgets API, a11y audit, perf benchmarks vs RHF/Formik/TanStack Form.
- Stabilize public API, semver 1.0, publish.

---

## 8. Contribution Model (how others contribute)

- **License:** MIT (max adoption).
- **Monorepo + Changesets:** every PR that changes a published package adds a changeset; release notes + versions are automated.
- **Extension points designed for contribution:**
  - **Widgets** — register a field `type` → renderer (`registerWidget`).
  - **Providers** — register an external integration (`registerProvider`).
  - **Codegen emitters** — add a `--target` by implementing an emitter interface.
  - **Validators** — anything Standard-Schema-compatible.
- **Governance/process:**
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, `good-first-issue` labels.
  - Conventional Commits; required CI (lint, typecheck, unit, e2e, codegen-run); Renovate for deps.
  - **RFC process** (`/rfcs` folder + discussion) for schema-format changes (the schema is the contract — version it: `version` field + migration codemods).
  - ADRs in `/docs/adr` for architectural decisions.
- **Plugin packages:** allow `formwright-plugin-*` community packages discoverable via a registry/keyword convention.

---

## 9. NPM Release & Distribution

- **Publishing:** GitHub Actions → on merge to `main`, `changeset version` opens a Release PR; merging it runs `changeset publish` to npm with provenance (`npm publish --provenance`).
- **Package hygiene per package:**
  - ESM + CJS + `types`; correct `exports` map; `sideEffects: false` for tree-shaking; `files` whitelist; `engines`.
  - Subpath exports (`@formwright/core`, `@formwright/core/dom`) so apps pull only what they use.
  - Zero/minimal runtime deps in `@formwright/core` (bundle alien-signals or keep it the only dep).
- **Versioning:** independent or fixed-lockstep versions across packages (start fixed for simplicity).
- **Quality gates:** `publint` + `arethetypeswrong` in CI; bundle-size budget check (`size-limit`).
- **CDN:** ESM build works via `unpkg`/`esm.sh` so plain HTML apps can `import` with no build step.
- **"All JS native apps":** core has no DOM dependency in its logic layer → usable in Node, workers, React Native (with an RN renderer adapter), and the WC build covers all browser hosts.

---

## 10. Risks & Mitigations

| Risk                                   | Mitigation                                                                |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Reactivity lib (`alien-signals`) churn | Wrap behind `@formwright/core` reactivity facade; swappable.              |
| Schema becomes a sprawling spec        | Version it; RFCs for changes; JSON Schema + tests as the contract.        |
| Codegen output drift vs runtime        | Single shared schema validator; Playwright runs generated output in CI.   |
| Conditions can encode arbitrary logic  | Use sandboxed JSONLogic (data, not `eval`); cap expression depth.         |
| LLM emits invalid schema               | Repair/normalize pass + strict validation + function-calling JSON Schema. |
| a11y regressions in custom widgets     | a11y test suite (axe) gating; label/aria wired in core widgets.           |

---

## 11. Immediate Next Steps

1. Reserve the npm scope `@formwright/*` and the GitHub org/repo `formwright`.
2. Scaffold the monorepo (pnpm + Turborepo + tsup + vitest + changesets + CI).
3. Build the `@formwright/schema` types + validator and the reactivity facade in `@formwright/core`.
4. Land the Phase 1 runtime MVP behind a single demo schema and prove surgical DOM updates with a mutation-count test.

```

```
