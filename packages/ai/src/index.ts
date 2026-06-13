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
import { validateSchema, type FormSchema, type ValidationIssue } from "@formwright/schema";

export { claudeProvider, type ClaudeProviderOptions } from "./claude.js";
export { openaiProvider, type OpenAIProviderOptions, type OpenAILike } from "./openai.js";

/** A pluggable model backend: produce a candidate schema object for a request. */
export interface SchemaProvider {
  propose(input: ProposeInput): Promise<unknown>;
}

export interface ProposeInput {
  readonly description: string;
  readonly system: string;
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
  if (!input.repair) {
    return `Design a Formwright form for: ${input.description}`;
  }
  return (
    `Design a Formwright form for: ${input.description}\n\n` +
    `Your previous attempt was INVALID:\n${JSON.stringify(input.repair.previous, null, 2)}\n\n` +
    `Validation issues to fix:\n` +
    input.repair.issues.map((i) => `- ${i.path}: ${i.message}`).join("\n") +
    `\n\nReturn a corrected schema that resolves every issue.`
  );
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

  let repair: RepairContext | undefined;
  let lastIssues: readonly ValidationIssue[] = [];

  for (let attempt = 1; attempt <= maxRepair + 1; attempt++) {
    const input: ProposeInput = repair ? { description, system, repair } : { description, system };
    const candidate = await provider.propose(input);
    const result = validateSchema(unwrap(candidate));
    if (result.ok) return { schema: result.value, attempts: attempt };

    lastIssues = result.issues;
    if (attempt > maxRepair) break;
    repair = { previous: unwrap(candidate), issues: result.issues };
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

export const SYSTEM_PROMPT = `You design forms as Formwright schemas — plain JSON, no code.

A FormSchema has:
- "id" (string), "version" (string, e.g. "1.0"), optional "title", and "fields" (non-empty array).
- optional "submit": { "endpoint": { "method": "POST"|"GET"|"PUT"|"PATCH"|"DELETE", "url": string }, "transform"?, "onSuccess"?, "onError"? }.

Each field has "id" (unique within its scope) and "type", plus optional "label", "placeholder", "help", "description", "defaultValue".
Field types:
- "text" | "email" | "password" | "number" | "textarea"
- "checkbox" | "toggle" (boolean; toggle renders as a switch)
- "select" | "radio" — need "options": [{ "label": string, "value": string|number }]
- "group" — a nested object; needs "fields": [ ...child fields ]. Produces an object in the payload.
- "collection" — a repeatable list of objects; needs "fields", optional "itemLabel", "addLabel", "minItems", "maxItems". Produces an array of objects.

Validation (optional): "validation": { "kind": "string"|"number", "required"?, "min"?, "max"?, "minLength"?, "maxLength"?, "pattern"?, "format"?: "email"|"url"|"uuid", "message"? }.

Conditional logic — data, not code — via "visibleWhen" / "enabledWhen" / "requiredWhen", a JSONLogic-style expression:
{ "==": [a, b] }, "!=", ">", ">=", "<", "<=", { "in": [needle, haystack] }, { "and": [...] }, { "or": [...] }, { "not": x }, and { "var": "fieldId" } to read another field's value.
Names resolve to a sibling first, then outward to the form root — so a field inside a group or collection row can react to an outer toggle.

Other per-field options: "omit": true (keep in the UI but exclude from the payload), "labelPosition": "start"|"end" (checkbox/toggle), "layout" ("accordion" for group; "cards"|"accordion" for collection).

Produce sensible labels, validation, and conditions matching the request. Prefer "toggle" for yes/no switches and add helpful placeholders. Output ONLY the schema object.`;
