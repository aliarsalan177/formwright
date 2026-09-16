import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type ProgressVariant = "linear" | "circular";
export type ProgressTone = "accent" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md" | "lg";

const SVG_NS = "http://www.w3.org/2000/svg";

const styles = /* css */ `
:host {
  --_tone: var(--_accent);
  --_bar: 0.5rem;
  --_ring-size: 2.5rem;
  display: block;
}
:host([variant="circular"]) { display: inline-block; vertical-align: middle; }
:host([tone="success"]) { --_tone: var(--_success); }
:host([tone="warning"]) { --_tone: var(--_warning); }
:host([tone="danger"]) { --_tone: var(--_danger); }
:host([size="sm"]) { --_bar: 0.25rem; --_ring-size: 1.5rem; }
:host([size="lg"]) { --_bar: 0.75rem; --_ring-size: 3.5rem; }

.base { display: flex; align-items: center; gap: 0.75rem; }
.value {
  flex: none; font-size: var(--_text-size); font-variant-numeric: tabular-nums;
  color: var(--_muted); line-height: 1;
}

/* linear */
.track {
  position: relative; flex: 1; min-width: 0; height: var(--_bar); overflow: hidden;
  border-radius: 999px; background: var(--_surface-2);
}
.indicator {
  position: absolute; inset-block: 0; inset-inline-start: 0;
  width: var(--_percent, 0%); border-radius: inherit; background: var(--_tone);
  transition: width var(--_duration) ease;
}
.base[data-indeterminate] .indicator {
  width: 40%;
  animation: fw-progress-slide 1.2s ease-in-out infinite;
}
@keyframes fw-progress-slide {
  from { inset-inline-start: -40%; }
  to { inset-inline-start: 100%; }
}

/* circular */
.circle { position: relative; display: inline-flex; width: var(--_ring-size); height: var(--_ring-size); }
.circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.circle-track { stroke: var(--_surface-2); }
.circle-indicator {
  stroke: var(--_tone); stroke-linecap: round;
  transition: stroke-dashoffset var(--_duration) ease;
}
.base[data-indeterminate] .circle svg { animation: fw-progress-spin 0.9s linear infinite; }
.circle .value {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: calc(var(--_ring-size) * 0.26); color: var(--_text);
}

@keyframes fw-progress-spin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }

/* Reduced motion: an indeterminate bar or ring does not move. It is drawn
   full and faint, so it cannot be mistaken for a partial amount. */
@media (prefers-reduced-motion: reduce) {
  .base[data-indeterminate] .indicator { animation: none; width: 100%; inset-inline-start: 0; opacity: 0.35; }
  .base[data-indeterminate] .circle svg { animation: none; }
  .base[data-indeterminate] .circle-indicator { stroke-dasharray: 100 0; opacity: 0.35; }
}
`;

/**
 * `<fw-progress>` — how far along a task is, as a bar or a ring.
 *
 * ```html
 * <fw-progress label="Upload" value="40"></fw-progress>
 * <fw-progress label="Sessions used" value="7" max="12" show-value tone="warning"></fw-progress>
 * <fw-progress label="Syncing" variant="circular"></fw-progress>   <!-- indeterminate -->
 * <fw-progress label="Profile complete" variant="circular" size="lg" value="80" show-value></fw-progress>
 * ```
 *
 * Without a `value` — or with `indeterminate` — it shows ongoing activity
 * with no amount, and `aria-valuenow` is left off, which is how a screen
 * reader knows the difference. `value` is clamped to `0…max`.
 *
 * A `role="progressbar"` named by `label`. The label is not shown; put
 * visible text beside it when sighted users need it too.
 *
 * Parts: `base`, `track`, `indicator` (linear), `circle`, `circle-track`,
 * `circle-indicator` (circular), `value`.
 */
export class FwProgress extends FwElement {
  static override props: PropMap = {
    value: { type: "number" },
    max: { type: "number", default: 100 },
    indeterminate: { type: "boolean", reflect: true },
    variant: { type: "string", reflect: true, default: "linear" },
    tone: { type: "string", reflect: true, default: "accent" },
    size: { type: "string", reflect: true, default: "md" },
    label: { type: "string" },
    showValue: { type: "boolean", attribute: "show-value", reflect: true },
  };
  static override styles = styles;

  declare value: number | null;
  declare max: number;
  declare indeterminate: boolean;
  declare variant: ProgressVariant;
  declare tone: ProgressTone;
  declare size: ProgressSize;
  declare label: string | null;
  declare showValue: boolean;

  #base!: HTMLDivElement;
  #track!: HTMLDivElement;
  #circle!: HTMLSpanElement;
  #circleIndicator!: SVGCircleElement;
  #value!: HTMLSpanElement;

  protected render(root: ShadowRoot): void {
    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");
    this.#base.setAttribute("role", "progressbar");
    this.#base.setAttribute("aria-valuemin", "0");

    this.#track = document.createElement("div");
    this.#track.className = "track";
    this.#track.setAttribute("part", "track");
    this.#track.setAttribute("aria-hidden", "true");
    const indicator = document.createElement("div");
    indicator.className = "indicator";
    indicator.setAttribute("part", "indicator");
    this.#track.append(indicator);

    this.#circle = document.createElement("span");
    this.#circle.className = "circle";
    this.#circle.setAttribute("part", "circle");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 36 36");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const ring = (className: string) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("class", className);
      c.setAttribute("part", className);
      c.setAttribute("cx", "18");
      c.setAttribute("cy", "18");
      c.setAttribute("r", "15.5");
      c.setAttribute("fill", "none");
      c.setAttribute("stroke-width", "3");
      // Normalised, so a dash of 40 is 40% of the ring whatever its radius.
      c.setAttribute("pathLength", "100");
      return c;
    };
    this.#circleIndicator = ring("circle-indicator");
    this.#circleIndicator.setAttribute("stroke-dasharray", "100");
    svg.append(ring("circle-track"), this.#circleIndicator);
    this.#circle.append(svg);

    this.#value = document.createElement("span");
    this.#value.className = "value";
    this.#value.setAttribute("part", "value");
    this.#value.setAttribute("aria-hidden", "true");

    this.#base.append(this.#track, this.#circle);
    root.append(this.#base);
  }

  protected override connected(scope: Scope): void {
    const base = this.#base;

    scope.bind(() => {
      const circular = this.prop<string | null>("variant").get() === "circular";
      this.#track.hidden = circular;
      this.#circle.hidden = !circular;
      // The number sits inside the ring, or after the bar.
      const home = circular ? this.#circle : base;
      if (this.#value.parentNode !== home) home.append(this.#value);
    });

    scope.bind(() => {
      const raw = this.prop<number | null>("value").get();
      const rawMax = this.prop<number | null>("max").get();
      const max = rawMax !== null && Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
      const indeterminate =
        this.prop<boolean>("indeterminate").get() || raw === null || !Number.isFinite(raw);

      base.setAttribute("aria-valuemax", String(max));
      if (indeterminate) {
        base.toggleAttribute("data-indeterminate", true);
        base.removeAttribute("aria-valuenow");
        base.removeAttribute("aria-valuetext");
        base.style.removeProperty("--_percent");
        this.#circleIndicator.setAttribute("stroke-dashoffset", "75");
        this.#value.textContent = "";
        this.#value.hidden = true;
        return;
      }

      const value = Math.min(max, Math.max(0, raw));
      const percent = (value / max) * 100;
      const rounded = Math.round(percent);
      base.toggleAttribute("data-indeterminate", false);
      base.setAttribute("aria-valuenow", String(value));
      // A value out of 12 sessions reads better as a percentage than "7".
      if (max !== 100) base.setAttribute("aria-valuetext", `${rounded}%`);
      else base.removeAttribute("aria-valuetext");
      base.style.setProperty("--_percent", `${percent}%`);
      this.#circleIndicator.setAttribute("stroke-dashoffset", String(100 - percent));
      this.#value.textContent = `${rounded}%`;
      this.#value.hidden = !this.prop<boolean>("showValue").get();
    });

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) base.setAttribute("aria-label", label);
      else base.removeAttribute("aria-label");
    });
  }
}
