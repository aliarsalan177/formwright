# Formwright

> LLM schema-driven, signal-reactive, framework-agnostic form engine.

Define a form **once as data** — hand-written or LLM-generated — and render it to real,
**surgically-updating** DOM (no virtual DOM, no full re-render). Inject it anywhere with
`new Form(schema, initialValue)`, drive it imperatively, and get a typed, nested payload
out.

🔗 **Live demo / playground:** https://aliarsalan177.github.io/formwright/
📦 **npm:** [`@formwright/core`](https://www.npmjs.com/package/@formwright/core) ·
[`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom) ·
[`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema) ·
[`@formwright/ai`](https://www.npmjs.com/package/@formwright/ai)

⚡ **~12 KB gzipped, zero dependencies** for the entire framework-agnostic runtime
(`core` + `dom` + `schema`). One compact engine instead of a form library _plus_ a validation
library _plus_ a conditional-logic library _plus_ per-framework bindings.

---

## What makes it powerful

- 🤖 **Describe a form in English → a validated schema** — with **any** model (Claude, GPT,
  Gemini, local). A built-in validate→repair loop guarantees the output renders.
- 🧩 **Bring your own UI** — map any field to a **React, Vue, Svelte, or any-framework
  component**, a custom element, or a native tag, all from the schema. The form still
  produces one clean payload.
- 🪆 **Nested objects + repeatable collections** — `group` and `collection` fields yield
  `{ items: {…} }` and `[{…}, {…}]`, with add/remove rows and `min`/`max`.
- 🔀 **Conditional logic as data** — `visibleWhen` / `enabledWhen` / `requiredWhen` resolve
  **lexically** (sibling → outward), so an outer toggle can hide a field deep inside a
  collection row. Hidden fields drop out of the payload automatically.
- ⚡ **Surgical DOM** — fine-grained signals update only the exact node that changed; no
  virtual DOM, no re-render. **Real-time, field-by-field validation** as you type.
- 🌍 **Runs everywhere** — vanilla JS, any bundler, or straight from a CDN; the core owns
  state independently of rendering, so web-component and framework adapters drop in.

## Everything in the box

One schema, one tiny engine — no add-on libraries needed:

- **Fields** — text, email, password, number, textarea, select, radio, checkbox,
  **iOS-style toggle**, native **file** upload, nested **group** (object), repeatable
  **collection** (array, add/remove, `min`/`max`), plus any custom type.
- **Authoring elements** — `heading`, `separator`, `paragraph`, per-field **tooltips**, and a
  dismissible **top-of-form error alert** — enough to build forms in a Shopify/Magento-style
  editor.
- **Conditional logic as data** — `visibleWhen` / `enabledWhen` / `requiredWhen` with a
  sandboxed JSONLogic algebra (`==`,`>`,`in`,`and`,`or`,`not`,`var`), resolved **lexically**
  across groups and collection rows.
- **Validation** — declarative rules + formats, **real-time field-by-field** as you type, or
  any Standard-Schema validator (Zod/Valibot/ArkType).
- **Bring-your-own UI** — map any field to a **React/Vue/Svelte/any** component, a custom
  element, or a native tag, with `toValue`/`fromValue` transformers — straight from the schema.
- **Styling** — unstyled with stable hooks; override any part with your CSS or **Tailwind**
  utilities (`class` + `classes`).
- **Internationalisation** — `localized` fields → `{ en, ar, … }` payload; provider sigils for
  i18n, async data (`$query`), and theming.
- **Submission** — `validate → transform → send → onSuccess/onError`, an inline
  `submit(transform)`, configurable **submit/reset/delete action buttons**, and server-error
  mapping.
- **Smart payload** — nested output, hidden and `omit` fields automatically excluded.
- **AI-native** — `@formwright/ai` turns English into a validated schema with **any** model.

## Why Formwright

Most form libraries are bound to one framework and assume you _write the form in JSX_.
Formwright inverts that:

- **Schema is the source of truth.** Plain, serializable data describes fields, layout,
  validation, conditions, providers, and submission.
- **The runtime is framework-agnostic.** A fine-grained signal core renders directly to
  the DOM — when a value changes, only the exact text node / attribute that read it
  updates.
- **You own the UI.** Native inputs by default; map any field to your own component
  (React/Vue/any) or a custom element without leaving the schema.
- **It's LLM-native.** A model emits the schema; it's validated and repaired before it
  ever reaches the runtime — and `@formwright/ai` does this for you with any provider.

## Install

```bash
npm i @formwright/core @formwright/dom
# or: pnpm add @formwright/core @formwright/dom
```

No build step? Import from a CDN as ESM:

```html
<script type="module">
  import { Form } from "https://esm.sh/@formwright/core";
  import "https://esm.sh/@formwright/dom";
  // …
</script>
```

## Quick start

```ts
import { Form } from "@formwright/core";
import "@formwright/dom"; // registers the default DOM renderer

const schema = {
  id: "signup",
  version: "1.0",
  title: "Create your account",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      validation: { kind: "string", format: "email", required: true },
    },
    {
      id: "country",
      type: "select",
      label: "Country",
      placeholder: "Select a country…",
      options: [
        { label: "United States", value: "US" },
        { label: "Canada", value: "CA" },
      ],
    },
    // Shown only when country === "US"
    {
      id: "state",
      type: "text",
      label: "State",
      visibleWhen: { "==": [{ var: "country" }, "US"] },
    },
    { id: "newsletter", type: "toggle", label: "Send me product updates" },
  ],
  submit: { endpoint: { method: "POST", url: "/api/signup" } },
};

const form = new Form(schema, { email: "" });
form.mount(document.getElementById("root")!);

form.on("success", (result) => console.log("submitted", result));
```

## Using it in your app

### Vanilla / any bundler

```ts
import { Form } from "@formwright/core";
import "@formwright/dom";

const form = new Form(schema, initialValues, {
  // Named handlers/transforms referenced from the schema's `submit` block:
  transforms: { buildPayload: (values) => ({ ...values, source: "web" }) },
  handlers: { redirectHome: () => location.assign("/") },
  // Override the network send if you don't use `submit.endpoint`:
  send: async (payload) => fetch("/api/x", { method: "POST", body: JSON.stringify(payload) }),
});

form.mount(document.querySelector("#form")!);
```

### React (today)

The `Form` instance is render-agnostic — mount it into a ref:

```tsx
import { useEffect, useRef } from "react";
import { Form } from "@formwright/core";
import "@formwright/dom";

export function SignupForm({ schema }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = new Form(schema, { email: "" });
    form.mount(ref.current!);
    return () => form.destroy();
  }, [schema]);
  return <div ref={ref} />;
}
```

> First-party `@formwright/react`, `/vue`, and a `<formwright-form>` web component are on
> the roadmap; the core already supports them since it owns state independently of rendering.

## What you can build

A field is resolved to a widget by `type` and keyed by `id`.

### Field types

`text` · `email` · `password` · `number` · `textarea` · `select` · `radio` · `checkbox` ·
`toggle` · `group` (nested object) · `collection` (repeatable list) —
plus any custom type via `registerWidget`.

### Conditional logic (as data)

`visibleWhen`, `enabledWhen`, and `requiredWhen` use a sandboxed JSONLogic-style algebra —
no `eval`:

```jsonc
{
  "id": "promoCode",
  "type": "text",
  "visibleWhen": {
    "and": [
      { "==": [{ "var": "plan" }, "pro"] },
      { "==": [{ "var": "billing" }, "annual"] },
      { "var": "agree" },
    ],
  },
}
```

Operators: `==` `!=` `>` `>=` `<` `<=` `in` `and` `or` `not` `var`.

### Nested objects and repeatable lists

```jsonc
{ "id": "billingAddress", "type": "group", "label": "Billing address", "layout": "accordion",
  "fields": [ { "id": "name", "type": "text" }, { "id": "city", "type": "text" } ] },

{ "id": "contacts", "type": "collection", "label": "Contacts", "layout": "cards",
  "itemLabel": "Contact", "minItems": 1, "maxItems": 4,
  "fields": [ { "id": "name", "type": "text" }, { "id": "email", "type": "email" } ] }
```

→ payload:

```jsonc
{
  "billingAddress": { "name": "Ada", "city": "London" },
  "contacts": [{ "name": "Grace", "email": "g@x.com" }],
}
```

Conditions resolve **lexically** (sibling → enclosing scope → form root), so an outer
toggle can hide a field nested inside a group or a collection row, and a field can react to
a sibling in its own row.

### Validation

Declarative rules — `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`,
`format: "email" | "url" | "uuid"` — or bring any Standard-Schema validator (Zod / Valibot /
ArkType). Errors surface in **real time, field by field**, as the user types.

## Generate a form from English — with any model

`@formwright/ai` turns a description into a **validated** schema. It's provider-agnostic:
Claude by default, GPT via your OpenAI client, or anything else through a small adapter. A
built-in validate→repair loop feeds errors back to the model until the schema renders.

```ts
import { generateSchema, openaiProvider } from "@formwright/ai";
import { Form } from "@formwright/core";
import "@formwright/dom";

// Claude (default — uses ANTHROPIC_API_KEY, model claude-opus-4-8)
const { schema } = await generateSchema(
  "a checkout form with a promo code shown only for the annual Pro plan",
);
new Form(schema).mount(document.getElementById("root")!);

// …or GPT
import OpenAI from "openai";
await generateSchema("a contact form", { provider: openaiProvider({ client: new OpenAI() }) });
```

## Bring your own components (React / Vue / any)

A field renders with the built-in widget for its `type`, a **custom element**, or **your own
framework component** — chosen from the schema, wired with a tiny adapter. Whatever you set
flows straight into the payload.

```jsonc
// Custom element — no code, pure schema:
{ "id": "country", "type": "text", "widget": { "tag": "s-select", "event": "value-change" } }
```

```tsx
// A React component, registered once by name:
import { createRoot } from "react-dom/client";
import { registerWidget } from "@formwright/dom";

registerWidget("rating", {
  mount(host, b) {
    const root = createRoot(host);
    b.onValue((value) => root.render(<StarRating value={value} onChange={b.setValue} />));
    return () => root.unmount();
  },
});
// schema: { id: "score", type: "number", widget: "rating" }
```

The `WidgetBinding` (`b.value()`, `b.setValue()`, `b.onValue()`, `b.onEnabled()`) is the whole
contract — Vue, Svelte, Solid, Angular plug in the same ~8-line way. Add `toValue`/`fromValue`
to translate between your component's shape and the stored value, or a native `file` widget for
uploads.

### StencilJS / Lit / any web component

A component that compiles to a custom element (Stencil, Lit, Angular Elements…) needs **no
adapter at all** — just point the schema at its tag, value property, and change event. The
[playground](https://aliarsalan177.github.io/formwright/) ships a live `<fw-rating>` demo:

```jsonc
// <fw-rating value="..."> emits a `rating-change` event
{
  "id": "score",
  "type": "number",
  "widget": { "tag": "fw-rating", "event": "rating-change", "valueProp": "value" },
}
```

```ts
// your-rating.tsx (Stencil)
@Component({ tag: "fw-rating" })
export class FwRating {
  @Prop({ mutable: true }) value = 0;
  @Event() ratingChange: EventEmitter<{ value: number }>;
  // …render stars; on click: this.value = n; this.ratingChange.emit({ value: n })
}
```

### Vue, Svelte, Solid

Each is the same `mount` adapter as React above — render the component into `host`, call
`b.setValue` on change, and `b.onValue` to push updates back in. See `registerWidget` in
[`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom).

## Styling — your CSS or Tailwind, your layout

The renderer ships **unstyled** with stable class hooks (`.fw-field`, `.fw-group`, `.fw-error`,
`.fw-switch`, …) — bring your own stylesheet. Or override per field, right in the schema, with
any classes or **Tailwind utilities**:

```jsonc
{
  "id": "email",
  "type": "email",
  "label": "Email",
  "class": "md:col-span-2",
  "classes": {
    "field": "rounded-xl bg-slate-50 p-3",
    "label": "text-sm font-medium text-slate-600",
    "control": "w-full rounded-lg border px-3 py-2 focus:ring-2",
    "error": "text-red-600 text-xs",
  },
}
```

`class` lands on the field wrapper; `classes` targets the wrapper, label, control, help,
description, and error parts individually — so you control layout (grid spans, spacing) and look
without touching the engine.

## Imperative API

```ts
form.values; // reactive snapshot (nested)
form.getValue("billingAddress.name");
form.setValue("country", "US");
form.isDirty;
form.isValid;
form.isSubmitting; // computed signals
form.on("change" | "submit" | "success" | "error", handler);
await form.submit(); // validate → transform → send → onSuccess/onError
form.reset();
form.destroy();
```

## Packages

| Package                                                                  | Description                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------- |
| Package                                                                  | Description                                          | Size (min+gzip)  |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------- |
| [`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema) | Schema types + dependency-free validator             | ~1.2 KB          |
| [`@formwright/core`](https://www.npmjs.com/package/@formwright/core)     | Signal reactivity + the `Form` class                 | ~5.8 KB          |
| [`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom)       | Surgical direct-DOM renderer + widget adapters       | ~4.8 KB          |
| [`@formwright/ai`](https://www.npmjs.com/package/@formwright/ai)         | Generate a validated schema from English (any model) | optional, server |
| **Full runtime** (`schema` + `core` + `dom`)                             | Everything above to render & submit a form           | **~12 KB**       |

**Zero runtime dependencies.** Tree-shakeable subpath exports — pull only what you use. Ships
ESM + CJS + types, and works straight from a CDN (`esm.sh`) with no build step. For comparison,
that's smaller than most single-purpose form libraries — and it includes validation, conditional
logic, nesting, i18n, custom widgets, and the submission pipeline in the box.

## Run the playground locally

```bash
pnpm install
pnpm --filter @formwright/playground dev
```

Edit a schema on the left, watch the form render live in the middle, and see the live
values + submitted payload on the right.

## Development

```bash
pnpm install
pnpm build       # build all packages (turbo)
pnpm test        # run unit tests
pnpm typecheck   # type-check all packages
pnpm format      # prettier
```

pnpm + Turborepo monorepo; releases automated with
[changesets](https://github.com/changesets/changesets). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

- `@formwright/wc` web component + `@formwright/react` / `/vue` adapters
- `@formwright/codegen` — compile a schema to idiomatic React / Vue / HTML source
- First-party providers (i18n, TanStack Query, theming)
- `@formwright/ai` — describe a form in English → validated schema

## License

MIT
