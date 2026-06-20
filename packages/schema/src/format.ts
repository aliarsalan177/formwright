/**
 * Dual-format schema serialization — JSON (canonical) and TOON (LLM-efficient).
 *
 * JSON remains the default for storage, APIs, and runtime objects.
 * TOON is a lossless encoding of the same data model, useful for LLM prompts.
 */
import { decode, encode } from "@toon-format/toon";

export type SchemaFormat = "json" | "toon";

/** Detect JSON vs TOON from trimmed text (used when format is omitted). */
export function detectSchemaFormat(text: string): SchemaFormat {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "toon";
}

/** Serialize a schema (or any JSON value) to a string. */
export function serializeSchema(data: unknown, format: SchemaFormat = "json"): string {
  if (format === "toon") return encode(data);
  return JSON.stringify(data, null, 2);
}

/** Parse a JSON or TOON string back to a plain object. */
export function deserializeSchema(text: string, format?: SchemaFormat): unknown {
  const trimmed = text.trim();
  const resolved = format ?? detectSchemaFormat(trimmed);
  if (resolved === "toon") return decode(trimmed);
  return JSON.parse(trimmed) as unknown;
}

/** True when the value looks like a serialized schema string rather than a parsed object. */
export function isSchemaText(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}
