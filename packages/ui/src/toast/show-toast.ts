import type { ToastTone } from "./toast.js";
import type { ToastPlacement } from "./toast-region.js";

export interface ShowToastOptions {
  /** The message. Inserted as text, never parsed as HTML. */
  message: string;
  heading?: string;
  tone?: ToastTone;
  /** ms before it dismisses itself. Default 5000; 0 keeps it until dismissed. */
  duration?: number;
  /** A button beside the message. Clicking it runs `onClick`, then dismisses. */
  action?: { label: string; onClick: () => void };
  placement?: ToastPlacement;
}

export interface ToastHandle {
  /** Dismiss the toast, if it is still showing. */
  dismiss(): void;
}

/**
 * Show a toast from anywhere.
 *
 * ```ts
 * import { showToast } from "@formwright/ui/toast";
 *
 * const toast = showToast({
 *   tone: "success",
 *   heading: "Member saved",
 *   message: "Sara Khan was added to the Morning plan.",
 *   action: { label: "View", onClick: () => router.go("/members/42") },
 * });
 * toast.dismiss();
 * ```
 *
 * Reuses the `<fw-toast-region>` for that placement anywhere in
 * `document.body`, or appends a new one to it.
 */
export function showToast(options: ShowToastOptions): ToastHandle {
  const placement: ToastPlacement = options.placement ?? "bottom-end";
  let region = [...document.body.querySelectorAll("fw-toast-region")].find(
    (el) => (el.getAttribute("placement") ?? "bottom-end") === placement,
  );
  if (!region) {
    region = document.createElement("fw-toast-region");
    region.placement = placement;
    document.body.append(region);
  }

  const toast = document.createElement("fw-toast");
  toast.tone = options.tone ?? "info";
  if (options.heading !== undefined) toast.heading = options.heading;
  if (options.duration !== undefined) toast.duration = options.duration;
  toast.append(document.createTextNode(options.message));

  const action = options.action;
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.slot = "action";
    button.textContent = action.label;
    // Dies with the toast; nothing outside it holds this listener.
    button.addEventListener("click", () => {
      action.onClick();
      toast.dismiss();
    });
    toast.append(button);
  }

  region.append(toast);
  return { dismiss: () => toast.dismiss() };
}
