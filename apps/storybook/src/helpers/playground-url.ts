/**
 * Playground iframe URL for Storybook "Apps/Playground" stories.
 * - Local dev: static playground files at `/playground/` (see `.storybook/main.ts`).
 * - GitHub Pages: live demos one level up from `/formwright/storybook/`.
 */
export function playgroundPageUrl(page: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base.includes("/storybook")) {
    return `../${page}`;
  }
  return `/playground/${page}`;
}
