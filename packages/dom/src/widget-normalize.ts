import type { FieldOption, FieldValue } from "@formwright/core";

/** Walk a dot-path on an object (`"detail.value.payload"`). */
export function getByPath(source: unknown, path: string): unknown {
  if (!path) return source;
  let cur: unknown = source;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export type WidgetValueMode = "single" | "multi";
export type WidgetValueShape = "scalar" | "object" | "object[]";

function extractKey(item: unknown, key: string): unknown {
  if (item != null && typeof item === "object" && key in (item as object)) {
    return (item as Record<string, unknown>)[key];
  }
  return item;
}

/** Normalize a component payload into a form {@link FieldValue}. */
export function normalizeWidgetValue(
  raw: unknown,
  valueKey?: string,
  valueMode: WidgetValueMode = "single",
): FieldValue {
  if (!valueKey) return raw as FieldValue;

  if (valueMode === "multi") {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => extractKey(item, valueKey)).filter((v) => v != null) as FieldValue;
  }

  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return extractKey(raw, valueKey) as FieldValue;
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    if (raw.length === 1) return extractKey(raw[0], valueKey) as FieldValue;
    return raw.map((item) => extractKey(item, valueKey)) as FieldValue;
  }
  return raw as FieldValue;
}

/** Shape a form value for writing back to a component property. */
export function shapeWidgetValue(
  value: FieldValue,
  valueKey?: string,
  shape: WidgetValueShape = "scalar",
): unknown {
  if (!valueKey || shape === "scalar") return value ?? "";
  if (shape === "object") {
    return value == null || value === "" ? null : { [valueKey]: value };
  }
  if (!Array.isArray(value)) return [];
  return value.map((v) => ({ [valueKey]: v }));
}

export function createEventReader(
  readPath: string | undefined,
  valueProp: string,
): (el: HTMLElement, event: Event) => unknown {
  return (el, ev) => {
    if (readPath) {
      const fromPath = getByPath(ev, readPath);
      if (fromPath !== undefined) return fromPath;
    }
    const detail = (ev as CustomEvent).detail;
    if (detail && typeof detail === "object" && "value" in detail) {
      return (detail as { value: unknown }).value;
    }
    return (el as HTMLElement & Record<string, unknown>)[valueProp];
  };
}

export function mapFieldOptions(
  options: readonly FieldOption[],
  labelKey: string,
  valueKey: string,
  labelText: (opt: FieldOption) => string,
): Record<string, unknown>[] {
  return options.map((opt) => ({
    [labelKey]: labelText(opt),
    [valueKey]: opt.value,
  }));
}
