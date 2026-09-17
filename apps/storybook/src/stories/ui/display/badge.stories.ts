import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  label: string;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  variant: "soft" | "solid" | "outline";
  size: "sm" | "md";
  dot: boolean;
};

const TONES = ["neutral", "accent", "success", "warning", "danger"] as const;
const VARIANTS = ["soft", "solid", "outline"] as const;

const meta: Meta<Args> = {
  title: "UI/Display/Badge",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A short, non-interactive label for a status, a count or a plan name. Use it to annotate content; use a tag when the user can act on the label. `import "@formwright/ui/badge";`',
      },
    },
  },
  argTypes: {
    label: { control: "text", description: "Badge text (default slot)" },
    tone: { control: "select", options: [...TONES] },
    variant: { control: "select", options: [...VARIANTS] },
    size: { control: "select", options: ["sm", "md"] },
    dot: { control: "boolean" },
  },
  args: {
    label: "Active",
    tone: "success",
    variant: "soft",
    size: "md",
    dot: true,
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    canvas(`<div class="sb-ui-row"><fw-badge ${attrs(rest)}>${label}</fw-badge></div>`),
};

export const ToneByVariant: Story = {
  name: "Every tone × variant",
  render: () => {
    const rows = VARIANTS.map(
      (variant) =>
        `<div class="sb-ui-row"><code style="width:4.5rem">${variant}</code>${TONES.map(
          (tone) => `<fw-badge tone="${tone}" variant="${variant}">${tone}</fw-badge>`,
        ).join("")}</div>`,
    ).join("");
    return canvas(rows, { width: "40rem" });
  },
};

export const WithDot: Story = {
  name: "Status with dot",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-badge tone="success" dot>Active</fw-badge>
        <fw-badge tone="warning" dot>Expiring soon</fw-badge>
        <fw-badge tone="danger" dot>Expired</fw-badge>
        <fw-badge dot>Frozen</fw-badge>
      </div>`,
      { note: "The dot is decorative — the meaning is always in the text." },
    ),
};

export const Sizes: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-badge size="sm" tone="accent" variant="outline">Pro</fw-badge>
        <fw-badge size="md" tone="accent" variant="outline">Pro</fw-badge>
      </div>
      <div class="sb-ui-row">
        <strong>Unpaid invoices</strong>
        <fw-badge size="sm" tone="danger" variant="solid">3</fw-badge>
      </div>`,
    ),
};

export const InAMemberList: Story = {
  name: "In a member list",
  render: () =>
    canvas(
      `<ul style="list-style:none;margin:0;padding:0;display:grid;gap:10px">
        <li class="sb-ui-row" style="justify-content:space-between">Ali Arsalan <span class="sb-ui-row"><fw-badge tone="accent" variant="outline">Gold</fw-badge><fw-badge tone="success" dot>Active</fw-badge></span></li>
        <li class="sb-ui-row" style="justify-content:space-between">Sara Khan <span class="sb-ui-row"><fw-badge variant="outline">Basic</fw-badge><fw-badge tone="warning" dot>Expires in 3 days</fw-badge></span></li>
        <li class="sb-ui-row" style="justify-content:space-between">Omar Farooq <span class="sb-ui-row"><fw-badge tone="accent" variant="outline">Platinum</fw-badge><fw-badge tone="danger" dot>PKR 8,500 due</fw-badge></span></li>
      </ul>`,
    ),
};
