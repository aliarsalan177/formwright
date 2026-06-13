/**
 * Runtime validation of an unknown value into a typed {@link FormSchema}.
 *
 * Dependency-free and structural — its job is to give precise, path-addressed
 * errors so an LLM-emitted schema can be repaired (or rejected) before it ever
 * reaches the runtime. This validates the *schema shape*, not user form input
 * (that is the job of the per-field {@link ValidationSchema}).
 */
import type { FieldSchema, FieldType, FormSchema } from "./types.js";

export interface ValidationIssue {
  /** JSON-pointer-ish path to the offending node, e.g. `fields[2].type`. */
  readonly path: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: FormSchema }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const BUILTIN_TYPES: ReadonlySet<string> = new Set<FieldType>([
  "text",
  "number",
  "email",
  "password",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "group",
  "collection",
]);

const CONTAINER_TYPES: ReadonlySet<string> = new Set<FieldType>(["group", "collection"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

class Collector {
  readonly issues: ValidationIssue[] = [];
  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }
}

function validateField(field: unknown, path: string, seenIds: Set<string>, c: Collector): void {
  if (!isRecord(field)) {
    c.add(path, "field must be an object");
    return;
  }

  const id = field["id"];
  if (typeof id !== "string" || id.length === 0) {
    c.add(`${path}.id`, "field.id must be a non-empty string");
  } else if (seenIds.has(id)) {
    c.add(`${path}.id`, `duplicate field id "${id}"`);
  } else {
    seenIds.add(id);
  }

  const type = field["type"];
  if (typeof type !== "string" || type.length === 0) {
    c.add(`${path}.type`, "field.type must be a non-empty string");
  } else if (!BUILTIN_TYPES.has(type)) {
    // Unknown types are allowed (custom widgets) but flagged as a hint, not an error.
    // We intentionally do not push an issue here.
  }

  if ((type === "select" || type === "radio") && field["options"] === undefined) {
    c.add(`${path}.options`, `field of type "${type}" should declare options`);
  }

  // Containers (group/collection) must declare nested fields; recurse so nested
  // problems surface with a precise path (e.g. `fields[3].fields[0].id`).
  if (typeof type === "string" && CONTAINER_TYPES.has(type)) {
    const nested = field["fields"];
    if (!Array.isArray(nested) || nested.length === 0) {
      c.add(`${path}.fields`, `field of type "${type}" must declare a non-empty "fields" array`);
    } else {
      // A container opens a new naming scope: child ids are unique within it, not globally.
      const childIds = new Set<string>();
      nested.forEach((f, i) => validateField(f, `${path}.fields[${i}]`, childIds, c));
    }
  }
}

/** Validate an unknown value as a {@link FormSchema}. Never throws. */
export function validateSchema(input: unknown): ValidationResult {
  const c = new Collector();

  if (!isRecord(input)) {
    c.add("$", "schema must be an object");
    return { ok: false, issues: c.issues };
  }

  if (typeof input["id"] !== "string" || (input["id"] as string).length === 0) {
    c.add("id", "schema.id must be a non-empty string");
  }
  if (typeof input["version"] !== "string" || (input["version"] as string).length === 0) {
    c.add("version", "schema.version must be a non-empty string");
  }

  const fields = input["fields"];
  if (!Array.isArray(fields)) {
    c.add("fields", "schema.fields must be an array");
  } else if (fields.length === 0) {
    c.add("fields", "schema.fields must contain at least one field");
  } else {
    const seenIds = new Set<string>();
    fields.forEach((f, i) => validateField(f, `fields[${i}]`, seenIds, c));
  }

  const providers = input["providers"];
  if (providers !== undefined && !isRecord(providers)) {
    c.add("providers", "schema.providers must be an object when present");
  }

  const submit = input["submit"];
  if (submit !== undefined && !isRecord(submit)) {
    c.add("submit", "schema.submit must be an object when present");
  }

  if (c.issues.length > 0) {
    return { ok: false, issues: c.issues };
  }
  return { ok: true, value: input as unknown as FormSchema };
}

/** Validate and throw a single aggregated error on failure. Convenience for trusted input. */
export function parseSchema(input: unknown): FormSchema {
  const result = validateSchema(input);
  if (!result.ok) {
    const detail = result.issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n");
    throw new SchemaValidationError(`Invalid Formwright schema:\n${detail}`, result.issues);
  }
  return result.value;
}

export class SchemaValidationError extends Error {
  readonly issues: readonly ValidationIssue[];
  constructor(message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = "SchemaValidationError";
    this.issues = issues;
  }
}

/** Type guard form of {@link validateSchema}. */
export function isFormSchema(input: unknown): input is FormSchema {
  return validateSchema(input).ok;
}

/** Convenience: list the field ids declared by a schema, in order. */
export function fieldIds(schema: FormSchema): string[] {
  return schema.fields.map((f: FieldSchema) => f.id);
}
