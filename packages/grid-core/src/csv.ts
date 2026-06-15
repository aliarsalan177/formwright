import type { Grid } from "./grid.js";

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvOptions {
  /** Which rows to export: the full filtered view (default) or just the current page. */
  readonly rows?: "view" | "page";
  /** Field separator (default ","). */
  readonly separator?: string;
}

/**
 * Serialize a {@link Grid} to CSV — headers from the columns, values from the
 * current (filtered, sorted) rows. Pure: returns a string, no DOM. In server
 * mode only the loaded page is available, so "view" and "page" are equivalent.
 */
export function toCsv(grid: Grid, options: CsvOptions = {}): string {
  const sep = options.separator ?? ",";
  const ids = options.rows === "page" ? grid.displayRowIds.get() : grid.viewRowIds.get();
  const header = grid.columns.map((c) => escapeCsv(c.header)).join(sep);
  const lines = ids.map((id) => {
    const row = grid.getRow(id) ?? {};
    return grid.columns.map((c) => escapeCsv(row[c.field])).join(sep);
  });
  return [header, ...lines].join("\r\n");
}
