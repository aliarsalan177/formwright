# Formwright

> LLM schema-driven, signal-reactive, framework-agnostic form engine.

Define a form **once as data** — hand-written or LLM-generated — and render it to real,
**surgically-updating** DOM (no virtual DOM, no full re-render). Inject it anywhere with
`new Form(schema, initialValue)`, drive it imperatively, and get a typed, nested payload
out.

🔗 **Live demo / playground:** https://aliarsalan177.github.io/formwright/
📦 **npm:** [`@formwright/core`](https://www.npmjs.com/package/@formwright/core) ·
[`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom) ·
[`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema)

---

## Why Formwright

Most form libraries are bound to one framework and assume you _write the form in JSX_.
Formwright inverts that:

- **Schema is the source of truth.** Plain, serializable data describes fields, layout,
  validation, conditions, providers, and submission.
- **The runtime is framework-agnostic.** A fine-grained signal core renders directly to
  the DOM — when a value changes, only the exact text node / attribute that read it
  updates.
- **It works everywhere.** Vanilla JS today; web-component + framework adapters by design.
- **It's LLM-native.** The schema is designed to be emitted by a model, validated, and
  repaired before it ever reaches the runtime.

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
`toggle` (iOS-style switch) · `group` (nested object) · `collection` (repeatable list) —
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
ArkType).

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

| Package                                                                  | Description                                 |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| [`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema) | Schema types + dependency-free validator    |
| [`@formwright/core`](https://www.npmjs.com/package/@formwright/core)     | Signal reactivity + the `Form` class        |
| [`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom)       | Surgical direct-DOM renderer + core widgets |

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
