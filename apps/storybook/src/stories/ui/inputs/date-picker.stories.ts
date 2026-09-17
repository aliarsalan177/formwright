import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface DatePickerArgs {
  label: string;
  placeholder: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  mode: "single" | "range";
  value: string;
  min: string;
  max: string;
  locale: string;
  format: "short" | "medium" | "long";
  firstDayOfWeek: number | undefined;
  clearable: boolean;
  closeOnSelect: boolean;
  readOnly: boolean;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["input", "change", "fw-show", "fw-hide"];

const meta: Meta<DatePickerArgs> = {
  title: "UI/Inputs/Date picker",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A date field with a calendar popup, for a single date or a range. It shows dates in the user\'s locale but always holds ISO `YYYY-MM-DD` (or `start/end` for ranges). `import "@formwright/ui/date-picker";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    mode: { control: "select", options: ["single", "range"] },
    value: { control: "text", description: "ISO date, or `start/end` in range mode." },
    min: { control: "text" },
    max: { control: "text" },
    locale: { control: "text" },
    format: { control: "select", options: ["short", "medium", "long"] },
    firstDayOfWeek: { control: { type: "number", min: 0, max: 6, step: 1 } },
    clearable: { control: "boolean" },
    closeOnSelect: { control: "boolean" },
    readOnly: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Joining date",
    placeholder: "",
    help: "",
    error: "",
    size: "md",
    mode: "single",
    value: "2026-09-17",
    min: "",
    max: "",
    locale: "",
    format: "medium",
    firstDayOfWeek: undefined,
    clearable: true,
    closeOnSelect: true,
    readOnly: false,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<DatePickerArgs>;

export const Playground: Story = {
  render: ({ closeOnSelect, readOnly, ...rest }) =>
    logEvents(
      canvas(
        `<fw-date-picker name="joined" close-on-select="${String(closeOnSelect)}"
            ${attrs({ ...rest, readonly: readOnly })}></fw-date-picker>`,
      ),
      EVENTS,
    ),
};

export const MembershipPeriod: Story = {
  name: "Range — membership period",
  render: () =>
    logEvents(
      canvas(
        `<fw-date-picker label="Membership period" name="period" mode="range" format="long"
            value="2026-09-01/2026-11-30" clearable required
            help="Quarterly plan: 1 September to 30 November."></fw-date-picker>`,
        {
          note: "The value is an ISO interval, <code>2026-09-01/2026-11-30</code>, submitted as one string. The popup closes once the end is picked.",
        },
      ),
      EVENTS,
    ),
};

export const MinAndMax: Story = {
  name: "Min and max",
  render: () =>
    logEvents(
      canvas(
        `<fw-date-picker label="Personal training session" name="session" today="2026-09-17"
            min="2026-09-17" max="2026-10-16" clearable
            help="Bookable from today up to 30 days ahead."></fw-date-picker>`,
        {
          note: "Days outside <code>min</code>…<code>max</code> cannot be picked, and typed dates outside the range are flagged.",
        },
      ),
      EVENTS,
    ),
};

export const RightToLeft: Story = {
  name: "RTL locale (Urdu)",
  render: () =>
    logEvents(
      canvas(
        `<div dir="rtl" lang="ur" class="sb-ui-body">
          <fw-date-picker label="تاریخِ شمولیت" name="joined" locale="ur" format="long"
              value="2026-09-17" clearable></fw-date-picker>
          <fw-date-picker label="رکنیت کی مدت" name="period" locale="ur" mode="range"
              value="2026-09-01/2026-09-30"></fw-date-picker>
        </div>`,
        {
          note: 'Wrapped in <code>dir="rtl"</code>: month names come from <code>Intl</code> in Urdu and the arrow keys swap direction.',
        },
      ),
      ["change"],
    ),
};

export const States: Story = {
  render: () =>
    canvas(`
      <fw-date-picker size="sm" label="Small" value="2026-09-17"></fw-date-picker>
      <fw-date-picker size="lg" label="Large" value="2026-09-17"></fw-date-picker>
      <fw-date-picker label="Read-only" value="2026-01-15" format="long" readonly></fw-date-picker>
      <fw-date-picker label="Disabled" value="2026-01-15" disabled></fw-date-picker>
      <fw-date-picker label="Date of birth" required error="Members must be at least 16 years old."
          value="2015-04-02" clearable></fw-date-picker>
    `),
};
