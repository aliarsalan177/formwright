/**
 * Optional format validators registered by renderer packages (e.g. `@formwright/dom`
 * registers `"phone"`). Keeps `@formwright/core` dependency-free.
 */
import type { FieldValue } from "@formwright/schema";

export type FormatValidator = (value: FieldValue) => string | null;

const registry = new Map<string, FormatValidator>();

/** Register a validator for a {@link ValidationSchema.format} value. */
export function registerFormatValidator(format: string, validator: FormatValidator): void {
  registry.set(format, validator);
}

/** Run a registered format validator, if any. Returns an error message or `null`. */
export function runFormatValidator(format: string, value: FieldValue): string | null {
  const fn = registry.get(format);
  return fn ? fn(value) : null;
}
