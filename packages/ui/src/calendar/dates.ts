/**
 * Calendar-date arithmetic on ISO `YYYY-MM-DD` strings.
 *
 * A calendar date is not an instant. `new Date("2026-09-17")` parses as
 * midnight UTC, which is the 16th anywhere west of Greenwich, so nothing
 * here ever hands an ISO string to the Date constructor. Dates are built
 * from their parts in local time, at noon, so a daylight-saving jump at
 * midnight cannot push one onto the neighbouring day either.
 *
 * Strings compare correctly with `<` and `>` for years 0000–9999, which is
 * what `min`, `max` and range checks rely on.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateParts {
  year: number;
  /** 0–11, as Date uses. */
  month: number;
  day: number;
}

/** A local Date at noon on the given calendar day. Overflowing parts roll over. */
export function makeDate(year: number, month: number, day: number): Date {
  const d = new Date(2000, 0, 1, 12);
  // setFullYear, not the constructor: `new Date(99, …)` means 1999.
  d.setFullYear(year, month, day);
  return d;
}

export function partsOf(iso: string | null | undefined): DateParts | null {
  if (!iso) return null;
  const m = ISO.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidISO(iso: string | null | undefined): iso is string {
  return partsOf(iso) !== null;
}

export function toISO(date: Date): string {
  return isoOf(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isoOf(year: number, month: number, day: number): string {
  const d = makeDate(year, month, day);
  const y = d.getFullYear();
  return `${String(y).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The Date for an ISO string, or null when it is not a real date. */
export function dateOf(iso: string | null | undefined): Date | null {
  const p = partsOf(iso);
  return p ? makeDate(p.year, p.month, p.day) : null;
}

export function daysInMonth(year: number, month: number): number {
  return makeDate(year, month + 1, 0).getDate();
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const p = partsOf(iso);
  if (!p) return iso;
  return isoOf(p.year, p.month, p.day + n);
}

/** Months forward or back, keeping the day where it exists — Jan 31 + 1 month is Feb 28/29. */
export function addMonths(iso: string, n: number): string {
  const p = partsOf(iso);
  if (!p) return iso;
  const first = makeDate(p.year, p.month + n, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  return isoOf(y, m, Math.min(p.day, daysInMonth(y, m)));
}

export function addYears(iso: string, n: number): string {
  return addMonths(iso, n * 12);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return dateOf(iso)?.getDay() ?? 0;
}

export function startOfWeek(iso: string, firstDay: number): string {
  return addDays(iso, -((weekdayOf(iso) - firstDay + 7) % 7));
}

export function endOfWeek(iso: string, firstDay: number): string {
  return addDays(startOfWeek(iso, firstDay), 6);
}

/** A month as one comparable number: year * 12 + month. */
export function monthIndex(iso: string): number {
  const p = partsOf(iso);
  return p ? p.year * 12 + p.month : 0;
}

export function monthStart(index: number): string {
  return isoOf(Math.floor(index / 12), ((index % 12) + 12) % 12, 1);
}

export function clampISO(iso: string, min: string | null, max: string | null): string {
  if (min && isValidISO(min) && iso < min) return min;
  if (max && isValidISO(max) && iso > max) return max;
  return iso;
}

/* ---------------------------------------------------------------- locale */

/** `lang` of the nearest ancestor, then the document, then the runtime's default. */
export function resolveLocale(host: Element, explicit: string | null | undefined): string {
  const candidates = [
    explicit,
    host.closest("[lang]")?.getAttribute("lang"),
    typeof document !== "undefined" ? document.documentElement.lang : null,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      // Throws RangeError on a malformed tag; a typo must not break the page.
      return new Intl.DateTimeFormat(candidate).resolvedOptions().locale;
    } catch {
      /* try the next */
    }
  }
  return new Intl.DateTimeFormat().resolvedOptions().locale;
}

interface WeekInfo {
  firstDay: number;
}

/**
 * The locale's first day of the week, 0 = Sunday. Read from
 * `Intl.Locale#getWeekInfo()` (or the older `weekInfo` getter) where the
 * runtime has it; Monday otherwise, which is right for most of the world.
 */
export function weekStartFor(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => WeekInfo;
      weekInfo?: WeekInfo;
    };
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (info && typeof info.firstDay === "number") return info.firstDay % 7;
  } catch {
    /* fall through */
  }
  return 1;
}

export type DateFormat = "short" | "medium" | "long";

export function formatISO(iso: string, locale: string, format: DateFormat = "medium"): string {
  const date = dateOf(iso);
  if (!date) return "";
  const style: DateFormat = format === "short" || format === "long" ? format : "medium";
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(date);
}

/** Locale digits (Arabic-Indic, Devanagari, …) back to ASCII. */
function asciiDigits(text: string, locale: string): string {
  const nf = new Intl.NumberFormat(locale, { useGrouping: false });
  let out = text;
  for (let i = 0; i <= 9; i++) {
    const local = nf.format(i);
    if (local !== String(i)) out = out.split(local).join(String(i));
  }
  return out;
}

type Field = "year" | "month" | "day";

function fieldOrder(locale: string, options: Intl.DateTimeFormatOptions): Field[] {
  return new Intl.DateTimeFormat(locale, options)
    .formatToParts(makeDate(2033, 10, 22))
    .map((p) => p.type)
    .filter((t): t is Field => t === "year" || t === "month" || t === "day");
}

function fullYear(n: number, digits: number): number {
  // Two-digit years belong to the current century.
  if (digits > 2) return n;
  const century = Math.floor(new Date().getFullYear() / 100) * 100;
  return century + n;
}

/**
 * Parse what a person typed: ISO `2026-09-17`, the locale's numeric short
 * format (`9/17/26`, `17.09.2026`), or a written month in the locale's own
 * words (`Sep 17, 2026`, `17 septembre 2026`). Null when it is not a date.
 */
export function parseDate(text: string, locale: string): string | null {
  const trimmed = asciiDigits(text.trim(), locale);
  if (!trimmed) return null;
  if (ISO.test(trimmed)) return isValidISO(trimmed) ? trimmed : null;

  const tokens = trimmed.match(/\d+|\p{L}+/gu) ?? [];
  const numbers = tokens.filter((t) => /^\d+$/.test(t));
  const words = tokens.filter((t) => !/^\d+$/.test(t)).map((w) => w.toLocaleLowerCase(locale));

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  if (words.length > 0) {
    month = monthFromWords(words, locale);
    if (month === undefined || numbers.length !== 2) return null;
    const order = fieldOrder(locale, { year: "numeric", month: "short", day: "numeric" }).filter(
      (f) => f !== "month",
    );
    const [a, b] = numbers as [string, string];
    const values: Record<string, string> = { [order[0] ?? "day"]: a, [order[1] ?? "year"]: b };
    // A four-digit number is the year whatever the locale says.
    if (a.length > 2 && b.length <= 2) Object.assign(values, { year: a, day: b });
    if (b.length > 2 && a.length <= 2) Object.assign(values, { year: b, day: a });
    year = fullYear(Number(values.year), (values.year ?? "").length);
    day = Number(values.day);
  } else {
    if (numbers.length !== 3) return null;
    const order = fieldOrder(locale, { year: "numeric", month: "numeric", day: "numeric" });
    if (order.length !== 3) return null;
    const values: Partial<Record<Field, string>> = {};
    order.forEach((field, i) => {
      const n = numbers[i];
      if (n !== undefined) values[field] = n;
    });
    // A leading four-digit group is year-month-day in every locale.
    const [n0, n1, n2] = numbers as [string, string, string];
    if (n0.length === 4 && order[0] !== "year") {
      values.year = n0;
      values.month = n1;
      values.day = n2;
    }
    year = fullYear(Number(values.year), (values.year ?? "").length);
    month = Number(values.month) - 1;
    day = Number(values.day);
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return isoOf(year, month, day);
}

function monthFromWords(words: string[], locale: string): number | undefined {
  for (const style of ["long", "short"] as const) {
    const fmt = new Intl.DateTimeFormat(locale, { month: style, day: "numeric" });
    for (let m = 0; m < 12; m++) {
      const name = (
        fmt.formatToParts(makeDate(2033, m, 1)).find((p) => p.type === "month")?.value ?? ""
      )
        .toLocaleLowerCase(locale)
        .replace(/\.$/, "");
      if (!name) continue;
      if (words.some((w) => w === name || (w.length >= 3 && name.startsWith(w)))) return m;
    }
  }
  return undefined;
}
