# @formwright/dom

> Surgical, virtual-DOM-free renderer and core widgets for [Formwright](https://github.com/aliarsalan177/formwright).

Importing this package registers the DOM renderer as the default, so
`new Form(schema).mount(el)` just works.

```bash
npm i @formwright/core @formwright/dom
```

```ts
import { Form } from "@formwright/core";
import "@formwright/dom"; // registers the renderer

const form = new Form(schema, { email: "" });
form.mount(document.getElementById("root")!);
```

## How it renders

Each field renders **once** to real DOM nodes; reactive bindings then update only the exact
text node or attribute that changed — no diffing, no re-render of siblings. Conditional
fields toggle visibility in place; `group` and `collection` fields render as nested
sections / repeatable rows (with add/remove honoring `minItems`/`maxItems`).

## Built-in widgets

`text` · `email` · `password` · `number` · `textarea` · `select` · `radio` · `checkbox` ·
`toggle` · plus `group` and `collection` containers.

## Custom widgets

Register your own control for any field `type`:

```ts
import { registerWidget } from "@formwright/dom";

registerWidget("rating", ({ form, field, scope }) => {
  const el = document.createElement("input");
  el.type = "range";
  scope.bind(() => (el.value = String(field.value.get() ?? 0)));
  el.addEventListener("input", () => form.setFieldValue(field, Number(el.value)));
  return el;
});
```

The package ships **unstyled** — bring your own CSS targeting the emitted class names
(`.fw-form`, `.fw-field`, `.fw-group`, `.fw-collection`, `.fw-error`, `.fw-switch`, …).

## License

MIT
