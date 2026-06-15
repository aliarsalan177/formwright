import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Overview/Welcome",
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj;

export const Welcome: Story = {
  render: () => {
    const el = document.createElement("div");
    el.className = "sb-overview";
    el.innerHTML = `
      <h1>Formwright Storybook</h1>
      <p>Interactive catalog of the Formwright monorepo — forms, grids, and playground apps.</p>
      <h2>Formwright</h2>
      <ul>
        <li><strong>Forms</strong> — field types, groups, collections, conditions, validation</li>
        <li><strong>Wizard UX</strong> — steps, fill/bar/tabs progress, URL sync, consent cache, success screen</li>
      </ul>
      <h2>Gridwright</h2>
      <ul>
        <li><strong>Live</strong> — virtualization + surgical cell updates</li>
        <li><strong>Pagination</strong> — client and server-side</li>
        <li><strong>Master / detail</strong> — nested grids, selection, bulk actions</li>
        <li><strong>Grouping</strong> — aggregates and grand totals</li>
      </ul>
      <h2>Apps</h2>
      <ul>
        <li><strong>Home</strong> — intro, packages, links to all playgrounds (<code>index.html</code>)</li>
        <li><strong>Form Playground</strong> — live schema editor, wizards, draft cache</li>
        <li><strong>Forge</strong> — visual form builder</li>
        <li><strong>Theme Builder</strong> — Shopify-style section settings + live preview</li>
        <li><strong>Settings Builder</strong> — iOS-style settings with instant / save modes</li>
        <li><strong>Gridwright</strong> — virtualized grid demos</li>
      </ul>
      <p><code>pnpm --filter @formwright/storybook dev</code> · port 6006</p>
    `;
    return el;
  },
};
