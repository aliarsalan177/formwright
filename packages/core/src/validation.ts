/**
 * Field-level validation — turns a declarative {@link ValidationSchema} into a
 * pure validator `(value) => error | null`.
 *
 * This covers the zero-config built-ins. For richer rules, a field can instead
 * carry any Standard-Schema-compatible validator (Zod/Valibot/ArkType); the Form
 * runs whichever is present. Kept dependency-free here so `@formwright/core`
 * ships with no required runtime deps.
 */
import type { FieldValue, PhoneValue, ValidationSchema } from "@formwright/schema";
import { runFormatValidator } from "./format-validators.js";

export type FieldValidator = (value: FieldValue) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL = /^https?:\/\/[^\s]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPhoneValue(value: unknown): value is PhoneValue {
  return typeof value === "object" && value !== null && "country" in value && "national" in value;
}

function isEmpty(value: FieldValue): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (isPhoneValue(value)) {
    const digits = String(value.national).replace(/\D/g, "");
    return digits.length === 0;
  }
  return false;
}

type Rule = NonNullable<ValidationSchema["messages"]>;

/** Compile a declarative validation descriptor into a validator function. */
export function compileValidator(schema: ValidationSchema): FieldValidator {
  const overrides = schema.messages ?? {};
  // A per-rule override wins; then the catch-all `message`; then the built-in default.
  const msg = (rule: keyof Rule, fallback: string): string =>
    overrides[rule] ?? (typeof schema.message === "string" ? schema.message : fallback);

  return (value: FieldValue): string | null => {
    if (isEmpty(value)) {
      return schema.required ? msg("required", "This field is required") : null;
    }

    if (schema.kind === "string" || schema.format) {
      const str = String(value);
      if (schema.minLength !== undefined && str.length < schema.minLength) {
        return msg("minLength", `Must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && str.length > schema.maxLength) {
        return msg("maxLength", `Must be at most ${schema.maxLength} characters`);
      }
      if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(str)) {
        return msg("pattern", "Invalid format");
      }
      if (schema.format === "email" && !EMAIL.test(str))
        return msg("format", "Enter a valid email");
      if (schema.format === "url" && !URL.test(str)) return msg("format", "Enter a valid URL");
      if (schema.format === "uuid" && !UUID.test(str)) return msg("format", "Enter a valid UUID");
    }

    if (schema.format === "phone") {
      if (!isPhoneValue(value)) return msg("format", "Enter a valid phone number");
      const err = runFormatValidator("phone", value);
      if (err) return msg("format", err);
    }

    if (schema.kind === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) return msg("type", "Must be a number");
      if (schema.min !== undefined && num < schema.min)
        return msg("min", `Must be ≥ ${schema.min}`);
      if (schema.max !== undefined && num > schema.max)
        return msg("max", `Must be ≤ ${schema.max}`);
    }

    return null;
  };
}

/** Resolve the message for a missing required value, honoring overrides. */
export function requiredMessage(schema: ValidationSchema | undefined): string {
  return (
    schema?.messages?.required ??
    (typeof schema?.message === "string" ? schema.message : "This field is required")
  );
}
