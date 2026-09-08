# @formwright/overlay-core

Signal-reactive Overlaywright stack for modals, drawers, sheets, popovers, confirmations, and toasts.

```bash
npm install @formwright/overlay-core @formwright/overlay-dom
```

## Quick start

Mount one renderer near the application root:

```ts
import { mountOverlays } from "@formwright/overlay-dom";

const unmount = mountOverlays();
```

Then open overlays from any module:

```ts
import { overlay } from "@formwright/overlay-core";

overlay.modal({
  title: "Receipt R-000123",
  size: "sm",
  body: [
    {
      type: "fields",
      items: [{ label: "Total", value: "PKR 3,000" }],
    },
  ],
});

const confirmed = await overlay.confirm({
  title: "Cancel this receipt?",
  danger: true,
});
```

Use `overlay.drawer`, `overlay.sheet`, `overlay.toast`, or `overlay.open` for a complete schema. Every open call returns a handle with `id`, `result`, and `close(value)`.

The ambient store is shared through `globalThis`, so overlays opened by route handlers, shortcuts, components, and utility modules reach the same host. For an isolated stack, construct `OverlayStore` and pass it to the renderer.

## License

MIT
