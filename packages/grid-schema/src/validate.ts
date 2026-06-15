import type { GridSchema } from "./types.js";

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SchemaIssue[];
}

/**
 * Validate a {@link GridSchema} — dependency-free, path-addressed. Catches the
 * mistakes that would otherwise surface as confusing render bugs (no columns,
 * duplicate fields, bad widths).
 */
export function validateSchema(schema: unknown): ValidationResult {
  const issues: SchemaIssue[] = [];
  const push = (path: string, message: string) => issues.push({ path, message });

  if (typeof schema !== "object" || schema === null) {
    return { valid: false, issues: [{ path: "", message: "Schema must be an object." }] };
  }
  const s = schema as Partial<GridSchema>;

  if (typeof s.id !== "string" || s.id.length === 0) push("id", "`id` must be a non-empty string.");

  if (!Array.isArray(s.columns) || s.columns.length === 0) {
    push("columns", "`columns` must be a non-empty array.");
  } else {
    const seen = new Set<string>();
    s.columns.forEach((col, i) => {
      const at = `columns[${i}]`;
      if (typeof col?.field !== "string" || col.field.length === 0) {
        push(`${at}.field`, "`field` must be a non-empty string.");
        return;
      }
      if (seen.has(col.field)) push(`${at}.field`, `Duplicate column field "${col.field}".`);
      seen.add(col.field);
      if (col.width !== undefined && (typeof col.width !== "number" || col.width <= 0)) {
        push(`${at}.width`, "`width` must be a positive number.");
      }
      if (col.flex !== undefined && (typeof col.flex !== "number" || col.flex <= 0)) {
        push(`${at}.flex`, "`flex` must be a positive number.");
      }
    });
  }

  if (s.rowHeight !== undefined && (typeof s.rowHeight !== "number" || s.rowHeight <= 0)) {
    push("rowHeight", "`rowHeight` must be a positive number.");
  }

  return { valid: issues.length === 0, issues };
}
