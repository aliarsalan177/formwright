# @formwright/schema

Schema types and a dependency-free runtime validator for [Formwright](../../README.md).

The schema is Formwright's public contract: plain, serializable data that both the
runtime renderer and the codegen compiler consume. This package gives you the
TypeScript types plus a validator that produces precise, path-addressed issues —
ideal for repairing LLM-emitted schemas before they reach the runtime.

```ts
import { validateSchema, parseSchema } from "@formwright/schema";

const result = validateSchema(unknownInput);
if (!result.ok) {
  for (const issue of result.issues) console.warn(issue.path, issue.message);
}

// or throw on failure:
const schema = parseSchema(unknownInput);
```
