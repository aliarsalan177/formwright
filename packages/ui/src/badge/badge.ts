import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

const styles = /* css */ `
:host {
  /* One tone recipe shared with fw-tag, fw-alert and fw-progress: a soft
     wash mixed into the surface, text pulled toward the text colour so it
     reads in light and dark, and the tone's -contrast on solid fills. */
  --_tone: var(--_muted);
  --_tone-text: var(--_text);
  --_tone-contrast: var(--_surface);
  --_tone-soft: color-mix(in srgb, var(--_tone) 14%, var(--_surface));
  --_tone-line: color-mix(in srgb, var(--_tone) 45%, var(--_surface));
  display: inline-flex; vertical-align: middle;
}
:host([tone="accent"]) { --_tone: var(--_accent); --_tone-text: color-mix(in srgb, var(--_accent) 72%, var(--_text)); --_tone-contrast: var(--_accent-contrast); }
:host([tone="success"]) { --_tone: var(--_success); --_tone-text: color-mix(in srgb, var(--_success) 72%, var(--_text)); --_tone-contrast: var(--_success-contrast); }
:host([tone="warning"]) { --_tone: var(--_warning); --_tone-text: color-mix(in srgb, var(--_warning) 72%, var(--_text)); --_tone-contrast: var(--_warning-contrast); }
:host([tone="danger"]) { --_tone: var(--_danger); --_tone-text: color-mix(in srgb, var(--_danger) 72%, var(--_text)); --_tone-contrast: var(--_danger-contrast); }

.base {
  display: inline-flex; align-items: center; gap: 0.3125rem;
  min-height: 1.375rem; padding-block: 0.125rem; padding-inline: 0.5rem;
  font-size: 0.75rem; font-weight: 500; line-height: 1; white-space: nowrap;
  font-variant-numeric: tabular-nums;
  border: 1px solid transparent;
  border-radius: min(var(--_radius-sm), 999px);
  background: var(--_tone-soft);
  color: var(--_tone-text);
}
:host([size="sm"]) .base {
  min-height: 1.125rem; padding-block: 0; padding-inline: 0.375rem; gap: 0.25rem;
  font-size: 0.6875rem;
}

:host([variant="solid"]) .base { background: var(--_tone); color: var(--_tone-contrast); }
:host(:not([tone])[variant="solid"]) .base,
:host([tone="neutral"][variant="solid"]) .base { background: var(--_text); color: var(--_surface); }
:host([variant="outline"]) .base {
  background: transparent; color: var(--_tone-text);
  border-color: var(--_tone-line);
}
:host(:not([tone])[variant="outline"]) .base,
:host([tone="neutral"][variant="outline"]) .base { border-color: var(--_border); }

.dot { width: 0.375rem; height: 0.375rem; flex: none; border-radius: 50%; background: var(--_tone); }
:host([variant="solid"]) .dot { background: currentColor; }
:host([size="sm"]) .dot { width: 0.3125rem; height: 0.3125rem; }
`;

/**
 * `<fw-badge>` — a short, non-interactive label: a count, a status, a plan.
 *
 * ```html
 * <fw-badge>Draft</fw-badge>
 * <fw-badge tone="success" dot>Active</fw-badge>
 * <fw-badge tone="danger" variant="solid" size="sm">3</fw-badge>
 * <fw-badge tone="accent" variant="outline">Pro</fw-badge>
 * ```
 *
 * Tone, variant and size are attributes, so one component covers every
 * combination. The `dot` is decorative; put the meaning in the text.
 *
 * Slots: default (text).
 * Parts: `base`, `dot`, `label`.
 */
export class FwBadge extends FwElement {
  static override props: PropMap = {
    tone: { type: "string", reflect: true, default: "neutral" },
    variant: { type: "string", reflect: true, default: "soft" },
    size: { type: "string", reflect: true, default: "md" },
    dot: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare tone: BadgeTone;
  declare variant: BadgeVariant;
  declare size: BadgeSize;
  declare dot: boolean;

  #dot!: HTMLSpanElement;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("span");
    base.className = "base";
    base.setAttribute("part", "base");

    this.#dot = document.createElement("span");
    this.#dot.className = "dot";
    this.#dot.setAttribute("part", "dot");
    this.#dot.setAttribute("aria-hidden", "true");
    this.#dot.hidden = true;

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));

    base.append(this.#dot, label);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#dot.hidden = !this.prop<boolean>("dot").get();
    });
  }
}
