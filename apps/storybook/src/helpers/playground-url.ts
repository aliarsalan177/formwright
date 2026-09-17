/**
 * Playground iframe URL for Storybook "Apps/Playground" stories.
 * - Local dev: the built playground (`pnpm --filter @formwright/playground build`),
 *   served from `/playground/dist/` (see `staticDirs` in `.storybook/main.ts`).
 *   The un-built HTML at `/playground/` references `/src/*.ts`, which only a Vite
 *   dev server can serve, so it renders unstyled and empty there.
 * - GitHub Pages: live demos one level up from `/formwright/storybook/`.
 */
export function playgroundPageUrl(page: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base.includes("/storybook")) {
    return `../${page}`;
  }
  return `/playground/dist/${page}`;
}
