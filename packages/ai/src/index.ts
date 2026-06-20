/**
 * @formwright/ai — turn a natural-language form description into a *validated*
 * Formwright schema using an LLM.
 *
 *   import { generateSchema } from "@formwright/ai";
 *   const { schema } = await generateSchema("a signup form with a US-only state field");
 *   new Form(schema).mount(el);
 *
 * Provider-agnostic: the validate → repair loop lives here, and the actual model
 * call is a pluggable {@link SchemaProvider}. A Claude provider ships built-in
 * (the default); an OpenAI provider and a custom-function provider let you use
 * GPT, Gemini, Mistral, a local model, or anything else — each through its own
 * native SDK, never a compatibility shim.
 *
 * Whatever the provider returns is checked with `@formwright/schema`'s validator;
 * if it's invalid, the precise issues are fed back for repair — so what you get
 * out always satisfies the runtime (or a thrown {@link SchemaGenerationError}).
 */
import {
  validateSchema,
  serializeSchema,
  deserializeSchema,
  detectSchemaFormat,
  type FormSchema,
  type SchemaFormat,
  type ValidationIssue,
} from "@formwright/schema";

export { claudeProvider, type ClaudeProviderOptions } from "./claude.js";
export { openaiProvider, type OpenAIProviderOptions, type OpenAILike } from "./openai.js";
export {
  serializeSchema,
  deserializeSchema,
  detectSchemaFormat,
  type SchemaFormat,
} from "@formwright/schema";

/** A pluggable model backend: produce a candidate schema object for a request. */
export interface SchemaProvider {
  propose(input: ProposeInput): Promise<unknown>;
}

export interface ProposeInput {
  readonly description: string;
  readonly system: string;
  /** How repair feedback is serialized (default `"json"`). */
  readonly promptFormat?: SchemaFormat;
  /** Present on a repair attempt: the previous (invalid) output and why it failed. */
  readonly repair?: RepairContext;
}

export interface RepairContext {
  readonly previous: unknown;
  readonly issues: readonly ValidationIssue[];
}

export interface GenerateOptions {
  /** Model backend. Defaults to Claude (needs `ANTHROPIC_API_KEY` or `apiKey`). */
  readonly provider?: SchemaProvider;
  /** Convenience for the default Claude provider when `provider` is omitted. */
  readonly apiKey?: string;
  readonly model?: string;
  /** How many times to feed validation errors back for repair (default 2). */
  readonly maxRepairAttempts?: number;
  /** Override the Formwright DSL system prompt. */
  readonly system?: string;
  /** Extra guidance appended to the system prompt. */
  readonly guidelines?: string;
  /**
   * How to serialize repair feedback in prompts (default `"json"`).
   * Use `"toon"` to reduce tokens when feeding invalid attempts back to the model.
   */
  readonly promptFormat?: SchemaFormat;
  /**
   * Expected model output format (default `"json"`).
   * Set `"auto"` to accept JSON or TOON strings from the provider.
   */
  readonly outputFormat?: SchemaFormat | "auto";
}

export interface GenerateResult {
  readonly schema: FormSchema;
  /** Number of model round-trips it took (1 = valid on the first try). */
  readonly attempts: number;
}

export class SchemaGenerationError extends Error {
  readonly issues: readonly ValidationIssue[];
  constructor(message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = "SchemaGenerationError";
    this.issues = issues;
  }
}

/** Wrap a plain async function as a provider (for Gemini, Mistral, local models, …). */
export function defineProvider(propose: (input: ProposeInput) => Promise<unknown>): SchemaProvider {
  return { propose };
}

/** Build the user-facing instruction, including repair feedback when retrying. */
export function buildPrompt(input: ProposeInput): string {
  const format = input.promptFormat ?? "json";
  if (!input.repair) {
    return `Design a Formwright form for: ${input.description}`;
  }
  const previous = serializeSchema(input.repair.previous, format);
  const fence = format === "toon" ? "toon" : "json";
  return (
    `Design a Formwright form for: ${input.description}\n\n` +
    `Your previous attempt was INVALID:\n\`\`\`${fence}\n${previous}\n\`\`\`\n\n` +
    `Validation issues to fix:\n` +
    input.repair.issues.map((i) => `- ${i.path}: ${i.message}`).join("\n") +
    `\n\nReturn a corrected schema that resolves every issue.`
  );
}

/** Normalize provider output — unwrap `{ schema }`, parse JSON/TOON strings. */
function normalizeCandidate(candidate: unknown, outputFormat: SchemaFormat | "auto"): unknown {
  let raw = unwrap(candidate);
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const format = outputFormat === "auto" ? detectSchemaFormat(trimmed) : outputFormat;
  return deserializeSchema(trimmed, format);
}

/** Some providers wrap the schema under a `schema` key; accept either shape. */
function unwrap(candidate: unknown): unknown {
  if (candidate && typeof candidate === "object" && "schema" in candidate) {
    return (candidate as { schema: unknown }).schema;
  }
  return candidate;
}

/**
 * Generate a validated {@link FormSchema} from a natural-language description.
 * Throws {@link SchemaGenerationError} if the model can't produce a valid schema
 * within `maxRepairAttempts`.
 */
export async function generateSchema(
  description: string,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const provider = options.provider ?? (await defaultProvider(options));
  const maxRepair = options.maxRepairAttempts ?? 2;
  const system =
    (options.system ?? SYSTEM_PROMPT) +
    (options.guidelines ? `\n\nAdditional guidelines:\n${options.guidelines}` : "");

  const promptFormat = options.promptFormat ?? "json";
  const outputFormat = options.outputFormat ?? "json";

  let repair: RepairContext | undefined;
  let lastIssues: readonly ValidationIssue[] = [];

  for (let attempt = 1; attempt <= maxRepair + 1; attempt++) {
    const input: ProposeInput = repair
      ? { description, system, promptFormat, repair }
      : { description, system, promptFormat };
    const candidate = await provider.propose(input);
    const parsed = normalizeCandidate(candidate, outputFormat);
    const result = validateSchema(parsed);
    if (result.ok) return { schema: result.value, attempts: attempt };

    lastIssues = result.issues;
    if (attempt > maxRepair) break;
    repair = { previous: parsed, issues: result.issues };
  }

  throw new SchemaGenerationError(
    `Could not produce a valid schema after ${maxRepair + 1} attempts.`,
    lastIssues,
  );
}

/** Lazily construct the default (Claude) provider so OpenAI-only users don't need a key. */
async function defaultProvider(options: GenerateOptions): Promise<SchemaProvider> {
  const { claudeProvider } = await import("./claude.js");
  const opts: { apiKey?: string; model?: string } = {};
  if (options.apiKey !== undefined) opts.apiKey = options.apiKey;
  if (options.model !== undefined) opts.model = options.model;
  return claudeProvider(opts);
}

export const SYSTEM_PROMPT = `You design forms as Formwright schemas — plain JSON or TOON (Token-Oriented Object Notation), no code.
Both encode the same data model; prefer JSON unless the caller asks for TOON.

A FormSchema has:
- "id" (string), "version" (string, e.g. "1.0"), optional "title", and "fields" (non-empty array).
- optional "submit": { "endpoint": { "method": "POST"|"GET"|"PUT"|"PATCH"|"DELETE", "url": string }, "transform"?, "onSuccess"?, "onError"? }.

Each field has "id" (unique within its scope) and "type", plus optional "label", "placeholder", "help", "description", "defaultValue".
Field types:
- "text" | "email" | "password" | "number" | "textarea" | "phone" (international; country selector + validation; payload { country, national }; optional "phone": { "defaultCountry"?, "preferredCountries"? })
- "checkbox" | "toggle" (boolean; toggle renders as a switch)
- "select" | "radio" — need "options": [{ "label": string, "value": string|number }]
- "group" — a nested object; needs "fields": [ ...child fields ]. Produces an object in the payload.
- "collection" — a repeatable list of objects; needs "fields", optional "itemLabel", "addLabel", "minItems", "maxItems". Produces an array of objects.
- "steps" — a multi-step wizard; needs "fields": [ step, step, … ]. Each child must have "type": "step".
- "step" — one wizard step (like a group); needs "label", optional "description", and "fields". Produces a nested object in the payload under the step id.

For multi-step / wizard forms, wrap steps in a "steps" container:
{ "id": "wizard", "type": "steps", "layout": "bar"|"tabs"|"numbers", "fields": [
  { "id": "personal", "type": "step", "label": "Personal", "fields": [ ... ] },
  { "id": "account", "type": "step", "label": "Account", "fields": [ ... ] }
]}
Optional on "steps": "showProgress" (default true), "validateOnNext" (default true), "nextLabel", "prevLabel", "submitLabel".

Validation (optional): "validation": { "kind": "string"|"number", "required"?, "min"?, "max"?, "minLength"?, "maxLength"?, "pattern"?, "format"?: "email"|"url"|"uuid"|"phone", "message"? }. For "phone" fields, format "phone" is implied.

Conditional logic — data, not code — via "visibleWhen" / "enabledWhen" / "requiredWhen", a JSONLogic-style expression:
{ "==": [a, b] }, "!=", ">", ">=", "<", "<=", { "in": [needle, haystack] }, { "and": [...] }, { "or": [...] }, { "not": x }, and { "var": "fieldId" } to read another field's value.
Names resolve to a sibling first, then outward to the form root — so a field inside a group or collection row can react to an outer toggle.

Other per-field options: "omit": true (keep in the UI but exclude from the payload), "labelPosition": "start"|"end" (checkbox/toggle), "layout" ("accordion" for group; "cards"|"accordion" for collection).

Produce sensible labels, validation, and conditions matching the request. Prefer "toggle" for yes/no switches and add helpful placeholders. Output ONLY the schema object.`;
