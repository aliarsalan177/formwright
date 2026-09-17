import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  orientation: "horizontal" | "vertical";
  label: string;
};

const meta: Meta<Args> = {
  title: "UI/Display/Divider",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A separator line between groups of content, horizontal or vertical, optionally with a centred label. Spacing comes from `--fw-divider-spacing`. `import "@formwright/ui/divider";`',
      },
    },
  },
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    label: { control: "text", description: "Optional label (default slot)" },
  },
  args: {
    orientation: "horizontal",
    label: "",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    canvas(
      `<div style="display:flex;flex-direction:${rest.orientation === "vertical" ? "row" : "column"};gap:12px;min-height:3rem">
        <span>Above / before</span>
        <fw-divider ${attrs(rest)}>${label}</fw-divider>
        <span>Below / after</span>
      </div>`,
    ),
};

export const Horizontal: Story = {
  render: () =>
    canvas(
      `<div>
        <strong>Ali Arsalan</strong>
        <div style="color:var(--fw-muted)">Gold plan · Member since March 2024</div>
      </div>
      <fw-divider></fw-divider>
      <div class="sb-ui-row" style="justify-content:space-between"><span>Monthly fee</span><strong>PKR 12,000</strong></div>
      <fw-divider style="--fw-divider-spacing:8px"></fw-divider>
      <div class="sb-ui-row" style="justify-content:space-between"><span>Balance due</span><strong>PKR 0</strong></div>`,
    ),
};

export const VerticalInARow: Story = {
  name: "Vertical in a row",
  render: () =>
    canvas(
      `<div class="sb-ui-row" style="gap:0">
        <fw-button variant="ghost" size="sm">Edit</fw-button>
        <fw-divider orientation="vertical" style="--fw-divider-spacing:4px;height:1.25rem"></fw-divider>
        <fw-button variant="ghost" size="sm">Freeze</fw-button>
        <fw-divider orientation="vertical" style="--fw-divider-spacing:4px;height:1.25rem"></fw-divider>
        <fw-button variant="ghost" size="sm">Delete</fw-button>
      </div>
      <div style="display:flex;align-items:stretch;gap:16px">
        <div><div style="color:var(--fw-muted)">Active</div><strong>248</strong></div>
        <fw-divider orientation="vertical"></fw-divider>
        <div><div style="color:var(--fw-muted)">Expiring</div><strong>17</strong></div>
        <fw-divider orientation="vertical"></fw-divider>
        <div><div style="color:var(--fw-muted)">Due (PKR)</div><strong>86,500</strong></div>
      </div>`,
      { note: "A vertical divider stretches to the height of a flex row." },
    ),
};

export const WithLabel: Story = {
  name: "With label",
  render: () =>
    canvas(
      `<fw-button block>Check in with fingerprint</fw-button>
      <fw-divider>or</fw-divider>
      <fw-input label="Membership number" placeholder="e.g. GMS-0042"></fw-input>`,
      { note: "The label is decorative; don't put information only there." },
    ),
};
