import { signal } from "@formwright/reactive";
import { anchorTo, type Anchored, type Placement, type Scope } from "@formwright/ui-core";
import { FwCalendar, type CalendarMode, type CalendarSelectDetail } from "../calendar/calendar.js";
import {
  formatISO,
  isValidISO,
  parseDate,
  resolveLocale,
  todayISO,
  type DateFormat,
} from "../calendar/dates.js";
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
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.input:disabled { cursor: not-allowed; }
.icon-button:disabled { cursor: not-allowed; opacity: 0.6; }
.icon-button:disabled:hover { background: transparent; color: var(--_muted); }

.popup {
  margin: 0; inset: auto; padding: 0; z-index: 1000;
  max-height: var(--fw-available-height, none); overflow: auto; overscroll-behavior: contain;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}
`;

const ICON_CALENDAR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
const ICON_CLEAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** Separator between the two dates of a range as displayed. */
const RANGE_SEPARATOR = " – ";

function splitRange(value: string | null | undefined): [string, string] {
  const [start = "", end = ""] = (value ?? "").split("/");
  return [start, end];
}

/**
 * `<fw-date-picker>` — a date field with a calendar popup.
 *
 * ```html
 * <fw-date-picker label="Date of birth" name="dob" required></fw-date-picker>
 * <fw-date-picker label="Start" min="2026-01-01" format="long" clearable></fw-date-picker>
 * <fw-date-picker label="Stay" name="stay" mode="range" value="2026-09-01/2026-09-12"></fw-date-picker>
 * ```
 *
 * The value is always ISO, `YYYY-MM-DD`, whatever the display looks like.
 * The field shows it formatted for `locale` in the `format` style (short,
 * medium or long) and accepts typing: ISO, the locale's numeric short format
 * or a written month are parsed when the field loses focus or on Enter.
 * Text that is not a date leaves the value empty and the field in
 * `badInput`, like a native date input.
 *
 * **Ranges.** With `mode="range"` the value is an ISO 8601 interval,
 * `start/end` (`2026-09-01/2026-09-12`), and the form submits that one
 * string under `name`. `valueStart` and `valueEnd` read and write the two
 * halves. `required` is only satisfied once both are chosen. The popup
 * closes after the end is picked, and a half-finished range is discarded
 * when it closes without one.
 *
 * Keyboard: ArrowDown (or Alt+ArrowDown) opens the calendar and focuses the
 * selected day, or today; inside it, the calendar's own grid keys apply;
 * Tab cycles through the popup; Escape closes it and returns focus to the
 * field. The popup is in the top layer, so it is never clipped by an
 * `overflow: hidden` ancestor, and a press outside closes it.
 *
 * `close-on-select="false"` keeps the popup open after a pick.
 * `isDateDisabled: (iso) => boolean` (property only) is passed to the calendar.
 *
 * Events: `input` and `change` when the value is committed, `fw-show`, `fw-hide`.
 * Slots: `label`, `help`, `prefix`.
 * Parts: `field`, `label`, `control`, `input`, `clear`, `toggle`, `popup`,
 * `calendar`, `help`, `error` — and the calendar's `day`, `grid`, `heading`,
 * `prev` and `next` as `calendar-day` and so on.
 * Methods: `show()`, `hide()`, `focus()`.
 */
export class FwDatePicker extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    mode: { type: "string", reflect: true, default: "single" },
    min: { type: "string" },
    max: { type: "string" },
    locale: { type: "string" },
    firstDayOfWeek: { type: "number" },
    format: { type: "string", default: "medium" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    readOnly: { type: "boolean", attribute: "readonly", reflect: true },
    clearable: { type: "boolean" },
    // JSON, so `close-on-select="false"` can switch it off.
    closeOnSelect: { type: "json", default: true },
    placement: { type: "string", default: "bottom-start" },
    open: { type: "boolean", reflect: true },
    today: { type: "string" },
    isDateDisabled: { type: "json", attribute: false },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare value: string;
  declare mode: CalendarMode;
  declare min: string | null;
  declare max: string | null;
  declare locale: string | null;
  declare firstDayOfWeek: number | null;
  declare format: DateFormat;
  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare readOnly: boolean;
  declare clearable: boolean;
  declare closeOnSelect: boolean;
  declare placement: Placement;
  declare open: boolean;
  declare today: string | null;
  declare isDateDisabled: ((iso: string) => boolean) | null;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #input!: HTMLInputElement;
  #toggle!: HTMLButtonElement;
  #clear!: HTMLButtonElement;
  #popup!: HTMLElement;
  #calendar!: FwCalendar;
  #helpText!: HTMLSpanElement;
  #defaultValue = "";
  #anchored: Anchored | null = null;
  /** The field holds text that is not a date. */
  readonly #badInput = signal(false);
  readonly #slots = signal(0);

  /** Start of the range (`mode="range"`), or the date in single mode. */
  get valueStart(): string {
    return splitRange(this.prop<string | null>("value").peek())[0];
  }
  set valueStart(start: string) {
    this.value = this.#joinRange(start, this.valueEnd);
  }

  /** End of the range (`mode="range"`); empty in single mode. */
  get valueEnd(): string {
    return splitRange(this.prop<string | null>("value").peek())[1];
  }
  set valueEnd(end: string) {
    this.value = this.#joinRange(this.valueStart, end);
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-date-picker");
    this.#parts = buildField(id);
    const parts = this.#parts;
    const popupId = `${id}-popup`;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.className = "input";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("part", "input");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-controls", popupId);
    input.setAttribute("aria-autocomplete", "none");
    this.#input = input;

    this.#clear = document.createElement("button");
    this.#clear.type = "button";
    this.#clear.className = "icon-button";
    this.#clear.tabIndex = -1;
    this.#clear.setAttribute("part", "clear");
    this.#clear.setAttribute("aria-label", "Clear date");
    this.#clear.innerHTML = ICON_CLEAR;

    this.#toggle = document.createElement("button");
    this.#toggle.type = "button";
    this.#toggle.className = "icon-button";
    this.#toggle.setAttribute("part", "toggle");
    this.#toggle.setAttribute("aria-haspopup", "dialog");
    this.#toggle.setAttribute("aria-controls", popupId);
    this.#toggle.innerHTML = ICON_CALENDAR;

    parts.control.append(prefix, input, this.#clear, this.#toggle);

    this.#popup = document.createElement("div");
    this.#popup.id = popupId;
    this.#popup.className = "popup";
    this.#popup.setAttribute("part", "popup");
    this.#popup.setAttribute("role", "dialog");
    this.#popup.setAttribute("aria-modal", "true");
    if (hasPopover) this.#popup.setAttribute("popover", "manual");
    else this.#popup.hidden = true;

    this.#calendar = document.createElement("fw-calendar") as FwCalendar;
    this.#calendar.setAttribute("part", "calendar");
    this.#calendar.setAttribute(
      "exportparts",
      "day: calendar-day, cell: calendar-cell, grid: calendar-grid, heading: calendar-heading, prev: calendar-prev, next: calendar-next",
    );
    this.#popup.append(this.#calendar);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field, this.#popup);
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const input = this.#input;
    const calendar = this.#calendar;

    // Calendar configuration.
    scope.bind(() => {
      calendar.mode = this.prop<string>("mode").get() === "range" ? "range" : "single";
      calendar.min = this.prop<string | null>("min").get();
      calendar.max = this.prop<string | null>("max").get();
      calendar.locale = this.#locale();
      calendar.firstDayOfWeek = this.prop<number | null>("firstDayOfWeek").get();
      calendar.today = this.prop<string | null>("today").get();
      calendar.isDateDisabled = this.prop<((iso: string) => boolean) | null>(
        "isDateDisabled",
      ).get();
    });

    // Value → the calendar's selection and the text in the field.
    scope.bind(() => {
      this.prop<string | null>("value").get();
      this.prop<string>("mode").get();
      this.prop<string | null>("format").get();
      this.prop<string | null>("locale").get();
      this.#syncCalendar();
      this.#writeText();
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
    });

    // What the form submits, and whether it may.
    scope.bind(() => {
      this.prop<string | null>("value").get();
      this.prop<string>("mode").get();
      this.prop<boolean>("required").get();
      this.prop<string | null>("error").get();
      this.prop<string | null>("min").get();
      this.prop<string | null>("max").get();
      const bad = this.#badInput.get();
      const error = this.prop<string | null>("error").peek();
      input.setAttribute("aria-invalid", String(Boolean(error) || bad));
      this.toggleAttribute("invalid", Boolean(error) || bad);
      this.#syncFormState();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      const readOnly = this.prop<boolean>("readOnly").get();
      input.disabled = disabled;
      input.readOnly = readOnly;
      this.#toggle.disabled = disabled || readOnly;
      this.#clear.hidden =
        !this.prop<boolean>("clearable").get() ||
        (this.prop<string | null>("value").get() ?? "") === "" ||
        disabled ||
        readOnly;
      if ((disabled || readOnly) && this.prop<boolean>("open").peek()) this.open = false;
    });

    scope.bind(() => {
      const range = this.prop<string>("mode").get() === "range";
      const label = range ? "Choose dates" : "Choose date";
      this.#toggle.setAttribute("aria-label", label);
      this.#popup.setAttribute("aria-label", label);
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      parts.required.hidden = !this.prop<boolean>("required").get();
      input.required = this.prop<boolean>("required").get();

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      input.setAttribute("aria-expanded", String(open));
      this.#toggle.setAttribute("aria-expanded", String(open));
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));

    const onInputKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          if (event.ctrlKey || event.metaKey) return;
          event.preventDefault();
          this.#openAndFocus();
          return;
        case "Enter":
          this.#commitText();
          return;
        case "Escape":
          if (this.prop<boolean>("open").peek()) {
            event.preventDefault();
            event.stopPropagation();
            this.#close(true);
          }
          return;
      }
    };

    // The value only changes on commit, so the per-keystroke `input` from
    // the inner field would announce a change that has not happened.
    const onInputInput = (event: Event) => event.stopPropagation();
    const onInputChange = () => this.#commitText();

    const onToggle = () => {
      if (this.prop<boolean>("open").peek()) this.#close(true);
      else this.#openAndFocus();
    };

    const onClear = () => {
      this.#badInput.set(false);
      this.#commit("");
      this.#writeText();
      input.focus();
    };

    // The calendar's own events are internal; the picker reports commits.
    const onCalendarChange = (event: Event) => event.stopPropagation();
    const onCalendarSelect = (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent<CalendarSelectDetail>).detail;
      this.#badInput.set(false);
      if ("value" in detail) this.#commit(detail.value);
      else this.#commit(`${detail.start}/${detail.end}`);
      this.#writeText();
      if (this.prop<unknown>("closeOnSelect").peek() !== false) this.#close(true);
    };

    const onPopupKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.#close(true);
        return;
      }
      if (event.key !== "Tab") return;
      // Keep Tab inside the dialog, as the date picker dialog pattern does.
      const stops = this.#tabStops();
      const first = stops[0];
      const last = stops[stops.length - 1];
      const current = event.composedPath()[0];
      if (!first || !last) return;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onOutside = (event: Event) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.#close(false);
    };

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("keydown", onInputKey);
    input.addEventListener("input", onInputInput);
    input.addEventListener("change", onInputChange);
    this.#toggle.addEventListener("click", onToggle);
    this.#clear.addEventListener("click", onClear);
    calendar.addEventListener("change", onCalendarChange);
    calendar.addEventListener("fw-select", onCalendarSelect);
    this.#popup.addEventListener("keydown", onPopupKey);
    this.root.addEventListener("slotchange", onSlotChange);
    document.addEventListener("pointerdown", onOutside, true);
    scope.add(() => {
      input.removeEventListener("keydown", onInputKey);
      input.removeEventListener("input", onInputInput);
      input.removeEventListener("change", onInputChange);
      this.#toggle.removeEventListener("click", onToggle);
      this.#clear.removeEventListener("click", onClear);
      calendar.removeEventListener("change", onCalendarChange);
      calendar.removeEventListener("fw-select", onCalendarSelect);
      this.#popup.removeEventListener("keydown", onPopupKey);
      this.root.removeEventListener("slotchange", onSlotChange);
      document.removeEventListener("pointerdown", onOutside, true);
    });
  }

  /** Open the calendar and move focus into it. */
  show(): void {
    this.#openAndFocus();
  }

  /** Close the calendar and return focus to the field. */
  hide(): void {
    this.#close(true);
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }

  protected resetValue(): void {
    this.#badInput.set(false);
    this.value = this.#defaultValue;
    this.#writeText();
  }

  protected override restoreValue(state: string): void {
    this.#badInput.set(false);
    this.value = state;
    this.#writeText();
  }

  #openAndFocus(): void {
    if (this.isDisabled.peek() || this.prop<boolean>("readOnly").peek()) return;
    this.open = true;
    this.#calendar.focus();
  }

  #show(): void {
    const popup = this.#popup;
    if (hasPopover) {
      if (!popup.matches(":popover-open")) popup.showPopover();
    } else {
      popup.hidden = false;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.#parts.control, popup, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom-start",
      offset: 4,
    });
    this.#syncCalendar();
    const [start] = splitRange(this.prop<string | null>("value").peek());
    const today = this.prop<string | null>("today").peek();
    this.#calendar.goTo(isValidISO(start) ? start : isValidISO(today) ? today : todayISO());
    this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#anchored?.dispose();
    this.#anchored = null;
    const popup = this.#popup;
    const wasOpen = hasPopover ? popup.matches(":popover-open") : !popup.hidden;
    if (hasPopover) {
      if (wasOpen) popup.hidePopover();
    } else {
      popup.hidden = true;
    }
    // Drop a half-chosen range.
    if (wasOpen) this.#syncCalendar();
    if (wasOpen && emit) this.emit("fw-hide");
  }

  #close(returnFocus: boolean): void {
    if (!this.prop<boolean>("open").peek()) return;
    this.open = false;
    if (returnFocus) this.#input.focus();
  }

  /** Focusable controls inside the popup, in tab order. */
  #tabStops(): HTMLElement[] {
    const root = this.#calendar.shadowRoot;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLButtonElement>("button")].filter(
      (b) => !b.disabled && b.tabIndex >= 0 && !b.hidden && !b.closest("[hidden]"),
    );
  }

  #syncCalendar(): void {
    const calendar = this.#calendar;
    const value = this.prop<string | null>("value").peek() ?? "";
    if (this.prop<string>("mode").peek() === "range") {
      const [start, end] = splitRange(value);
      calendar.valueStart = isValidISO(start) ? start : "";
      calendar.valueEnd = isValidISO(end) ? end : "";
      calendar.value = "";
    } else {
      calendar.value = isValidISO(value) ? value : "";
      calendar.valueStart = "";
      calendar.valueEnd = "";
    }
  }

  /** The value as it reads in the field. */
  #display(value: string): string {
    const locale = this.#locale();
    const format = (this.prop<string | null>("format").peek() ?? "medium") as DateFormat;
    if (this.prop<string>("mode").peek() !== "range") {
      return isValidISO(value) ? formatISO(value, locale, format) : "";
    }
    const [start, end] = splitRange(value);
    if (!isValidISO(start)) return "";
    return (
      formatISO(start, locale, format) +
      RANGE_SEPARATOR +
      (isValidISO(end) ? formatISO(end, locale, format) : "")
    );
  }

  /** Put the formatted value in the field — unless it holds text the user must fix. */
  #writeText(): void {
    const value = this.prop<string | null>("value").peek() ?? "";
    if (this.#badInput.peek() && value === "") return;
    this.#badInput.set(false);
    const text = this.#display(value);
    if (this.#input.value !== text) this.#input.value = text;
  }

  /** Parse what was typed and commit it. */
  #commitText(): void {
    const text = this.#input.value.trim();
    const value = this.prop<string | null>("value").peek() ?? "";
    if (text === this.#display(value).trim() && !this.#badInput.peek()) return;
    if (text === "") {
      this.#badInput.set(false);
      this.#commit("");
      this.#writeText();
      return;
    }
    const parsed = this.#parse(text);
    if (parsed === null) {
      // Like a native date input: no value, and badInput until it is fixed.
      this.#badInput.set(true);
      this.#commit("");
      return;
    }
    this.#badInput.set(false);
    this.#commit(parsed);
    this.#writeText();
  }

  #parse(text: string): string | null {
    const locale = this.#locale();
    if (this.prop<string>("mode").peek() !== "range") return parseDate(text, locale);
    const interval = /^(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})$/.exec(text);
    const halves = interval
      ? [interval[1]!, interval[2]!]
      : text.split(/\s+[-–—]\s+|\s*[–—]\s*/).filter((s) => s.trim() !== "");
    if (halves.length !== 2) return null;
    const start = parseDate(halves[0]!, locale);
    const end = parseDate(halves[1]!, locale);
    if (!start || !end) return null;
    return start <= end ? `${start}/${end}` : `${end}/${start}`;
  }

  #joinRange(start: string, end: string): string {
    if (this.prop<string>("mode").peek() !== "range") return start;
    return start === "" && end === "" ? "" : `${start}/${end}`;
  }

  /** Set the value from a user action, telling listeners if it changed. */
  #commit(value: string): void {
    if ((this.prop<string | null>("value").peek() ?? "") === value) return;
    this.value = value;
    this.emit("input");
    this.emit("change");
  }

  #locale(): string {
    return resolveLocale(this, this.prop<string | null>("locale").get());
  }

  #syncFormState(): void {
    const value = this.prop<string | null>("value").peek() ?? "";
    const range = this.prop<string>("mode").peek() === "range";
    const input = this.#input;
    this.setFormValue(value === "" ? null : value);

    const [start, end] = range ? splitRange(value) : [value, value];
    const complete = isValidISO(start) && isValidISO(end);
    const min = this.prop<string | null>("min").peek();
    const max = this.prop<string | null>("max").peek();
    const locale = this.#locale();
    const error = this.prop<string | null>("error").peek();

    if (error) {
      this.setValidity({ customError: true }, error, input);
    } else if (this.#badInput.peek()) {
      this.setValidity({ badInput: true }, "Please enter a valid date.", input);
    } else if (this.prop<boolean>("required").peek() && !complete) {
      this.setValidity(
        { valueMissing: true },
        range ? "Please choose a start and end date." : "Please choose a date.",
        input,
      );
    } else if (isValidISO(min) && isValidISO(start) && start < min) {
      this.setValidity(
        { rangeUnderflow: true },
        `Please choose a date on or after ${formatISO(min, locale)}.`,
        input,
      );
    } else if (
      isValidISO(max) &&
      ((isValidISO(end) && end > max) || (isValidISO(start) && start > max))
    ) {
      this.setValidity(
        { rangeOverflow: true },
        `Please choose a date on or before ${formatISO(max, locale)}.`,
        input,
      );
    } else {
      this.setValidity({});
    }
  }
}
