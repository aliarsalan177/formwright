import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  size: "sm" | "md" | "lg";
  label: string;
};

const meta: Meta<Args> = {
  title: "UI/Display/Spinner",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'An indeterminate loading indicator with a screen-reader label. Use it for short waits of unknown length; use a progress bar when you know how far along a task is. `import "@formwright/ui/spinner";`',
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    label: { control: "text", description: "Visually hidden status text" },
  },
  args: {
    size: "md",
    label: "Loading members",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => canvas(`<fw-spinner ${attrs(args)}></fw-spinner>`, { center: true }),
};

export const Sizes: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-spinner size="sm"></fw-spinner>
        <fw-spinner size="md"></fw-spinner>
        <fw-spinner size="lg"></fw-spinner>
      </div>`,
    ),
};

export const InlineWithContent: Story = {
  name: "Inline with content",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-button variant="secondary" disabled>
          <span class="sb-ui-row" style="gap:8px"><fw-spinner size="sm" label="Syncing attendance"></fw-spinner>Syncing attendance…</span>
        </fw-button>
      </div>
      <div class="sb-ui-row" style="padding:12px;border:1px solid var(--fw-border);border-radius:var(--fw-radius)">
        <fw-spinner size="sm" label="Checking fingerprint reader"></fw-spinner>
        <span>Checking fingerprint reader…</span>
      </div>`,
      {
        note: "For a button's own busy state prefer <code>&lt;fw-button loading&gt;</code>; this shows the spinner sitting in a row of text.",
      },
    ),
};

export const CustomColour: Story = {
  name: "Custom colour",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-spinner size="lg"></fw-spinner>
        <fw-spinner size="lg" style="color:#16a34a"></fw-spinner>
        <fw-spinner size="lg" style="color:#71717a"></fw-spinner>
        <span style="--fw-accent:#ea580c"><fw-spinner size="lg"></fw-spinner></span>
      </div>
      <div class="sb-ui-row" style="background:#18181b;padding:16px;border-radius:8px">
        <fw-spinner style="color:#fff"></fw-spinner>
        <span style="color:#fff">On a dark surface</span>
      </div>`,
      {
        note: "The ring uses <code>currentColor</code>, the accent by default. Set <code>color</code> on the spinner, or <code>--fw-accent</code> on an ancestor.",
      },
    ),
};
