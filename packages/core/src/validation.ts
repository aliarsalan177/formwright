/**
 * Field-level validation — turns a declarative {@link ValidationSchema} into a
 * pure validator `(value) => error | null`.
 *
 * This covers the zero-config built-ins. For richer rules, a field can instead
 * carry any Standard-Schema-compatible validator (Zod/Valibot/ArkType); the Form
 * runs whichever is present. Kept dependency-free here so `@formwright/core`
 * ships with no required runtime deps.
 */
import type { FieldValue, ValidationSchema } from "@formwright/schema";

export type FieldValidator = (value: FieldValue) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL = /^https?:\/\/[^\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isEmpty(value: FieldValue): boolean {
  return value === undefined || value === null || value === "";
}

/** Compile a declarative validation descriptor into a validator function. */
export function compileValidator(schema: ValidationSchema): FieldValidator {
  return (value: FieldValue): string | null => {
    const msg = (fallback: string): string =>
      typeof schema.message === "string" ? schema.message : fallback;

    if (isEmpty(value)) {
      return schema.required ? msg("This field is required") : null;
    }

    if (schema.kind === "string" || schema.format) {
      const str = String(value);
      if (schema.minLength !== undefined && str.length < schema.minLength) {
        return msg(`Must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && str.length > schema.maxLength) {
        return msg(`Must be at most ${schema.maxLength} characters`);
      }
      if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(str)) {
        return msg("Invalid format");
      }
      if (schema.format === "email" && !EMAIL.test(str)) return msg("Enter a valid email");
      if (schema.format === "url" && !URL.test(str)) return msg("Enter a valid URL");
      if (schema.format === "uuid" && !UUID.test(str)) return msg("Enter a valid UUID");
    }

    if (schema.kind === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) return msg("Must be a number");
      if (schema.min !== undefined && num < schema.min) return msg(`Must be ≥ ${schema.min}`);
      if (schema.max !== undefined && num > schema.max) return msg(`Must be ≤ ${schema.max}`);
    }

    return null;
  };
}
