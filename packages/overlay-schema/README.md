# @formwright/overlay-schema

Serializable Overlaywright types and dependency-free validation for modals, drawers, sheets, popovers, and toasts.

```bash
npm install @formwright/overlay-schema
```

## Quick start

```ts
import { validateSchema, type OverlaySchema } from "@formwright/overlay-schema";

const receipt: OverlaySchema = {
  id: "receipt-123",
  kind: "modal",
  size: "sm",
  title: "Receipt R-000123",
  body: [
    {
      type: "fields",
      items: [{ label: "Total", value: "PKR 3,000" }],
    },
  ],
  actions: [{ name: "close", label: "Close", role: "cancel" }],
};

const result = validateSchema(receipt);
if (!result.valid) {
  console.error(result.issues);
}
```

Schemas are plain serializable data. Body blocks include text, lists, fields, dividers, Formwright forms, and named host slots. The `html` block is intentionally unsanitized and must only contain trusted application-authored markup.

Install `@formwright/overlay-core` for stack state and `@formwright/overlay-dom` for the accessible DOM renderer.

## License

MIT
