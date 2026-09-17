import type { Meta, StoryObj } from "@storybook/html";
import type { FwProgress } from "@formwright/ui/progress";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  label: string;
  value: number;
  max: number;
  indeterminate: boolean;
  variant: "linear" | "circular";
  tone: "accent" | "success" | "warning" | "danger";
  size: "sm" | "md" | "lg";
  showValue: boolean;
};

const TONES = ["accent", "success", "warning", "danger"] as const;

const meta: Meta<Args> = {
  title: "UI/Display/Progress",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'How far along a task is, as a bar or a ring. Leave out `value` (or set `indeterminate`) for ongoing activity with no known amount. `import "@formwright/ui/progress";`',
      },
    },
  },
  argTypes: {
    label: { control: "text", description: "Accessible name (not shown)" },
    value: { control: { type: "number", min: 0 } },
    max: { control: { type: "number", min: 1 } },
    indeterminate: { control: "boolean" },
    variant: { control: "select", options: ["linear", "circular"] },
    tone: { control: "select", options: [...TONES] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    showValue: { control: "boolean" },
  },
  args: {
    label: "Sessions used",
    value: 7,
    max: 12,
    indeterminate: false,
    variant: "linear",
    tone: "accent",
    size: "md",
    showValue: true,
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => canvas(`<fw-progress ${attrs(args)}></fw-progress>`),
};

export const LinearAndCircular: Story = {
  name: "Linear & circular",
  render: () =>
    canvas(
      `<fw-progress label="Profile complete" value="40" show-value></fw-progress>
      <fw-progress label="Loading payments"></fw-progress>
      <div class="sb-ui-row">
        <fw-progress variant="circular" size="sm" label="Profile complete" value="80"></fw-progress>
        <fw-progress variant="circular" label="Profile complete" value="80" show-value></fw-progress>
        <fw-progress variant="circular" size="lg" label="Profile complete" value="80" show-value></fw-progress>
        <fw-progress variant="circular" size="lg" label="Syncing"></fw-progress>
      </div>`,
      { note: "Determinate and indeterminate (no <code>value</code>) in both variants." },
    ),
};

export const TonesAndSizes: Story = {
  name: "Tones & sizes",
  render: () =>
    canvas(
      `${TONES.map(
        (tone, i) =>
          `<fw-progress label="${tone}" tone="${tone}" value="${30 + i * 20}" show-value></fw-progress>`,
      ).join("")}
      <fw-progress label="Small" size="sm" value="60"></fw-progress>
      <fw-progress label="Large" size="lg" value="60"></fw-progress>`,
    ),
};

export const MembershipUsage: Story = {
  name: "Membership usage",
  render: () =>
    canvas(
      `<div style="display:grid;gap:6px">
        <div class="sb-ui-row" style="justify-content:space-between"><span>Personal training sessions</span><span style="color:var(--fw-muted)">10 of 12</span></div>
        <fw-progress label="Personal training sessions used" value="10" max="12" tone="warning"></fw-progress>
      </div>
      <div style="display:grid;gap:6px">
        <div class="sb-ui-row" style="justify-content:space-between"><span>Instalments paid</span><span style="color:var(--fw-muted)">PKR 18,000 of 24,000</span></div>
        <fw-progress label="Instalments paid" value="18000" max="24000" tone="success" show-value></fw-progress>
      </div>`,
      {
        note: "Visible text beside the bar for sighted users; <code>label</code> names it for screen readers.",
      },
    ),
};

export const Animated: Story = {
  name: "Animated upload",
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row" style="justify-content:space-between"><span>Importing members.csv</span><span data-status style="color:var(--fw-muted)">0%</span></div>
      <fw-progress label="Importing members" value="0" show-value></fw-progress>
      <fw-progress variant="circular" size="lg" label="Importing members" value="0" show-value></fw-progress>`,
      { note: "The value is advanced by a timer, cleared when the story unmounts." },
    );
    const bars = Array.from(host.querySelectorAll<FwProgress>("fw-progress"));
    const status = host.querySelector<HTMLElement>("[data-status]")!;
    let value = 0;
    const timer = window.setInterval(() => {
      value = value >= 100 ? 0 : value + 5;
      for (const bar of bars) {
        bar.value = value;
        bar.tone = value === 100 ? "success" : "accent";
      }
      status.textContent = value === 100 ? "Done" : `${value}%`;
    }, 300);
    host.__storyDispose = () => window.clearInterval(timer);
    return host;
  },
};
