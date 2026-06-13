/**
 * OpenAI (GPT) provider — uses JSON mode on the Chat Completions API.
 *
 * To avoid a hard dependency on the `openai` package, pass your own client:
 *
 *   import OpenAI from "openai";
 *   import { generateSchema, openaiProvider } from "@formwright/ai";
 *   const { schema } = await generateSchema("a contact form", {
 *     provider: openaiProvider({ client: new OpenAI() }),
 *   });
 *
 * Any client matching {@link OpenAILike} works (Azure OpenAI, compatible gateways).
 */
import { buildPrompt, type ProposeInput, type SchemaProvider } from "./index.js";

/** Minimal structural shape of an OpenAI client's `chat.completions.create`. */
export interface OpenAILike {
  chat: {
    completions: {
      create(body: {
        model: string;
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        response_format?: { type: "json_object" };
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

export interface OpenAIProviderOptions {
  /** A configured OpenAI client (e.g. `new OpenAI()`). Required. */
  readonly client: OpenAILike;
  readonly model?: string;
}

export function openaiProvider(options: OpenAIProviderOptions): SchemaProvider {
  const model = options.model ?? "gpt-4o";
  return {
    async propose(input: ProposeInput): Promise<unknown> {
      const response = await options.client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          {
            role: "user",
            content: `${buildPrompt(input)}\n\nRespond with ONLY the JSON schema object.`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("OpenAI returned no content.");
      return JSON.parse(content) as unknown;
    },
  };
}
