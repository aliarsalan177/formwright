import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type SwitchArgs = {
  label: string;
  checked: boolean;
  value: string;
  help: string;
  size: "sm" | "md" | "lg";
  labelPosition: "start" | "end";
  required: boolean;
  disabled: boolean;
};

const meta: Meta<SwitchArgs> = {
  title: "UI/Form Controls/Switch",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-switch>` is an on/off setting that takes effect immediately, announced as a switch; use a checkbox instead when the choice is only applied on submit. `import "@formwright/ui/switch";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    checked: { control: "boolean" },
    value: { control: "text" },
    help: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    labelPosition: { control: "select", options: ["end", "start"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Auto-renew membership",
    checked: true,
    value: "on",
    help: "",
    size: "md",
    labelPosition: "end",
    required: false,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<SwitchArgs>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    logEvents(canvas(`<fw-switch ${attrs(rest)}>${label}</fw-switch>`), ["input", "change"]),
};

export const SettingsList: Story = {
  name: "Settings list",
  render: () =>
    logEvents(
      canvas(
        `<fw-switch name="sms" checked help="Sent 3 days before the fee is due">Payment reminders by SMS</fw-switch>
        <fw-switch name="whatsapp">Class updates on WhatsApp</fw-switch>
        <fw-switch name="freeze" help="Pauses billing for up to 30 days">Freeze membership</fw-switch>
        <fw-switch name="locker" checked disabled help="Included in the Premium plan">Personal locker</fw-switch>`,
        { note: "Member notification settings. Each toggle applies straight away." },
      ),
      ["change"],
    ),
};

export const LabelPosition: Story = {
  name: "Label position and sizes",
  render: () =>
    canvas(
      `<fw-switch label-position="end" checked>Label after (end)</fw-switch>
      <fw-switch label-position="start" checked>Label before (start)</fw-switch>
      <div class="sb-ui-row">
        <fw-switch size="sm" checked>Small</fw-switch>
        <fw-switch size="md" checked>Medium</fw-switch>
        <fw-switch size="lg" checked>Large</fw-switch>
      </div>`,
    ),
};
