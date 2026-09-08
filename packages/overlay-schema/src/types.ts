import type { FormSchema } from "@formwright/schema";

/**
 * Overlaywright schemas — a dialog described as data, the way a form is.
 *
 * The point of describing an overlay rather than writing one is the same
 * as for a form: the description can be validated, serialised, sent from
 * a server, diffed in review, and rendered by more than one renderer.
 * A confirm dialog is a value here, not a component.
 *
 * The type import above is types-only, so nothing at runtime reaches for
 * the form engine. An overlay package installed on its own still works;
 * `form` blocks simply have nothing to render them.
 */

/**
 * What kind of surface this paints.
 *
 * The distinction is behavioural, not cosmetic: it decides how the
 * overlay is dismissed, where focus goes, and whether the page scroll is
 * frozen. A renderer may style them however it likes but must not blur
 * those — a "drawer" that traps focus like a modal is a modal.
 */
export type OverlayKind = "modal" | "drawer" | "sheet" | "popover";

/** Which edge the surface enters from. Modals ignore it. */
export type OverlaySide = "left" | "right" | "top" | "bottom";

export type OverlaySize = "sm" | "md" | "lg" | "xl" | "full";

/**
 * How the overlay may be dismissed.
 *
 * `alert` is for the question that has to be answered: escape and
 * backdrop clicks are ignored, because a confirm that vanishes on a
 * stray click has silently discarded the user's decision.
 * `non-modal` neither traps focus nor locks scroll — what a popover
 * needs, and what would make a dialog inaccessible.
 */
export type DismissMode = "modal" | "alert" | "non-modal";

export type BlockTone = "default" | "muted" | "danger" | "success";

/**
 * Body content, as data.
 *
 * `slot` is the deliberate escape hatch: anything genuinely bespoke is
 * named here and supplied by the host, so one irregular dialog does not
 * force every consumer into an imperative API.
 */
export type OverlayBlock =
  | { type: "text"; text: string; tone?: BlockTone }
  | { type: "list"; items: readonly string[]; ordered?: boolean }
  | { type: "fields"; items: readonly { label: string; value: string }[] }
  | { type: "divider" }
  /** Raw markup. The host is trusting whoever wrote the schema — the
   *  renderer does not sanitise, so never build this from user input. */
  | { type: "html"; html: string }
  /** A Formwright form as the dialog body. Rendered only when a form
   *  renderer is registered; ignored otherwise. */
  | { type: "form"; form: FormSchema; submitAction?: string }
  /** Host-supplied content, looked up by name. */
  | { type: "slot"; name: string };

/**
 * A button in the footer.
 *
 * `value` is what the overlay's result promise resolves with, which is
 * how an awaited confirm reads its answer without a callback.
 */
export interface OverlayAction {
  name: string;
  label: string;
  role?: "confirm" | "cancel" | "danger" | "neutral";
  value?: unknown;
  /** Default true. False for an action that acts without dismissing. */
  closeOnRun?: boolean;
  disabled?: boolean;
}

export interface OverlaySchema {
  /** Stable identity. Opening the same id twice refreshes the overlay in
   *  place instead of stacking a duplicate. */
  id: string;
  kind: OverlayKind;
  side?: OverlaySide;
  size?: OverlaySize;
  dismiss?: DismissMode;
  title?: string;
  description?: string;
  body?: readonly OverlayBlock[];
  actions?: readonly OverlayAction[];
  /** Fractions of the viewport height a sheet may rest at, ascending,
   *  each in (0, 1]. Only meaningful for `sheet`. */
  snapPoints?: readonly number[];
  /** Index into `snapPoints` to open at. */
  defaultSnap?: number;
  /** Renderer hints. Never interpreted by the engine. */
  meta?: Record<string, unknown>;
}
