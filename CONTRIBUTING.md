# Contributing to Formwright

Thanks for helping build Formwright! 🎉

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

We use **pnpm** + **Turborepo**. Node >= 20.

## Workflow

1. Branch off `main`.
2. Make your change with tests (`vitest`).
3. Run `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.
4. Add a changeset describing user-facing changes: `pnpm changeset`.
5. Open a PR. CI must pass.

Merging to `main` with a changeset file is enough to release. The Release
workflow versions every public `@formwright/*` package together (forms, grid,
and Overlaywright), publishes to npm, and pushes git tags. Apps
(`playground`, `storybook`) stay private and are not published.

New packages must be public (`publishConfig.access: "public"`, no `"private"`)
and listed in a changeset so the first `npm publish` runs.

## Extension points

Formwright is designed to be extended without forking:

- **Widgets** — register a field `type` → renderer via `registerWidget`.
- **Providers** — register an integration (i18n, data) via `registerProvider`.
- **Validators** — anything [Standard Schema](https://standardschema.dev)-compatible.
- **Codegen emitters** — add a `--target` by implementing the emitter interface.

## Schema changes (RFC)

The schema is the public contract. Changes to its shape require an RFC in `/rfcs`
plus a bump to the schema `version` and a migration codemod where breaking.

## Commit style

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` …).
