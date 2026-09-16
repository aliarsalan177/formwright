import type { PropMap } from "../core/element.js";
import { FwModal, modalStyles } from "./modal.js";

export type { CloseSource, RequestCloseDetail } from "./modal.js";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

const styles =
  modalStyles +
  /* css */ `
.panel { max-width: var(--_dialog-width, 32rem); transform: none; }
:host([size="sm"]) .panel { --_dialog-width: 24rem; }
:host([size="lg"]) .panel { --_dialog-width: 48rem; }
:host([size="xl"]) .panel { --_dialog-width: 64rem; }
:host([size="full"]) .dialog { padding: 0; }
:host([size="full"]) .panel {
  max-width: none; width: 100%; height: 100%;
  border: 0; border-radius: 0;
}
.dialog[data-closing] .panel { transform: scale(0.96); }
@starting-style { .dialog[open] .panel { transform: scale(0.96); } }
`;

/**
 * `<fw-dialog>` — a modal dialog.
 *
 * ```html
 * <fw-button id="open-renew">Renew membership</fw-button>
 * <fw-dialog id="renew" heading="Renew membership" size="md">
 *   <p>Extend Sara's plan by another month?</p>
 *   <fw-button slot="footer" variant="secondary" data-close>Cancel</fw-button>
 *   <fw-button slot="footer">Renew</fw-button>
 * </fw-dialog>
 *
 * <script>
 *   const dialog = document.getElementById("renew");
 *   document.getElementById("open-renew").onclick = () => dialog.show();
 *   dialog.addEventListener("fw-request-close", (e) => {
 *     if (e.detail.source === "backdrop" && formIsDirty) e.preventDefault();
 *   });
 * </script>
 *
 * <!-- Must be answered: no Escape, no backdrop, no close button. -->
 * <fw-dialog heading="Delete member?" dismissible="false">…</fw-dialog>
 * ```
 *
 * Opens in the top layer through a native `<dialog>` and `showModal()`, so
 * the page behind is inert and focus stays inside. Page scroll is locked
 * while open. Focus moves to `[autofocus]`, else the first focusable
 * element, else the panel, and returns to whatever had it on close. The
 * body scrolls; header and footer stay pinned.
 *
 * Escape, a backdrop press (starting *and* ending outside the panel), the
 * close button and `hide()` all fire a cancelable `fw-request-close` first.
 * `dismissible="false"` turns off Escape, the backdrop and the close button
 * and gives it `role="alertdialog"`.
 *
 * Props: `open` (reflected), `heading`, `size` — `sm` | `md` | `lg` | `xl` |
 * `full`, `dismissible` (default true; `dismissible="false"` in HTML),
 * `no-header`.
 *
 * Slots: default (body), `header` (replaces the heading text),
 * `header-actions`, `footer`.
 *
 * Events: `fw-show`, `fw-after-show`, `fw-request-close` (cancelable,
 * `detail: { source: "escape" | "backdrop" | "close-button" | "method" }`),
 * `fw-hide`, `fw-after-hide`. They bubble and are composed, so check
 * `event.target` when a `<fw-select>` inside also fires `fw-show`/`fw-hide`.
 *
 * Methods: `show()`, `hide()` (goes through `fw-request-close`).
 *
 * Parts: `dialog`, `panel`, `header`, `title`, `header-actions`,
 * `close-button`, `body`, `footer`.
 *
 * Custom properties: `--fw-backdrop`, `--fw-overlay-duration`,
 * `--fw-overlay-z` (only used where `showModal` is unavailable).
 */
export class FwDialog extends FwModal {
  static override props: PropMap = {
    ...FwModal.props,
    size: { type: "string", reflect: true, default: "md" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open" };

  declare size: DialogSize;
}
