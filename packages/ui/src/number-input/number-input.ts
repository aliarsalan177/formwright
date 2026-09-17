import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

const styles =
  fieldStyles +
  /* css */ `
.input {
  flex: 1; min-width: 0; height: calc(var(--_height) - 2px);
  padding: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: var(--_text-size); color: inherit;
  font-variant-numeric: tabular-nums;
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.input:disabled { cursor: not-allowed; }
.stepper {
  touch-action: manipulation; user-select: none;
  transition: background-color var(--_duration), color var(--_duration);
}
.stepper svg { display: block; }
.stepper:active:not(:disabled) { background: color-mix(in srgb, var(--_text) 10%, var(--_surface)); color: var(--_text); }
.stepper:disabled { opacity: 0.4; cursor: not-allowed; background: transparent; color: var(--_muted); }
.decrement { margin-inline-end: -0.25rem; }
:host([stepper-position="split"]) .decrement { order: -1; margin-inline: -0.375rem 0; }
:host([stepper-position="split"]) .input { text-align: center; }
`;

const MINUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>`;
const PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

/** Delay before a held stepper starts repeating, then the repeat interval. */
const HOLD_DELAY = 400;
const HOLD_INTERVAL = 60;

interface Symbols {
  group: string;
  decimal: string;
  digits: string;
}

const symbolsCache = new Map<string, Symbols>();

function numberFormat(locale: string | null, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale ?? undefined, options);
  } catch {
    // An invalid locale tag: the runtime's own locale rather than nothing.
    return new Intl.NumberFormat(undefined, options);
  }
}

/** The grouping and decimal marks, and the digits, a locale writes numbers with. */
function symbolsFor(locale: string | null): Symbols {
  const key = locale ?? "";
  let symbols = symbolsCache.get(key);
  if (!symbols) {
    const parts = numberFormat(locale, {}).formatToParts(12345.6);
    const digits = numberFormat(locale, { useGrouping: false }).format(9876543210);
    symbols = {
      group: parts.find((p) => p.type === "group")?.value ?? ",",
      decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
      digits: [...digits].reverse().join(""),
    };
    symbolsCache.set(key, symbols);
  }
  return symbols;
}

/**
 * Read a number the way a person in `locale` writes it: "1,234.5",
 * "1.234,5", "1 234,5", "١٬٢٣٤". Grouping marks are dropped.
 * Returns null for empty text and NaN for text that is not a number.
 */
export function parseLocaleNumber(text: string, locale: string | null): number | null {
  const { group, decimal, digits } = symbolsFor(locale);
  let s = text.trim();
  if (s === "") return null;
  // A sign or a point on its own is a number still being typed, not a bad one.
  if (/^[-+\u2212]?[.,]?$/.test(s)) return null;
  // Locale digits → ASCII.
  if (digits !== "0123456789") {
    s = [...s]
      .map((c) => {
        const i = digits.indexOf(c);
        return i === -1 ? c : String(i);
      })
      .join("");
  }
  // Space-like group marks come in several flavours; drop all of them.
  s = s.replace(/[\s\u00a0\u202f]/g, "");
  if (group.trim() !== "") s = s.split(group).join("");
  if (decimal !== ".") s = s.split(decimal).join(".");
  s = s.replace(/[\u2212\u2012\u2013]/g, "-");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return Number.NaN;
  return Number(s);
}

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const [mantissa = "", exponent] = String(n).toLowerCase().split("e");
  const fraction = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, fraction - (exponent ? Number(exponent) : 0));
}

function roundTo(n: number, places: number): number {
  const p = Math.min(Math.max(Math.trunc(places), 0), 15);
  const factor = 10 ** p;
  return Math.round((n + Math.sign(n) * Number.EPSILON) * factor) / factor;
}

/**
 * `<fw-number-input>` — a number, typed or stepped, in the user's own notation.
 *
 * ```html
 * <fw-number-input label="Quantity" name="qty" value="1" min="1" max="99"></fw-number-input>
 *
 * <fw-number-input
 *   label="Monthly fee"
 *   name="fee"
 *   min="0"
 *   step="500"
 *   precision="2"
 *   locale="en-PK"
 *   stepper-position="split"
 * ></fw-number-input>
 * ```
 *
 * A WAI-ARIA spinbutton. ArrowUp / ArrowDown step, PageUp / PageDown step ten
 * times, Home and End go to `min` and `max`. The − and + buttons repeat
 * while held. Typed text is read in `locale` — grouping marks are ignored —
 * and on Enter or leaving the field it is rounded to `precision` places,
 * clamped to `min`…`max` and shown formatted.
 *
 * `value` is a number, or null when empty. Validity reports `badInput` for
 * text that is not a number, `rangeUnderflow` / `rangeOverflow` while a typed
 * value is outside the range, and `valueMissing` when required and empty.
 *
 * Events: `input` as the value changes, `change` when it is committed.
 * Slots: `label`, `help`, `prefix`, `suffix`.
 * Parts: `field`, `label`, `control`, `input`, `decrement`, `increment`, `help`, `error`.
 */
export class FwNumberInput extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "number" },
    min: { type: "number" },
    max: { type: "number" },
    step: { type: "number", default: 1 },
    precision: { type: "number" },
    locale: { type: "string" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    readOnly: { type: "boolean", attribute: "readonly", reflect: true },
    noStepper: { type: "boolean", attribute: "no-stepper" },
    stepperPosition: {
      type: "string",
      attribute: "stepper-position",
      reflect: true,
      default: "end",
    },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare value: number | null;
  declare min: number | null;
  declare max: number | null;
  declare step: number;
  declare precision: number | null;
  declare locale: string | null;
  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare readOnly: boolean;
  declare noStepper: boolean;
  declare stepperPosition: "end" | "split";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #input!: HTMLInputElement;
  #decrement!: HTMLButtonElement;
  #increment!: HTMLButtonElement;
  #helpText!: HTMLSpanElement;
  #defaultValue: number | null = null;
  /** The text holds the user's own typing, not the formatted value. */
  #editing = false;
  /** Set while the value is written from typing, so the text is not rewritten under the caret. */
  #fromInput = false;
  /** The value `change` was last emitted for. */
  #committed: number | null = null;
  readonly #bad = signal(false);
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-number-input");
    this.#parts = buildField(id);
    const parts = this.#parts;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.className = "input";
    input.setAttribute("part", "input");
    input.setAttribute("role", "spinbutton");
    input.setAttribute("inputmode", "decimal");
    input.setAttribute("autocomplete", "off");
    this.#input = input;

    const suffix = document.createElement("slot");
    suffix.name = "suffix";

    // Out of the tab order, as in the APG spinbutton: the arrow keys do
    // the same job from the text box.
    const button = (name: "decrement" | "increment", label: string, icon: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.className = `icon-button stepper ${name}`;
      b.setAttribute("part", name);
      b.setAttribute("aria-label", label);
      b.innerHTML = icon;
      return b;
    };
    this.#decrement = button("decrement", "Decrease", MINUS);
    this.#increment = button("increment", "Increase", PLUS);

    parts.control.append(prefix, input, suffix, this.#decrement, this.#increment);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field);
    const initial = this.getAttribute("value");
    this.#defaultValue = initial === null || initial.trim() === "" ? null : Number(initial);
    if (Number.isNaN(this.#defaultValue)) this.#defaultValue = null;
    this.#committed = this.prop<number | null>("value").peek();
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const input = this.#input;
    let lastValue: number | null | undefined;

    // --- press and hold --------------------------------------------------
    let repeatTimer: ReturnType<typeof setTimeout> | null = null;
    let holding = false;
    /** The pointer already stepped; the click that follows must not step again. */
    let pointerStepped = false;

    function clearTimer() {
      if (repeatTimer !== null) clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    const stopRepeat = (emit: boolean) => {
      clearTimer();
      if (!holding) return;
      holding = false;
      if (emit) this.#emitChange();
    };
    scope.add(() => stopRepeat(false));

    // Value → the formatted text and the spinbutton's state.
    scope.bind(() => {
      const value = this.prop<number | null>("value").get();
      const locale = this.prop<string | null>("locale").get();
      const precision = this.prop<number | null>("precision").get();
      const changed = value !== lastValue;
      lastValue = value;
      if (!this.#fromInput && (changed || !this.#editing)) {
        this.#editing = false;
        this.#bad.set(false);
        const text = this.#format(value, locale, precision);
        if (input.value !== text) input.value = text;
      }
      if (value === null) {
        input.removeAttribute("aria-valuenow");
        input.removeAttribute("aria-valuetext");
      } else {
        input.setAttribute("aria-valuenow", String(value));
        input.setAttribute("aria-valuetext", this.#format(value, locale, precision));
      }
      this.#syncFormState();
    });

    scope.bind(() => {
      const min = this.prop<number | null>("min").get();
      const max = this.prop<number | null>("max").get();
      if (min === null) input.removeAttribute("aria-valuemin");
      else input.setAttribute("aria-valuemin", String(min));
      if (max === null) input.removeAttribute("aria-valuemax");
      else input.setAttribute("aria-valuemax", String(max));
      this.#syncFormState();
    });

    scope.bind(() => {
      const value = this.prop<number | null>("value").get();
      const min = this.prop<number | null>("min").get();
      const max = this.prop<number | null>("max").get();
      const locked = this.isDisabled.get() || this.prop<boolean>("readOnly").get();
      const hidden = this.prop<boolean>("noStepper").get();
      input.disabled = this.isDisabled.get();
      input.readOnly = this.prop<boolean>("readOnly").get();
      this.#decrement.hidden = hidden;
      this.#increment.hidden = hidden;
      this.#decrement.disabled = locked || (value !== null && min !== null && value <= min);
      this.#increment.disabled = locked || (value !== null && max !== null && value >= max);
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
    });

    scope.bind(() => {
      this.#slots.get();
      this.#bad.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      parts.required.hidden = !required;
      input.setAttribute("aria-required", String(required));

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      input.setAttribute("aria-invalid", String(Boolean(error) || this.#bad.peek()));
      this.toggleAttribute("invalid", Boolean(error));
      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
      this.#syncFormState();
    });

    const onInput = () => {
      this.#editing = true;
      const parsed = parseLocaleNumber(input.value, this.prop<string | null>("locale").peek());
      const bad = parsed !== null && Number.isNaN(parsed);
      this.#fromInput = true;
      try {
        this.#bad.set(bad);
        this.value = bad ? null : parsed;
      } finally {
        this.#fromInput = false;
      }
      this.#syncFormState();
      // The inner `input` event carries on to the host with the value set.
    };

    const onChange = (event: Event) => {
      // Commit happens on blur; the host emits its own `change`.
      event.stopPropagation();
    };

    const onBlur = () => this.#commitText();

    const onKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get()) return;
      const readOnly = this.prop<boolean>("readOnly").peek();
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
        case "PageUp":
        case "PageDown": {
          event.preventDefault();
          if (readOnly) return;
          const direction = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : -1;
          const times = event.key.startsWith("Page") ? 10 : 1;
          this.#stepBy(direction, times);
          this.#emitChange();
          return;
        }
        case "Home":
        case "End": {
          const bound = this.prop<number | null>(event.key === "Home" ? "min" : "max").peek();
          if (bound === null) return;
          event.preventDefault();
          if (readOnly) return;
          this.#setFromUser(bound);
          this.#emitChange();
          return;
        }
        case "Enter":
          this.#commitText();
          return;
      }
    };

    const startHold = (event: PointerEvent, direction: 1 | -1) => {
      if (event.button !== 0 || this.isDisabled.get() || this.prop<boolean>("readOnly").peek()) {
        return;
      }
      // Keep focus (and a mobile keyboard, if open) where it is.
      event.preventDefault();
      stopRepeat(false);
      pointerStepped = true;
      holding = true;
      if (!this.#stepBy(direction, 1)) {
        stopRepeat(true);
        return;
      }
      const repeat = (delay: number) => {
        repeatTimer = setTimeout(() => {
          repeatTimer = null;
          const locked = this.isDisabled.peek() || this.prop<boolean>("readOnly").peek();
          if (!locked && this.#stepBy(direction, 1)) repeat(HOLD_INTERVAL);
          else stopRepeat(true);
        }, delay);
      };
      repeat(HOLD_DELAY);
    };

    const onDecDown = (event: PointerEvent) => startHold(event, -1);
    const onIncDown = (event: PointerEvent) => startHold(event, 1);
    const onRelease = () => stopRepeat(true);
    // No click follows a press that ends off the button.
    const onAbandon = () => {
      pointerStepped = false;
      stopRepeat(true);
    };
    // A click with no pointer press first — a screen reader, a keyboard on
    // a focused button — steps once.
    const onClick = (direction: 1 | -1) => () => {
      if (pointerStepped) {
        pointerStepped = false;
        return;
      }
      if (this.isDisabled.get() || this.prop<boolean>("readOnly").peek()) return;
      this.#stepBy(direction, 1);
      this.#emitChange();
    };
    const onDecClick = onClick(-1);
    const onIncClick = onClick(1);

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", onKey);
    this.#decrement.addEventListener("pointerdown", onDecDown);
    this.#increment.addEventListener("pointerdown", onIncDown);
    this.#decrement.addEventListener("click", onDecClick);
    this.#increment.addEventListener("click", onIncClick);
    for (const b of [this.#decrement, this.#increment]) {
      b.addEventListener("pointerup", onRelease);
      b.addEventListener("pointerleave", onAbandon);
      b.addEventListener("pointercancel", onAbandon);
    }
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onChange);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("keydown", onKey);
      this.#decrement.removeEventListener("pointerdown", onDecDown);
      this.#increment.removeEventListener("pointerdown", onIncDown);
      this.#decrement.removeEventListener("click", onDecClick);
      this.#increment.removeEventListener("click", onIncClick);
      for (const b of [this.#decrement, this.#increment]) {
        b.removeEventListener("pointerup", onRelease);
        b.removeEventListener("pointerleave", onAbandon);
        b.removeEventListener("pointercancel", onAbandon);
      }
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #format(value: number | null, locale: string | null, precision: number | null): string {
    if (value === null || Number.isNaN(value)) return "";
    const places = precision === null ? null : Math.min(Math.max(Math.trunc(precision), 0), 20);
    return numberFormat(locale, {
      minimumFractionDigits: places ?? 0,
      maximumFractionDigits: places ?? 20,
    }).format(value);
  }

  /** Round to `precision` and clamp to the range. */
  #normalise(n: number, extraPlaces?: number): number {
    const precision = this.prop<number | null>("precision").peek();
    const min = this.prop<number | null>("min").peek();
    const max = this.prop<number | null>("max").peek();
    // Without a precision, typed numbers keep their own decimals and steps
    // keep the step's — never the float noise of 0.1 + 0.2.
    let v = roundTo(n, precision ?? extraPlaces ?? Math.min(decimalsOf(n), 10));
    if (min !== null && v < min) v = min;
    if (max !== null && v > max) v = max;
    return v;
  }

  /** Step from the current value. Returns whether the value moved. */
  #stepBy(direction: 1 | -1, times: number): boolean {
    const locale = this.prop<string | null>("locale").peek();
    let base: number | null = this.prop<number | null>("value").peek();
    if (this.#editing) {
      const parsed = parseLocaleNumber(this.#input.value, locale);
      base = parsed === null || Number.isNaN(parsed) ? null : parsed;
    }
    const step = Math.abs(this.prop<number | null>("step").peek() ?? 1) || 1;
    const places = Math.max(decimalsOf(step), base === null ? 0 : decimalsOf(base));
    const next =
      base === null ? this.#normalise(0) : this.#normalise(base + direction * step * times, places);
    return this.#setFromUser(next);
  }

  /** Set a committed value from a user action, emitting `input` if it moved. */
  #setFromUser(next: number | null): boolean {
    const before = this.prop<number | null>("value").peek();
    const wasBad = this.#bad.peek();
    this.#editing = false;
    this.#bad.set(false);
    this.value = next;
    const text = this.#format(
      next,
      this.prop<string | null>("locale").peek(),
      this.prop<number | null>("precision").peek(),
    );
    if (this.#input.value !== text) this.#input.value = text;
    const moved = before !== next || wasBad;
    if (moved) this.emit("input");
    return moved;
  }

  #emitChange(): void {
    const value = this.prop<number | null>("value").peek();
    if (value === this.#committed) return;
    this.#committed = value;
    this.emit("change");
  }

  /** Read, round and clamp the typed text, then commit it. */
  #commitText(): void {
    if (!this.#editing) {
      this.#emitChange();
      return;
    }
    const parsed = parseLocaleNumber(this.#input.value, this.prop<string | null>("locale").peek());
    if (parsed !== null && Number.isNaN(parsed)) {
      // Not a number: left as typed, so it can be corrected.
      this.#bad.set(true);
      this.#syncFormState();
      this.#emitChange();
      return;
    }
    this.#setFromUser(parsed === null ? null : this.#normalise(parsed));
    this.#emitChange();
  }

  #syncFormState(): void {
    if (!this.#input) return;
    const value = this.prop<number | null>("value").peek();
    this.setFormValue(value === null ? null : String(value));
    const error = this.prop<string | null>("error").peek();
    const min = this.prop<number | null>("min").peek();
    const max = this.prop<number | null>("max").peek();
    const locale = this.prop<string | null>("locale").peek();
    const precision = this.prop<number | null>("precision").peek();
    const input = this.#input;
    if (error) {
      this.setValidity({ customError: true }, error, input);
    } else if (this.#bad.peek()) {
      this.setValidity({ badInput: true }, "Please enter a number.", input);
    } else if (value === null) {
      if (this.prop<boolean>("required").peek()) {
        this.setValidity({ valueMissing: true }, "Please enter a number.", input);
      } else {
        this.setValidity({});
      }
    } else if (min !== null && value < min) {
      this.setValidity(
        { rangeUnderflow: true },
        `Value must be ${this.#format(min, locale, precision)} or more.`,
        input,
      );
    } else if (max !== null && value > max) {
      this.setValidity(
        { rangeOverflow: true },
        `Value must be ${this.#format(max, locale, precision)} or less.`,
        input,
      );
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.#editing = false;
    this.#bad.set(false);
    this.value = this.#defaultValue;
    this.#committed = this.#defaultValue;
    if (this.#input) {
      this.#input.value = this.#format(
        this.#defaultValue,
        this.prop<string | null>("locale").peek(),
        this.prop<number | null>("precision").peek(),
      );
    }
    this.#syncFormState();
  }

  protected override restoreValue(state: string): void {
    const n = state.trim() === "" ? null : Number(state);
    this.value = n === null || Number.isNaN(n) ? null : n;
    this.#committed = this.value;
  }

  /** Step up by `step` × `times`, as the + button does. */
  stepUp(times = 1): void {
    if (this.#input) this.#stepBy(1, times);
  }

  /** Step down by `step` × `times`, as the − button does. */
  stepDown(times = 1): void {
    if (this.#input) this.#stepBy(-1, times);
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }
}
