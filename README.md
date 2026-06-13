# Formwright

> LLM schema-driven, signal-reactive, framework-agnostic form engine.

Define a form once as data — hand-written or LLM-generated — and render it to real,
**surgically-updating** DOM (no virtual DOM, no full re-render), inject it anywhere
with `new Form(schema, initialValue)`, or **generate real source code** from the same
schema.

```ts
import { Form } from "@formwright/core";

const form = new Form(schema, { email: "" });
form.mount(document.getElementById("root")!);
await form.submit();
```

## Packages

| Package                                   | Description                                 |
| ----------------------------------------- | ------------------------------------------- |
| [`@formwright/schema`](./packages/schema) | Schema types + runtime validator            |
| [`@formwright/core`](./packages/core)     | Signal reactivity facade + `Form` class     |
| [`@formwright/dom`](./packages/dom)       | Surgical direct-DOM renderer + core widgets |

## Development

```bash
pnpm install
pnpm build       # build all packages (turbo)
pnpm test        # run unit tests
pnpm typecheck   # type-check all packages
```

This is a pnpm + Turborepo monorepo. Releases are automated with
[changesets](https://github.com/changesets/changesets). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
