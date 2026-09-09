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

## Toasts and themes

Toasts are positioned, stacked, animated, and safe-area aware:

```ts
overlay.toast({
  text: "Changes saved",
  tone: "success",
  position: "top-right",
  duration: 3000,
});
```

The default toast colors follow the same `--ow-panel`, `--ow-text`, and
`--ow-border` tokens as dialogs. Override `--ow-success` and `--ow-danger`
on `.ow-root` to match light, dark, or tenant-specific themes. Applications
using `styles: false` can target `.ow-toasts` and
`.ow-panel[data-kind="toast"]` while keeping the package renderer and API.

## License

MIT
