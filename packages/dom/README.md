# @formwright/dom

The surgical, virtual-DOM-free renderer for [Formwright](../../README.md).

Importing this package registers the DOM renderer as the default, so
`new Form(schema).mount(el)` just works:

```ts
import { Form } from "@formwright/core";
import "@formwright/dom"; // registers the renderer

const form = new Form(schema, { email: "" });
form.mount(document.getElementById("root")!);
```

Each field renders once to real DOM nodes; reactive bindings then update only the
exact text node or attribute that changed. Register custom controls with
`registerWidget(type, factory)`.
