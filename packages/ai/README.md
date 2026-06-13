# @formwright/ai

> Generate a **validated** [Formwright](https://github.com/aliarsalan177/formwright) schema from a natural-language description — with any LLM.

Describe a form in English; get back a schema the runtime accepts. Provider-agnostic:
the validate → repair loop is built in, and the model call is pluggable — Claude
(default), OpenAI/GPT, or anything else, each through its own native SDK.

```bash
npm i @formwright/ai
```

## Claude (default)

```ts
import { generateSchema } from "@formwright/ai";
import { Form } from "@formwright/core";
import "@formwright/dom";

// Uses ANTHROPIC_API_KEY; model defaults to claude-opus-4-8
const { schema, attempts } = await generateSchema(
  "a checkout form: email, a plan dropdown (Free/Pro), and a promo code shown only when Pro is selected",
);

new Form(schema).mount(document.getElementById("root")!);
```

## OpenAI (GPT)

Bring your own `openai` client — no extra dependency is bundled:

```ts
import OpenAI from "openai";
import { generateSchema, openaiProvider } from "@formwright/ai";

const { schema } = await generateSchema("a contact form with name, email, and message", {
  provider: openaiProvider({ client: new OpenAI(), model: "gpt-4o" }),
});
```

## Any other model (Gemini, Mistral, local, …)

Wrap any async function that returns a candidate schema object; the repair loop does the rest:

```ts
import { generateSchema, defineProvider, buildPrompt } from "@formwright/ai";

const gemini = defineProvider(async (input) => {
  const text = await callYourModel({ system: input.system, prompt: buildPrompt(input) });
  return JSON.parse(text); // return the parsed schema object
});

const { schema } = await generateSchema("an event RSVP form", { provider: gemini });
```

`input.repair` is populated on retries with the previous (invalid) output and the exact
validation issues, so your provider can pass them back to the model.

## How it works

1. The provider proposes a schema object from your description.
2. It's checked with `@formwright/schema`'s validator.
3. If invalid, the precise, path-addressed issues are fed back for repair (up to
   `maxRepairAttempts`, default 2).
4. You get a `FormSchema` that the runtime is guaranteed to accept — or a thrown
   `SchemaGenerationError` carrying the remaining issues.

## API

```ts
generateSchema(description: string, options?: {
  provider?: SchemaProvider;   // default: Claude
  apiKey?: string;             // for the default Claude provider
  model?: string;              // override the default model
  maxRepairAttempts?: number;  // default 2
  system?: string;             // override the Formwright DSL prompt
  guidelines?: string;         // append extra guidance
}): Promise<{ schema: FormSchema; attempts: number }>
```

Providers: `claudeProvider(opts)`, `openaiProvider({ client, model? })`, `defineProvider(fn)`.

## License

MIT
