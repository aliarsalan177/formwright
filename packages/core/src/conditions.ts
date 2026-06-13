/**
 * Condition engine — evaluates the sandboxed JSONLogic-style {@link Condition}
 * algebra from a schema against the current form values.
 *
 * It is pure and synchronous: `getValue` reads a field. When the evaluator is
 * called inside an {@link effect}/{@link computed} and `getValue` reads field
 * signals, the result automatically tracks *only* the fields the condition
 * references — so a `visibleWhen` re-evaluates exactly when its inputs change.
 * Conditions are data, never `eval`.
 */
import type { Condition, FieldValue } from "@formwright/schema";

export type ValueGetter = (fieldId: string) => FieldValue;

function isOp<K extends string>(cond: unknown, key: K): cond is Record<K, unknown> {
  return typeof cond === "object" && cond !== null && key in cond;
}

function toNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}

/** Evaluate a condition to a value (operands) — see {@link evaluateCondition} for the boolean form. */
function evalNode(cond: Condition, get: ValueGetter): unknown {
  // Literals (string/number/boolean/null/array) pass through.
  if (cond === null || typeof cond !== "object") return cond;
  if (Array.isArray(cond)) return cond;

  if (isOp(cond, "var")) return get(String(cond.var));

  if (isOp(cond, "==")) {
    const [a, b] = cond["=="] as [Condition, Condition];
    return evalNode(a, get) === evalNode(b, get);
  }
  if (isOp(cond, "!=")) {
    const [a, b] = cond["!="] as [Condition, Condition];
    return evalNode(a, get) !== evalNode(b, get);
  }
  if (isOp(cond, ">")) {
    const [a, b] = cond[">"] as [Condition, Condition];
    return toNumber(evalNode(a, get)) > toNumber(evalNode(b, get));
  }
  if (isOp(cond, ">=")) {
    const [a, b] = cond[">="] as [Condition, Condition];
    return toNumber(evalNode(a, get)) >= toNumber(evalNode(b, get));
  }
  if (isOp(cond, "<")) {
    const [a, b] = cond["<"] as [Condition, Condition];
    return toNumber(evalNode(a, get)) < toNumber(evalNode(b, get));
  }
  if (isOp(cond, "<=")) {
    const [a, b] = cond["<="] as [Condition, Condition];
    return toNumber(evalNode(a, get)) <= toNumber(evalNode(b, get));
  }
  if (isOp(cond, "in")) {
    const [a, b] = cond["in"] as [Condition, Condition];
    const needle = evalNode(a, get);
    const haystack = evalNode(b, get);
    if (Array.isArray(haystack)) return haystack.includes(needle as FieldValue);
    if (typeof haystack === "string") return haystack.includes(String(needle));
    return false;
  }
  if (isOp(cond, "not")) {
    return !truthy(evalNode(cond.not as Condition, get));
  }
  if (isOp(cond, "and")) {
    return (cond.and as Condition[]).every((c) => truthy(evalNode(c, get)));
  }
  if (isOp(cond, "or")) {
    return (cond.or as Condition[]).some((c) => truthy(evalNode(c, get)));
  }

  // Unknown object shape — treat as falsy rather than throwing on malformed schemas.
  return false;
}

function truthy(v: unknown): boolean {
  return Boolean(v);
}

/** Evaluate a condition to a boolean. `undefined` conditions default to `true`. */
export function evaluateCondition(
  cond: Condition | undefined,
  get: ValueGetter,
  fallback = true,
): boolean {
  if (cond === undefined) return fallback;
  return truthy(evalNode(cond, get));
}

/** Collect the field ids referenced by a condition (for documentation / codegen). */
export function referencedFields(cond: Condition | undefined): string[] {
  const ids = new Set<string>();
  const walk = (c: unknown): void => {
    if (c === null || typeof c !== "object") return;
    if (Array.isArray(c)) {
      c.forEach(walk);
      return;
    }
    const rec = c as Record<string, unknown>;
    if ("var" in rec) {
      ids.add(String(rec["var"]));
      return;
    }
    for (const v of Object.values(rec)) walk(v);
  };
  if (cond !== undefined) walk(cond);
  return [...ids];
}
