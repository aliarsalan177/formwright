# @formwright/schema

> Schema types and a dependency-free runtime validator for [Formwright](https://github.com/aliarsalan177/formwright).

The schema is Formwright's public contract: plain, serializable data that both the runtime
renderer and the codegen compiler consume. This package gives you the TypeScript types plus
a validator that produces precise, path-addressed issues — ideal for repairing LLM-emitted
schemas before they reach the runtime.

```bash
npm i @formwright/schema
```

```ts
import { validateSchema, parseSchema } from "@formwright/schema";

// Non-throwing: inspect issues
const result = validateSchema(unknownInput);
if (!result.ok) {
  for (const issue of result.issues) console.warn(issue.path, issue.message);
}

// Or throw a single aggregated error on failure:
const schema = parseSchema(unknownInput);
```

## Types

`FormSchema`, `FieldSchema`, `FieldType`, `FieldOption`, `ValidationSchema`, `Condition`,
`SubmitSchema`, and more — the full, serializable shape of a form, including nested `group`
and `collection` fields and the JSONLogic-style `Condition` algebra.

```ts
import type { FormSchema } from "@formwright/schema";

const schema: FormSchema = {
  id: "signup",
  version: "1.0",
  fields: [
    { id: "email", type: "email", validation: { kind: "string", format: "email", required: true } },
  ],
};
```

## Why a runtime validator

LLM-emitted schemas can be malformed. `validateSchema` checks the structure (ids present and
unique, container fields declared, etc.) and returns issues addressed by path
(`fields[2].type`), so you can repair or reject input before constructing a `Form`.

## License

MIT
