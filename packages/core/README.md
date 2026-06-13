# @formwright/core

> Signal-reactive core and the `Form` class for [Formwright](https://github.com/aliarsalan177/formwright) — a schema-driven, framework-agnostic form engine.

Define a form once as plain data — hand-written or LLM-generated — and drive it with
a tiny, fine-grained reactive core. No virtual DOM, no full re-render: when a value
changes, only the exact bindings that read it re-run.

```bash
npm i @formwright/core @formwright/dom
```

## Quick start

```ts
import { Form } from "@formwright/core";
import "@formwright/dom"; // registers the default DOM renderer

const form = new Form(
  {
    id: "signup",
    version: "1.0",
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
    ],
  },
  { email: "" },
);

form.mount(document.getElementById("root")!);
await form.submit();
```

## Features

- **Fine-grained reactivity** — a zero-dependency `signal`/`computed`/`effect` core; only the bindings that read a changed value update.
- **Conditional logic as data** — `visibleWhen` / `enabledWhen` / `requiredWhen` use a sandboxed JSONLogic-style algebra (`==`, `>`, `in`, `and`, `or`, `not`, `var`). No `eval`.
- **Nested `group` (object) and repeatable `collection` (array) fields** — produce nested payloads (`{ items: { … } }`, `{ contacts: [ … ] }`), with add/remove honoring `minItems`/`maxItems`.
- **Cross-scope conditions** — names resolve lexically (sibling → enclosing scope → form root), so an outer toggle can hide a field nested inside a group or a collection row.
- **Built-in validation** — declarative rules (`required`, `min`/`max`, `minLength`/`maxLength`, `pattern`, `format`), or bring any Standard-Schema validator.
- **Submission pipeline** — `validate → transform → send → onSuccess/onError`, all declarable by name in the schema.
- **Provider injection** — i18n, data-fetching, and theming referenced in-schema via sigils (`{ $t }`, `{ $query }`, `{ $theme }`).
- **Render-agnostic** — the `Form` instance owns state; mount it via `@formwright/dom`, a web component, or a framework adapter.

## Imperative API

```ts
form.values; // reactive snapshot (nested for groups/collections)
form.getValue("billingAddress.name"); // dotted-path access
form.setValue("country", "US");
form.isDirty; // computed signals
form.isValid;
form.isSubmitting;
form.on("change", ({ id, value }) => {});
await form.submit(); // validate → transform → endpoint → onSuccess/onError
form.reset();
form.destroy();
```

## Reactivity primitives

The core ships its own tiny reactive system, also exported for general use:

```ts
import { signal, computed, effect, batch } from "@formwright/core/reactive";

const count = signal(0);
const doubled = computed(() => count.get() * 2);
effect(() => console.log(doubled.get())); // 0
count.set(5); // logs 10
```

## License

MIT
