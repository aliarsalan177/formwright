/**
 * Claude provider — emits the schema through a forced tool call on the Anthropic
 * Messages API. Default model is Claude Opus 4.8 (`claude-opus-4-8`).
 */
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, type ProposeInput, type SchemaProvider } from "./index.js";

/** Claude Opus 4.8 — the most capable model. */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-4-8";

export interface ClaudeProviderOptions {
  readonly apiKey?: string;
  /** Bring your own configured client (takes precedence over `apiKey`). */
  readonly client?: Anthropic;
  readonly model?: string;
  readonly maxTokens?: number;
}

const TOOL_NAME = "emit_form_schema";

const TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Emit the complete Formwright form schema as a structured object.",
  input_schema: {
    type: "object",
    properties: {
      schema: { type: "object", description: "A complete, valid Formwright FormSchema." },
    },
    required: ["schema"],
  },
};

export function claudeProvider(options: ClaudeProviderOptions = {}): SchemaProvider {
  const client =
    options.client ?? new Anthropic(options.apiKey ? { apiKey: options.apiKey } : undefined);
  const model = options.model ?? DEFAULT_CLAUDE_MODEL;
  const maxTokens = options.maxTokens ?? 16000;

  return {
    async propose(input: ProposeInput): Promise<unknown> {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: input.system,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content: buildPrompt(input) }],
      });
      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (!toolUse) throw new Error("Claude did not emit a schema via the tool.");
      return toolUse.input;
    },
  };
}
