import type { Scope } from "@formwright/ui-core";
import type { PropMap } from "../core/element.js";
import { FwModal, modalStyles } from "../dialog/modal.js";

export type { CloseSource, RequestCloseDetail } from "../dialog/modal.js";
export type DrawerPlacement = "start" | "end" | "top" | "bottom";

const styles =
  modalStyles +
  /* css */ `
.dialog { padding: 0; }
.header { padding: 1.25rem 1.25rem 0.75rem; }
.dialog[open] { align-items: stretch; justify-content: flex-end; }
:host([placement="start"]) .dialog[open] { justify-content: flex-start; }
:host([placement="top"]) .dialog[open],
:host([placement="bottom"]) .dialog[open] { flex-direction: column; }
:host([placement="top"]) .dialog[open] { justify-content: flex-start; }
:host([placement="bottom"]) .dialog[open] { justify-content: flex-end; }

/* start / end: a column the height of the viewport. Row flex follows the
   text direction, so "end" is the right edge in LTR and the left in RTL. */
.panel {
  --_from: translateX(100%);
  width: var(--_size, var(--fw-drawer-size, 24rem)); max-width: 100%;
  height: 100%; max-height: 100%;
  border: 0; border-radius: 0;
  border-inline-start: 1px solid var(--_border);
  transform: none;
}
:host(:dir(rtl)) .panel { --_from: translateX(-100%); }
:host([placement="start"]) .panel {
  --_from: translateX(-100%);
  border-inline-start: 0; border-inline-end: 1px solid var(--_border);
}
:host([placement="start"]:dir(rtl)) .panel { --_from: translateX(100%); }

/* top / bottom: full width, as tall as its content unless sized, capped. */
:host([placement="top"]) .panel,
:host([placement="bottom"]) .panel {
  width: 100%; max-width: none;
  height: var(--_size, var(--fw-drawer-size, auto));
  max-height: var(--_cap, 85%);
  border: 0;
}
:host([placement="top"]) .panel {
  --_from: translateY(-100%); border-bottom: 1px solid var(--_border);
  border-end-start-radius: min(var(--_radius), 1rem); border-end-end-radius: min(var(--_radius), 1rem);
}
:host([placement="bottom"]) .panel {
  --_from: translateY(100%); border-top: 1px solid var(--_border);
  border-start-start-radius: min(var(--_radius), 1rem); border-start-end-radius: min(var(--_radius), 1rem);
}

/* Slides in from its edge. The base styles zero these durations under
   prefers-reduced-motion, which also makes the close synchronous. */
.dialog[data-closing] .panel { transform: var(--_from); }
@starting-style { .dialog[open] .panel { transform: var(--_from); } }
`;

/**
 * `<fw-drawer>` — a modal panel that slides in from an edge of the screen.
 *
 * ```html
 * <fw-drawer id="filters" heading="Filter members" placement="end" size="28rem">
 *   <fw-select label="Plan">…</fw-select>
 *   <fw-button slot="footer" variant="secondary">Reset</fw-button>
 *   <fw-button slot="footer">Apply</fw-button>
 * </fw-drawer>
 * <script>document.getElementById("filters").show();</script>
 *
 * <fw-drawer placement="bottom" heading="Quick check-in">…</fw-drawer>
 * ```
 *
 * The same contract as `<fw-dialog>` — native modal `<dialog>`, scroll
 * lock, focus in and back, Escape and backdrop through a cancelable
 * `fw-request-close` — anchored to an edge instead of centred.
 *
 * `placement` is `start` | `end` (default) | `top` | `bottom`; `start` and
 * `end` follow the text direction. `size` is any CSS length: the width for
 * `start`/`end` (default `24rem`), the height for `top`/`bottom` (default
 * the content's height, capped at 85% of the viewport). It is written to a
 * private custom property, so `--fw-drawer-size` in a stylesheet works too.
 * The slide is turned off under `prefers-reduced-motion`.
 *
 * Props: `open` (reflected), `heading`, `placement` (reflected), `size`,
 * `dismissible` (default true; `dismissible="false"` in HTML), `no-header`.
 *
 * Slots: default (body), `header`, `header-actions`, `footer`.
 *
 * Events: `fw-show`, `fw-after-show`, `fw-request-close` (cancelable,
 * `detail: { source: "escape" | "backdrop" | "close-button" | "method" }`),
 * `fw-hide`, `fw-after-hide`.
 *
 * Methods: `show()`, `hide()` (goes through `fw-request-close`).
 *
 * Parts: `dialog`, `panel`, `header`, `title`, `header-actions`,
 * `close-button`, `body`, `footer`.
 *
 * Custom properties: `--fw-drawer-size`, `--fw-backdrop`,
 * `--fw-overlay-duration`, `--fw-overlay-z`.
 */
export class FwDrawer extends FwModal {
  static override props: PropMap = {
    ...FwModal.props,
    placement: { type: "string", reflect: true, default: "end" },
    size: { type: "string" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open" };

  declare placement: DrawerPlacement;
  declare size: string | null;

  protected override connected(scope: Scope): void {
    super.connected(scope);
    scope.bind(() => {
      const size = this.prop<string | null>("size").get()?.trim();
      const style = this.dialog.style;
      if (size) {
        style.setProperty("--_size", size);
        // An explicit height is taken at its word, up to the viewport.
        style.setProperty("--_cap", "100%");
      } else {
        style.removeProperty("--_size");
        style.removeProperty("--_cap");
      }
    });
  }
}
