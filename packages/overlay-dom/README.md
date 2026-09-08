# @formwright/overlay-dom

Accessible, framework-free DOM renderer for Overlaywright with focus trapping, focus restoration, scroll locking, stacking, transitions, RTL drawers, sheet snap points, and drag-to-dismiss.

```bash
npm install @formwright/overlay-core @formwright/overlay-dom
```

## Quick start

```ts
import { overlay } from "@formwright/overlay-core";
import { mountOverlays } from "@formwright/overlay-dom";

const unmount = mountOverlays();

overlay.drawer({
  id: "filters",
  title: "Filters",
  side: "right",
  body: [{ type: "slot", name: "filters" }],
  slots: {
    filters: document.getElementById("filter-form")!,
  },
});
```

Call `mountOverlays` once near the application root and call its returned disposer during teardown.

## Options

```ts
mountOverlays({
  container: document.body,
  styles: true,
  exitMs: 220,
  renderForm: (schema, host) => {
    // Mount a Formwright form and optionally return its disposer.
  },
});
```

Pass `styles: false` to use only the stable `.ow-*` classes and provide your own theme. The default renderer uses CSS custom properties for colors, sizes, motion, backdrop opacity, and blur.

Slot values may be an `HTMLElement` or a string. Raw `html` body blocks are not sanitized; never populate them with untrusted input.

## License

MIT
