import { batch, signal, untrack } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";
import { srOnly } from "../core/styles.js";
import {
  addDays,
  addMonths,
  addYears,
  clampISO,
  dateOf,
  endOfWeek,
  isValidISO,
  makeDate,
  monthIndex,
  monthStart,
  resolveLocale,
  startOfWeek,
  todayISO,
  weekStartFor,
} from "./dates.js";

export type CalendarMode = "single" | "range";

/** Detail of `fw-select`: `{ value }` in single mode, `{ start, end }` once a range is complete. */
export type CalendarSelectDetail = { value: string } | { start: string; end: string };

const WEEKS = 6;
const MAX_MONTHS = 2;

const styles =
  srOnly +
  /* css */ `
:host { display: inline-block; font-size: var(--_text-size); --_cell: var(--fw-calendar-cell-size, 2.25rem); }
.base {
  display: inline-flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
  background: var(--_surface); color: var(--_text);
}
.header { display: flex; align-items: center; gap: 0.5rem; }
.heading { flex: 1; text-align: center; font-weight: 600; white-space: nowrap; }
.nav {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: var(--_radius-sm);
  background: transparent; color: var(--_muted); cursor: pointer; font: inherit;
}
.nav:hover:not(:disabled) { background: var(--_surface-2); color: var(--_text); }
.nav:disabled { opacity: 0.4; cursor: not-allowed; }
.nav:focus-visible, .day:focus-visible { outline: none; box-shadow: var(--_ring); }
:host(:dir(rtl)) .nav svg { transform: scaleX(-1); }
.months { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.caption { text-align: center; font-weight: 600; margin-block-end: 0.25rem; }
.grid { border-collapse: collapse; border-spacing: 0; }
.weekday {
  width: var(--_cell); height: 2rem; padding: 0; text-align: center;
  font-size: 0.75rem; font-weight: 500; color: var(--_muted);
}
.cell { padding: 0; text-align: center; }
.day {
  position: relative; width: var(--_cell); height: var(--_cell); padding: 0;
  border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: inherit; font: inherit; cursor: pointer;
  transition: background-color var(--_duration);
}
.day:hover { background: var(--_surface-2); }
.day[data-outside] { color: var(--_muted); }
.day[aria-current="date"] { font-weight: 700; color: var(--_accent); }
.day[aria-disabled="true"] { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
.day[aria-disabled="true"]:hover { background: transparent; }
.cell[data-in-range], .cell[data-preview] {
  background: color-mix(in srgb, var(--_accent) 12%, transparent);
}
.cell[data-preview] { background: color-mix(in srgb, var(--_accent) 7%, transparent); }
.cell[data-in-range] .day, .cell[data-preview] .day { border-radius: 0; }
.cell[data-range-start] { border-start-start-radius: var(--_radius-sm); border-end-start-radius: var(--_radius-sm); }
.cell[data-range-end] { border-start-end-radius: var(--_radius-sm); border-end-end-radius: var(--_radius-sm); }
.cell[data-selected] .day,
.cell[data-range-start] .day,
.cell[data-range-end] .day {
  background: var(--_accent); color: var(--_accent-contrast);
}
:host([disabled]) .base { opacity: 0.6; }
:host([disabled]) .day { cursor: not-allowed; }
`;

const ICON_PREV = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const ICON_NEXT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

interface MonthView {
  root: HTMLElement;
  caption: HTMLElement;
  headers: HTMLTableCellElement[];
  rows: HTMLTableRowElement[];
  cells: HTMLTableCellElement[];
  buttons: HTMLButtonElement[];
}

interface CellLayout {
  iso: string;
  /** Belongs to a neighbouring month. */
  outside: boolean;
  /** An outside day that is not drawn at all. */
  blank: boolean;
}

/**
 * `<fw-calendar>` — an inline month grid for picking a date or a range.
 *
 * ```html
 * <fw-calendar value="2026-09-17"></fw-calendar>
 * <fw-calendar mode="range" value-start="2026-09-01" value-end="2026-09-12" months="2"></fw-calendar>
 * <fw-calendar min="2026-01-01" max="2026-12-31" locale="de-DE" first-day-of-week="1"></fw-calendar>
 * <script>
 *   calendar.isDateDisabled = (iso) => [0, 6].includes(new Date(iso + "T12:00").getDay());
 * </script>
 * ```
 *
 * Every value is an ISO calendar date, `YYYY-MM-DD`, and is worked on as a
 * local calendar date — never parsed as UTC — so a date never slips a day
 * in a timezone west of Greenwich. Month and weekday names come from
 * `Intl.DateTimeFormat` in `locale` (default: the nearest `lang`, then the
 * browser's), and the week starts on the locale's first day unless
 * `first-day-of-week` (0 = Sunday … 6 = Saturday) says otherwise.
 *
 * Keyboard, per the WAI-ARIA date picker grid: arrows move a day or a week
 * (Left and Right swap in right-to-left text), Home and End go to the start
 * and end of the week, Page Up and Page Down a month, with Shift a year,
 * and Enter or Space picks. Only the focused day is in the tab order, and
 * moving past the edge of the month turns the page.
 *
 * In `range` mode the first pick sets the start, pointing at a later day
 * previews the range, and the second pick sets the end — swapped if it
 * falls before the start.
 *
 * `show-outside-days` and `months` read JSON-ish attribute values:
 * `show-outside-days="false"` hides the neighbouring months' days.
 *
 * Properties: `isDateDisabled: (iso) => boolean` (property only), `today`
 * to pin what counts as today.
 * Methods: `focus()` focuses the active day, `goTo(iso)` shows that date's
 * month and makes it the active day.
 * Events: `change` whenever the value (or either end of the range) changes;
 * `fw-select` on every completed pick — `{ value }`, or `{ start, end }` once
 * both ends are chosen.
 * Parts: `base`, `header`, `prev`, `next`, `heading`, `months`, `month`,
 * `caption`, `grid`, `weekday`, `week`, `cell`, `day`.
 */
export class FwCalendar extends FwElement {
  static override props: PropMap = {
    value: { type: "string", default: "" },
    mode: { type: "string", reflect: true, default: "single" },
    valueStart: { type: "string", default: "" },
    valueEnd: { type: "string", default: "" },
    min: { type: "string" },
    max: { type: "string" },
    locale: { type: "string" },
    firstDayOfWeek: { type: "number" },
    // JSON, so `show-outside-days="false"` means false; a plain boolean
    // attribute could only ever be switched on.
    showOutsideDays: { type: "json", default: true },
    months: { type: "number", default: 1 },
    disabled: { type: "boolean", reflect: true },
    today: { type: "string" },
    isDateDisabled: { type: "json", attribute: false },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open" };

  declare value: string;
  declare mode: CalendarMode;
  declare valueStart: string;
  declare valueEnd: string;
  declare min: string | null;
  declare max: string | null;
  declare locale: string | null;
  declare firstDayOfWeek: number | null;
  declare showOutsideDays: boolean;
  declare months: number;
  declare disabled: boolean;
  declare today: string | null;
  declare isDateDisabled: ((iso: string) => boolean) | null;

  #prev!: HTMLButtonElement;
  #next!: HTMLButtonElement;
  #heading!: HTMLElement;
  #monthsEl!: HTMLElement;
  #views: MonthView[] = [];

  /** The day that holds the roving tabindex. */
  readonly #focus = signal("");
  /** Month index (year * 12 + month) of the first month shown. */
  readonly #view = signal(-1);
  /** Day pointed at while choosing the end of a range. */
  readonly #hover = signal<string | null>(null);
  readonly #layout = signal<CellLayout[][]>([]);

  /** The day that is keyboard-active — tabbable, and focused by `focus()`. */
  get focusedDate(): string {
    return this.#focus.peek();
  }

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    const header = document.createElement("div");
    header.className = "header";
    header.setAttribute("part", "header");

    this.#prev = document.createElement("button");
    this.#prev.type = "button";
    this.#prev.className = "nav";
    this.#prev.setAttribute("part", "prev");
    this.#prev.setAttribute("aria-label", "Previous month");
    this.#prev.innerHTML = ICON_PREV;

    this.#heading = document.createElement("div");
    this.#heading.className = "heading";
    this.#heading.setAttribute("part", "heading");
    this.#heading.setAttribute("aria-live", "polite");

    this.#next = document.createElement("button");
    this.#next.type = "button";
    this.#next.className = "nav";
    this.#next.setAttribute("part", "next");
    this.#next.setAttribute("aria-label", "Next month");
    this.#next.innerHTML = ICON_NEXT;

    header.append(this.#prev, this.#heading, this.#next);

    this.#monthsEl = document.createElement("div");
    this.#monthsEl.className = "months";
    this.#monthsEl.setAttribute("part", "months");

    const id = nextId("fw-calendar");
    for (let i = 0; i < MAX_MONTHS; i++) {
      const view = buildMonth(`${id}-${i}`);
      this.#views.push(view);
      this.#monthsEl.append(view.root);
    }

    base.append(header, this.#monthsEl);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    // Where the grid opens: the selection, else today — and it follows a
    // value set from outside to whatever month that is in.
    scope.bind(() => {
      const range = this.prop<string>("mode").get() === "range";
      const anchor = range
        ? this.prop<string | null>("valueStart").get()
        : this.prop<string | null>("value").get();
      const target = isValidISO(anchor) ? anchor : this.#today();
      untrack(() => this.#goTo(target, this.#view.peek() < 0));
    });

    // Fewer months shown: keep the active day on screen.
    scope.bind(() => {
      this.#monthCount();
      const focus = this.#focus.peek();
      if (focus) untrack(() => this.#goTo(focus, false));
    });

    // Layout: which date each of the 84 prebuilt cells shows, names, headings.
    scope.bind(() => {
      const locale = this.#locale();
      const firstDay = this.#firstDay(locale);
      const view = this.#view.get();
      const count = this.#monthCount();
      const showOutside = this.prop<unknown>("showOutsideDays").get() !== false;
      if (view < 0) return;

      const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" });
      const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
      const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric" });
      const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
      const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });

      const layout: CellLayout[][] = [];
      this.#views.forEach((month, i) => {
        month.root.hidden = i >= count;
        month.caption.classList.toggle("sr-only", count === 1);
        if (i >= count) return;

        for (let c = 0; c < 7; c++) {
          // 7 January 2024 was a Sunday.
          const date = makeDate(2024, 0, 7 + ((firstDay + c) % 7));
          const th = month.headers[c]!;
          th.textContent = weekdayShort.format(date);
          th.abbr = weekdayLong.format(date);
          th.setAttribute("aria-label", weekdayLong.format(date));
        }

        const first = monthStart(view + i);
        month.caption.textContent = monthYear.format(dateOf(first)!);
        let iso = startOfWeek(first, firstDay);
        const cells: CellLayout[] = [];
        for (let k = 0; k < WEEKS * 7; k++) {
          const index = monthIndex(iso);
          const leading = index < view + i;
          const trailing = index > view + i;
          const outside = leading || trailing;
          // Between two side-by-side months the neighbours' days would
          // appear twice; only the outer edges show them.
          const blank =
            outside && (!showOutside || (leading && i > 0) || (trailing && i < count - 1));
          cells.push({ iso, outside, blank });

          const button = month.buttons[k]!;
          const date = dateOf(iso)!;
          button.dataset.date = iso;
          button.textContent = dayNumber.format(date);
          button.setAttribute("aria-label", fullDate.format(date));
          button.toggleAttribute("data-outside", outside);
          button.hidden = blank;
          month.cells[k]!.toggleAttribute("data-outside", outside);
          iso = addDays(iso, 1);
        }
        for (let r = 0; r < WEEKS; r++) {
          month.rows[r]!.hidden = cells.slice(r * 7, r * 7 + 7).every((cell) => cell.outside);
        }
        layout.push(cells);
      });

      const first = dateOf(monthStart(view))!;
      const last = dateOf(monthStart(view + count - 1))!;
      const ranged = monthYear as Intl.DateTimeFormat & {
        formatRange?: (a: Date, b: Date) => string;
      };
      this.#heading.textContent =
        count === 1
          ? monthYear.format(first)
          : typeof ranged.formatRange === "function"
            ? ranged.formatRange(first, last)
            : `${monthYear.format(first)} – ${monthYear.format(last)}`;
      this.#layout.set(layout);
    });

    // State: selection, range, today, disabled days and the roving tabindex.
    scope.bind(() => {
      const layout = this.#layout.get();
      const range = this.prop<string>("mode").get() === "range";
      const value = this.prop<string | null>("value").get() ?? "";
      const start = this.prop<string | null>("valueStart").get() ?? "";
      const end = this.prop<string | null>("valueEnd").get() ?? "";
      const hover = this.#hover.get();
      const focus = this.#focus.get();
      const today = this.#today();
      const calendarDisabled = this.prop<boolean>("disabled").get();
      this.prop<string | null>("min").get();
      this.prop<string | null>("max").get();
      this.prop<unknown>("isDateDisabled").get();

      // lo..hi is the committed range, or the preview from the start to
      // the day being pointed at while the end is still to be chosen.
      let lo = "";
      let hi = "";
      let preview = false;
      if (range && isValidISO(start)) {
        const other = isValidISO(end) ? end : hover && isValidISO(hover) ? hover : start;
        preview = !isValidISO(end) && other !== start;
        [lo, hi] = start <= other ? [start, other] : [other, start];
      }

      let tabbable: HTMLButtonElement | null = null;
      layout.forEach((cells, i) => {
        const month = this.#views[i]!;
        cells.forEach((cell, k) => {
          const td = month.cells[k]!;
          const button = month.buttons[k]!;
          const { iso, blank } = cell;
          const dayDisabled = calendarDisabled || this.#isUnavailable(iso);

          const inSpan = range && lo !== "" && iso >= lo && iso <= hi && !blank;
          const edgeStart = inSpan && iso === lo;
          const edgeEnd = inSpan && iso === hi;
          const selected = blank
            ? false
            : range
              ? inSpan && (!preview || iso === start)
              : iso === value;

          td.setAttribute("aria-selected", String(selected));
          td.toggleAttribute("data-selected", !range && selected);
          td.toggleAttribute("data-range-start", edgeStart && (!preview || iso === start));
          td.toggleAttribute("data-range-end", edgeEnd && (!preview || iso === start));
          td.toggleAttribute("data-in-range", inSpan && !preview && !edgeStart && !edgeEnd);
          td.toggleAttribute("data-preview", inSpan && preview && iso !== start);

          if (dayDisabled) button.setAttribute("aria-disabled", "true");
          else button.removeAttribute("aria-disabled");
          if (iso === today && !cell.blank) button.setAttribute("aria-current", "date");
          else button.removeAttribute("aria-current");

          const active = !cell.outside && iso === focus && !calendarDisabled;
          button.tabIndex = active ? 0 : -1;
          button.toggleAttribute("data-focused", !cell.outside && iso === focus);
          if (active) tabbable = button;
        });
      });
      // The active day is somehow off screen: keep the grid reachable.
      if (!tabbable && !calendarDisabled) {
        const first = this.#views[0]?.buttons.find((b) => !b.hasAttribute("data-outside"));
        if (first) first.tabIndex = 0;
      }
    });

    // Previous / next availability.
    scope.bind(() => {
      const view = this.#view.get();
      const count = this.#monthCount();
      const min = this.#min();
      const max = this.#max();
      const disabled = this.prop<boolean>("disabled").get();
      this.#prev.disabled = disabled || (min !== null && addDays(monthStart(view), -1) < min);
      this.#next.disabled = disabled || (max !== null && monthStart(view + count) > max);
    });

    const dayOf = (event: Event): string | null => {
      const target = event.composedPath()[0];
      if (!(target instanceof HTMLElement)) return null;
      const button = target.closest<HTMLButtonElement>("button.day");
      return button?.dataset.date ?? null;
    };

    const onKey = (event: KeyboardEvent) => {
      const iso = dayOf(event);
      if (!iso || event.altKey || event.ctrlKey || event.metaKey) return;
      const rtl = this.#isRtl();
      const firstDay = this.#firstDay(this.#locale());
      let next: string;
      switch (event.key) {
        case "ArrowLeft":
          next = addDays(iso, rtl ? 1 : -1);
          break;
        case "ArrowRight":
          next = addDays(iso, rtl ? -1 : 1);
          break;
        case "ArrowUp":
          next = addDays(iso, -7);
          break;
        case "ArrowDown":
          next = addDays(iso, 7);
          break;
        case "Home":
          next = startOfWeek(iso, firstDay);
          break;
        case "End":
          next = endOfWeek(iso, firstDay);
          break;
        case "PageUp":
          next = event.shiftKey ? addYears(iso, -1) : addMonths(iso, -1);
          break;
        case "PageDown":
          next = event.shiftKey ? addYears(iso, 1) : addMonths(iso, 1);
          break;
        case "Enter":
        case " ":
          // Handled here rather than left to the button's own click, which
          // jsdom and synthetic events do not produce; the matching keyup
          // is cancelled below so a real browser does not pick twice.
          event.preventDefault();
          this.#pick(iso);
          return;
        default:
          return;
      }
      event.preventDefault();
      if (this.prop<boolean>("disabled").peek()) return;
      this.#goTo(next, false);
      this.#previewFrom(this.#focus.peek());
      this.focus();
    };

    // Space activates a button on keyup; cancelling it stops a second pick.
    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.key === " " || event.key === "Enter") && dayOf(event)) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      const iso = dayOf(event);
      if (!iso) return;
      this.#pick(iso);
      // A click on an outside day turns the page; carry focus to the day's
      // new button — unless a listener to the pick has moved focus away.
      if (this.#focus.peek() === iso && this.root.activeElement) this.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const iso = dayOf(event);
      if (iso && !this.prop<boolean>("disabled").peek() && iso !== this.#focus.peek()) {
        this.#goTo(iso, false);
      }
    };

    const onPointerOver = (event: Event) => {
      const iso = dayOf(event);
      if (iso) this.#previewFrom(iso);
    };
    const onPointerLeave = () => this.#hover.set(null);

    const onPrev = () => this.#turn(-1);
    const onNext = () => this.#turn(1);

    const grid = this.#monthsEl;
    grid.addEventListener("keydown", onKey);
    grid.addEventListener("keyup", onKeyUp);
    grid.addEventListener("click", onClick);
    grid.addEventListener("focusin", onFocusIn);
    grid.addEventListener("pointerover", onPointerOver);
    grid.addEventListener("pointerleave", onPointerLeave);
    this.#prev.addEventListener("click", onPrev);
    this.#next.addEventListener("click", onNext);
    scope.add(() => {
      grid.removeEventListener("keydown", onKey);
      grid.removeEventListener("keyup", onKeyUp);
      grid.removeEventListener("click", onClick);
      grid.removeEventListener("focusin", onFocusIn);
      grid.removeEventListener("pointerover", onPointerOver);
      grid.removeEventListener("pointerleave", onPointerLeave);
      this.#prev.removeEventListener("click", onPrev);
      this.#next.removeEventListener("click", onNext);
    });
  }

  /** Show `iso`'s month and make it the active day. Clamped to min/max. */
  goTo(iso: string): void {
    if (isValidISO(iso)) this.#goTo(iso, false);
  }

  /** Focus the active day. */
  override focus(options?: FocusOptions): void {
    const focus = this.#focus.peek();
    const button =
      this.root.querySelector<HTMLButtonElement>(
        `button.day[data-date="${focus}"]:not([data-outside])`,
      ) ?? this.root.querySelector<HTMLButtonElement>("button.day[tabindex='0']");
    button?.focus(options);
  }

  #goTo(iso: string, reset: boolean): void {
    const target = clampISO(iso, this.#min(), this.#max());
    const index = monthIndex(target);
    const count = this.#monthCount();
    const view = this.#view.peek();
    batch(() => {
      this.#focus.set(target);
      if (reset || view < 0) this.#view.set(index);
      else if (index < view) this.#view.set(index);
      else if (index > view + count - 1) this.#view.set(index - count + 1);
    });
  }

  /** Previous / next month buttons: turn the page and carry the active day along. */
  #turn(delta: number): void {
    const view = this.#view.peek() + delta;
    const count = this.#monthCount();
    const focus = this.#focus.peek() || monthStart(view);
    let next = clampISO(addMonths(focus, delta), this.#min(), this.#max());
    const index = monthIndex(next);
    if (index < view || index > view + count - 1) next = monthStart(view);
    batch(() => {
      this.#view.set(view);
      this.#focus.set(next);
    });
  }

  #previewFrom(iso: string): void {
    const range = this.prop<string>("mode").peek() === "range";
    const start = this.prop<string | null>("valueStart").peek() ?? "";
    const end = this.prop<string | null>("valueEnd").peek() ?? "";
    this.#hover.set(range && isValidISO(start) && !isValidISO(end) ? iso : null);
  }

  #pick(iso: string): void {
    if (this.prop<boolean>("disabled").peek() || this.#isUnavailable(iso)) return;
    this.#goTo(iso, false);

    if (this.prop<string>("mode").peek() === "range") {
      const start = this.prop<string | null>("valueStart").peek() ?? "";
      const end = this.prop<string | null>("valueEnd").peek() ?? "";
      if (!isValidISO(start) || isValidISO(end)) {
        batch(() => {
          this.#hover.set(null);
          this.valueStart = iso;
          this.valueEnd = "";
        });
        this.emit("change");
        return;
      }
      const [s, e] = iso < start ? [iso, start] : [start, iso];
      batch(() => {
        this.#hover.set(null);
        this.valueStart = s;
        this.valueEnd = e;
      });
      this.emit("change");
      this.emit<CalendarSelectDetail>("fw-select", { start: s, end: e });
      return;
    }

    const changed = (this.prop<string | null>("value").peek() ?? "") !== iso;
    this.value = iso;
    if (changed) this.emit("change");
    this.emit<CalendarSelectDetail>("fw-select", { value: iso });
  }

  /** Outside min/max or refused by `isDateDisabled`. */
  #isUnavailable(iso: string): boolean {
    const min = this.#min();
    const max = this.#max();
    if (min !== null && iso < min) return true;
    if (max !== null && iso > max) return true;
    const test = this.prop<unknown>("isDateDisabled").peek();
    return typeof test === "function" && Boolean((test as (iso: string) => boolean)(iso));
  }

  #locale(): string {
    return resolveLocale(this, this.prop<string | null>("locale").get());
  }

  #firstDay(locale: string): number {
    const explicit = this.prop<number | null>("firstDayOfWeek").get();
    return explicit !== null && Number.isInteger(explicit) && explicit >= 0 && explicit <= 6
      ? explicit
      : weekStartFor(locale);
  }

  #monthCount(): number {
    const n = this.prop<number | null>("months").get();
    return n === 2 ? 2 : 1;
  }

  #today(): string {
    const t = this.prop<string | null>("today").get();
    return isValidISO(t) ? t : todayISO();
  }

  #min(): string | null {
    const v = this.prop<string | null>("min").get();
    return isValidISO(v) ? v : null;
  }

  #max(): string | null {
    const v = this.prop<string | null>("max").get();
    return isValidISO(v) ? v : null;
  }

  #isRtl(): boolean {
    try {
      return this.matches(":dir(rtl)");
    } catch {
      return this.closest("[dir]")?.getAttribute("dir") === "rtl";
    }
  }
}

function buildMonth(id: string): MonthView {
  const root = document.createElement("div");
  root.className = "month";
  root.setAttribute("part", "month");

  const caption = document.createElement("div");
  caption.className = "caption";
  caption.id = `${id}-caption`;
  caption.setAttribute("part", "caption");

  const table = document.createElement("table");
  table.className = "grid";
  table.setAttribute("role", "grid");
  table.setAttribute("part", "grid");
  table.setAttribute("aria-labelledby", caption.id);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headers: HTMLTableCellElement[] = [];
  for (let c = 0; c < 7; c++) {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = "weekday";
    th.setAttribute("part", "weekday");
    headers.push(th);
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  const rows: HTMLTableRowElement[] = [];
  const cells: HTMLTableCellElement[] = [];
  const buttons: HTMLButtonElement[] = [];
  for (let r = 0; r < WEEKS; r++) {
    const tr = document.createElement("tr");
    tr.setAttribute("part", "week");
    for (let c = 0; c < 7; c++) {
      const td = document.createElement("td");
      td.className = "cell";
      td.setAttribute("role", "gridcell");
      td.setAttribute("part", "cell");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";
      button.tabIndex = -1;
      button.setAttribute("part", "day");
      td.append(button);
      tr.append(td);
      cells.push(td);
      buttons.push(button);
    }
    rows.push(tr);
    tbody.append(tr);
  }

  table.append(thead, tbody);
  root.append(caption, table);
  return { root, caption, headers, rows, cells, buttons };
}
