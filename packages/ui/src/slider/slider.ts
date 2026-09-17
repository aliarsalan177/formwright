import { computed, signal, type ReadSignal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

const styles =
  fieldStyles +
  /* css */ `
:host { --_track: 0.375rem; --_thumb: 1.125rem; }
:host([size="sm"]) { --_track: 0.25rem; --_thumb: 0.875rem; }
:host([size="lg"]) { --_track: 0.5rem; --_thumb: 1.375rem; }

.header { display: flex; align-items: baseline; gap: 0.75rem; }
.header .label { flex: 1; min-width: 0; }
.value {
  margin-inline-start: auto; font-size: var(--_text-size); line-height: 1.25rem;
  font-weight: 500; color: var(--_muted); font-variant-numeric: tabular-nums;
}

/* The frame's bordered box does not suit a slider: keep its height only. */
.control, .control:focus-within, :host([invalid]) .control, :host([invalid]) .control:focus-within {
  padding: 0; border: 0; background: transparent; box-shadow: none;
}
:host([disabled]) .control { background: transparent; opacity: 1; cursor: default; }

.range {
  --_thumb-shadow: 0 1px 3px color-mix(in srgb, var(--_backdrop) 45%, transparent);
  --_thumb-halo: 0 0 0 4px color-mix(in srgb, var(--_accent) 18%, transparent);
  --_fill-at: calc(var(--_thumb) / 2 + (100% - var(--_thumb)) * var(--_fill, 0));
  --_fill-dir: to right;
  flex: 1; min-width: 0; height: var(--_thumb); margin: 0;
  -webkit-appearance: none; appearance: none; background: transparent;
  cursor: pointer; outline: none;
}
:host(:dir(rtl)) .range { --_fill-dir: to left; }
.range:disabled { cursor: not-allowed; opacity: 0.55; }

.range::-webkit-slider-runnable-track {
  height: var(--_track); border-radius: 999px;
  background: linear-gradient(var(--_fill-dir), var(--_accent) var(--_fill-at), color-mix(in srgb, var(--_text) 10%, var(--_surface)) var(--_fill-at));
}
.range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: var(--_thumb); height: var(--_thumb);
  margin-top: calc((var(--_track) - var(--_thumb)) / 2);
  border: 2px solid var(--_accent); border-radius: 50%; background: var(--_surface);
  box-shadow: var(--_thumb-shadow);
  transition: box-shadow var(--_duration), transform var(--_duration);
}
.range:hover:not(:disabled)::-webkit-slider-thumb { box-shadow: var(--_thumb-shadow), var(--_thumb-halo); }
.range:focus-visible::-webkit-slider-thumb { box-shadow: var(--_thumb-shadow), var(--_ring); }
.range:active:not(:disabled)::-webkit-slider-thumb { transform: scale(1.1); }

.range::-moz-range-track {
  height: var(--_track); border-radius: 999px;
  background: color-mix(in srgb, var(--_text) 10%, var(--_surface));
}
.range::-moz-range-progress { height: var(--_track); border-radius: 999px; background: var(--_accent); }
.range::-moz-range-thumb {
  box-sizing: border-box; width: var(--_thumb); height: var(--_thumb);
  border: 2px solid var(--_accent); border-radius: 50%; background: var(--_surface);
  box-shadow: var(--_thumb-shadow);
  transition: box-shadow var(--_duration);
}
.range:hover:not(:disabled)::-moz-range-thumb { box-shadow: var(--_thumb-shadow), var(--_thumb-halo); }
.range:focus-visible::-moz-range-thumb { box-shadow: var(--_thumb-shadow), var(--_ring); }

:host([invalid]) .range::-webkit-slider-thumb { border-color: var(--_danger); }
:host([invalid]) .range::-moz-range-thumb { border-color: var(--_danger); }
:host([invalid]) .range { --_thumb-halo: 0 0 0 4px color-mix(in srgb, var(--_danger) 18%, transparent); }
`;

/**
 * `<fw-slider>` — choose a number from a range by dragging.
 *
 * ```html
 * <fw-slider label="Volume" name="volume" value="40" show-value></fw-slider>
 * <fw-slider label="Discount %" min="0" max="50" step="5" value="10"></fw-slider>
 * <fw-slider label="Rating" min="1" max="5" size="sm" help="1 is lowest"></fw-slider>
 * ```
 *
 * A real `<input type="range">` underneath, so arrow keys, Page Up/Down,
 * Home/End, touch and screen-reader value announcements are the browser's
 * own; only its look is replaced, with the track filled up to the thumb.
 *
 * `value` is always a number within `min`..`max` and on a `step`: setting
 * 7.3 with a step of 1 reads back as 7, and 500 with a max of 100 as 100.
 * With no value it sits at the midpoint, like the native control.
 *
 * Events: `input` continuously while dragging, `change` when released.
 * Slots: `label`, `help`.
 * Parts: `field`, `label`, `value`, `control`, `input`, `help`, `error`.
 */
export class FwSlider extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "number" },
    min: { type: "number", default: 0 },
    max: { type: "number", default: 100 },
    step: { type: "number", default: 1 },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    showValue: { type: "boolean", reflect: true },
    size: { type: "string", reflect: true, default: "md" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare min: number;
  declare max: number;
  declare step: number;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare showValue: boolean;
  declare size: "sm" | "md" | "lg";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #input!: HTMLInputElement;
  #header!: HTMLElement;
  #valueText!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #defaultValue: number | null = null;
  readonly #slots = signal(0);

  /** The raw value, clamped to the range and aligned to the step. */
  readonly #value: ReadSignal<number> = computed(() =>
    normalise(
      this.prop<number | null>("value").get(),
      this.prop<number | null>("min").get(),
      this.prop<number | null>("max").get(),
      this.prop<number | null>("step").get(),
    ),
  );

  /** The current value: always within `min`..`max` and on a `step`. */
  get value(): number {
    return this.#value.get();
  }

  set value(value: number | string | null) {
    const n = value === null || value === "" ? null : Number(value);
    this._writeProp("value", n === null || Number.isNaN(n) ? null : n);
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-slider");
    this.#parts = buildField(id);
    const parts = this.#parts;

    // Label on the start side, the current value on the end side.
    this.#header = document.createElement("div");
    this.#header.className = "header";
    this.#valueText = document.createElement("span");
    this.#valueText.className = "value";
    this.#valueText.setAttribute("part", "value");
    // The range input already announces its value.
    this.#valueText.setAttribute("aria-hidden", "true");
    parts.label.replaceWith(this.#header);
    this.#header.append(parts.label, this.#valueText);

    this.#input = document.createElement("input");
    this.#input.type = "range";
    this.#input.id = id;
    this.#input.className = "range";
    this.#input.setAttribute("part", "input");
    parts.control.append(this.#input);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field);
    const initial = this.getAttribute("value");
    this.#defaultValue = initial === null || initial.trim() === "" ? null : Number(initial);
  }

  protected override connected(scope: Scope): void {
    const input = this.#input;
    const parts = this.#parts;

    scope.bind(() => {
      const min = this.prop<number | null>("min").get() ?? 0;
      const max = Math.max(min, this.prop<number | null>("max").get() ?? 100);
      const step = this.prop<number | null>("step").get();
      const value = this.#value.get();
      // Bounds before value, or the browser clamps the value to stale ones.
      input.min = String(min);
      input.max = String(max);
      input.step = step !== null && step > 0 ? String(step) : "any";
      const text = String(value);
      if (input.value !== text) input.value = text;
      const fill = max === min ? 0 : (value - min) / (max - min);
      input.style.setProperty("--_fill", String(fill));
      this.#valueText.textContent = text;
      this.setFormValue(text);
      this.#syncValidity();
    });

    scope.bind(() => {
      input.disabled = this.isDisabled.get();
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      const hasLabel = Boolean(label) || slotHasContent(this.root, "label");
      parts.label.hidden = !hasLabel;
      parts.required.hidden = true;
      const showValue = this.prop<boolean>("showValue").get();
      this.#valueText.hidden = !showValue;
      this.#header.hidden = !hasLabel && !showValue;

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      input.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));

      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
      this.#syncValidity();
    });

    const onInput = (event: Event) => {
      const n = Number(input.value);
      if (!Number.isNaN(n)) this.prop<number | null>("value").set(n);
      // Browsers compose a native `input`, so it already reaches the host.
      if (!event.composed) this.emit("input");
    };
    const onChange = () => this.emit("change");
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onChange);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** A range always holds a valid number; only an `error` makes it invalid. */
  #syncValidity(): void {
    const error = this.prop<string | null>("error").peek();
    if (error) this.setValidity({ customError: true }, error, this.#input);
    else this.setValidity({});
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  /** Move by `steps` steps (default 1), as an arrow key would. Does not emit events. */
  stepUp(steps = 1): void {
    this.value = this.#value.peek() + steps * this.#effectiveStep();
  }

  /** Move back by `steps` steps (default 1). Does not emit events. */
  stepDown(steps = 1): void {
    this.value = this.#value.peek() - steps * this.#effectiveStep();
  }

  #effectiveStep(): number {
    const step = this.prop<number | null>("step").peek();
    return step !== null && step > 0 ? step : 1;
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }
}

/** Clamp to [min, max] and snap to the step grid anchored at min, as a native range does. */
export function normalise(
  raw: number | null,
  minProp: number | null,
  maxProp: number | null,
  stepProp: number | null,
): number {
  const min = minProp ?? 0;
  const max = Math.max(min, maxProp ?? 100);
  let value = raw === null || !Number.isFinite(raw) ? min + (max - min) / 2 : raw;
  value = Math.min(max, Math.max(min, value));
  if (stepProp !== null && stepProp > 0) {
    const decimals = Math.max(decimalsOf(stepProp), decimalsOf(min));
    // Trim float noise before rounding: 0.35 / 0.1 is 3.4999…, not 3.5.
    const steps = Math.round(Number(((value - min) / stepProp).toFixed(9)));
    value = min + steps * stepProp;
    // Rounding up can overshoot a max that is not on the grid.
    if (value > max) value -= stepProp;
    value = Number(value.toFixed(decimals));
  }
  return value;
}

function decimalsOf(n: number): number {
  const text = String(n);
  const e = text.indexOf("e-");
  if (e !== -1) return Number(text.slice(e + 2));
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}
