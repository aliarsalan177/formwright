import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface NumberInputArgs {
  label: string;
  placeholder: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  value: number | undefined;
  min: number | undefined;
  max: number | undefined;
  step: number;
  precision: number | undefined;
  locale: string;
  stepperPosition: "end" | "split";
  noStepper: boolean;
  readOnly: boolean;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["input", "change"];

const meta: Meta<NumberInputArgs> = {
  title: "UI/Inputs/Number input",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A number typed or stepped, read and shown in the user\'s locale, rounded to `precision` and clamped to `min`…`max`. Use it for quantities, amounts and measurements. `import "@formwright/ui/number-input";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    value: { control: "number" },
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    precision: { control: { type: "number", min: 0, max: 20, step: 1 } },
    locale: { control: "text" },
    stepperPosition: { control: "select", options: ["end", "split"] },
    noStepper: { control: "boolean" },
    readOnly: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Sessions per week",
    placeholder: "",
    help: "",
    error: "",
    size: "md",
    value: 3,
    min: 1,
    max: 7,
    step: 1,
    precision: undefined,
    locale: "",
    stepperPosition: "end",
    noStepper: false,
    readOnly: false,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<NumberInputArgs>;

export const Playground: Story = {
  render: ({ readOnly, ...rest }) =>
    logEvents(
      canvas(
        `<fw-number-input name="sessions" ${attrs({ ...rest, readonly: readOnly })}></fw-number-input>`,
      ),
      EVENTS,
    ),
};

export const PkrAmounts: Story = {
  name: "PKR amounts (en-PK)",
  render: () =>
    logEvents(
      canvas(
        `<fw-number-input label="Monthly fee" name="fee" value="12500" min="0" step="500" locale="en-PK">
          <span slot="prefix">Rs</span>
        </fw-number-input>
        <fw-number-input label="Admission charges" name="admission" value="5000" min="0" max="50000"
            step="1000" precision="2" locale="en-PK" help="Shown with 2 decimal places.">
          <span slot="prefix">PKR</span>
        </fw-number-input>
        <fw-number-input label="Annual revenue target" name="target" value="4250000" min="0" step="100000"
            locale="en-IN" help="en-IN groups in lakhs: 42,50,000.">
          <span slot="prefix">Rs</span>
        </fw-number-input>`,
        {
          note: "Type <code>15,000</code> or <code>15000</code> — grouping marks are ignored, and the value is shown formatted when you leave the field.",
        },
      ),
      EVENTS,
    ),
};

export const StepperLayouts: Story = {
  name: "Stepper position",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-number-input label="end (default)" value="2" min="0" max="10"></fw-number-input>
        <fw-number-input label="split" value="2" min="0" max="10" stepper-position="split"></fw-number-input>
        <fw-number-input label="no-stepper" value="2" min="0" max="10" no-stepper></fw-number-input>
      </div>`,
      {
        width: "48rem",
        note: "The − and + buttons repeat while held; ArrowUp/Down and PageUp/Down step from the keyboard.",
      },
    ),
};

export const PrecisionAndRange: Story = {
  name: "Step, precision and range",
  render: () =>
    logEvents(
      canvas(
        `<fw-number-input label="Body weight" name="weight" value="72.5" min="30" max="250" step="0.1" precision="1">
          <span slot="suffix">kg</span>
        </fw-number-input>
        <fw-number-input label="Body fat" name="bodyFat" value="18.25" min="3" max="60" step="0.25" precision="2">
          <span slot="suffix">%</span>
        </fw-number-input>
        <fw-number-input label="Locker number" name="locker" min="1" max="120" required
            placeholder="1–120" help="Type 150 to see the range error."></fw-number-input>`,
        {
          note: "Values are rounded to <code>precision</code> places and clamped to <code>min</code>…<code>max</code> on commit.",
        },
      ),
      EVENTS,
    ),
};

export const States: Story = {
  render: () =>
    canvas(
      `
      <div class="sb-ui-row">
        <fw-number-input size="sm" label="Small" value="1"></fw-number-input>
        <fw-number-input size="md" label="Medium" value="1"></fw-number-input>
        <fw-number-input size="lg" label="Large" value="1"></fw-number-input>
      </div>
      <fw-number-input label="Read-only" value="7000" locale="en-PK" readonly></fw-number-input>
      <fw-number-input label="Disabled" value="3" disabled></fw-number-input>
      <fw-number-input label="Discount" value="120" min="0" max="100" error="Discount cannot be more than 100%.">
        <span slot="suffix">%</span>
      </fw-number-input>
    `,
      { width: "48rem" },
    ),
};
