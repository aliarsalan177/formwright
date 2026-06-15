import type { Row } from "@gridwright/schema";

/** Turn a raw cell value into display text. */
export type ValueFormatter = (value: unknown, row: Row) => string;

/** Render a cell's content — return a string (set as text, XSS-safe) or a Node. */
export type CellRenderer = (value: unknown, row: Row) => string | Node;

const formatters = new Map<string, ValueFormatter>();
const renderers = new Map<string, CellRenderer>();

export function registerFormatter(name: string, fn: ValueFormatter): void {
  formatters.set(name, fn);
}
export function getFormatter(name: string): ValueFormatter | undefined {
  return formatters.get(name);
}

export function registerCellRenderer(name: string, fn: CellRenderer): void {
  renderers.set(name, fn);
}
export function getCellRenderer(name: string): CellRenderer | undefined {
  return renderers.get(name);
}

// ---- Built-in formatters ---------------------------------------------------

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

registerFormatter("currency", (v) => (v == null || v === "" ? "" : currency.format(Number(v))));
registerFormatter("number", (v) => (v == null || v === "" ? "" : decimal.format(Number(v))));
registerFormatter("percent", (v) => (v == null || v === "" ? "" : `${decimal.format(Number(v))}%`));
registerFormatter("date", (v) => {
  if (v == null || v === "") return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
});
