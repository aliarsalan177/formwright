import type { Meta, StoryObj } from "@storybook/html";
import type { FwRadioGroup } from "@formwright/ui/radio-group";
import { attrs, canvas, logEvents } from "../../../ui/story";

type RadioGroupArgs = {
  label: string;
  value: string;
  help: string;
  error: string;
  orientation: "vertical" | "horizontal";
  required: boolean;
  disabled: boolean;
};

const meta: Meta<RadioGroupArgs> = {
  title: "UI/Form Controls/Radio group",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-radio-group>` with `<fw-radio>` children picks exactly one of a few visible options; the group is the form control and follows the WAI-ARIA radio group keyboard pattern. `import "@formwright/ui/radio-group";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    value: { control: "select", options: ["", "monthly", "quarterly", "yearly"] },
    help: { control: "text" },
    error: { control: "text" },
    orientation: { control: "select", options: ["vertical", "horizontal"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Billing cycle",
    value: "monthly",
    help: "",
    error: "",
    orientation: "vertical",
    required: false,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<RadioGroupArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-radio-group ${attrs(args)}>
          <fw-radio value="monthly">Monthly</fw-radio>
          <fw-radio value="quarterly">Quarterly (5% off)</fw-radio>
          <fw-radio value="yearly">Yearly (15% off)</fw-radio>
        </fw-radio-group>`,
      ),
      ["input", "change"],
    ),
};

export const Orientation: Story = {
  render: () =>
    canvas(
      `<fw-radio-group label="Gender" name="gender" value="female">
        <fw-radio value="male">Male</fw-radio>
        <fw-radio value="female">Female</fw-radio>
        <fw-radio value="other">Prefer not to say</fw-radio>
      </fw-radio-group>
      <fw-radio-group label="Shift" name="shift" orientation="horizontal" value="evening">
        <fw-radio value="morning">Morning</fw-radio>
        <fw-radio value="afternoon" disabled>Afternoon</fw-radio>
        <fw-radio value="evening">Evening</fw-radio>
      </fw-radio-group>`,
      { note: "Vertical (default) and horizontal. Arrow keys step over the disabled radio." },
    ),
};

export const States: Story = {
  render: () =>
    canvas(
      `<fw-radio-group label="Payment method" required error="Choose how the member paid" help="Receipt is printed after saving">
        <fw-radio value="cash">Cash</fw-radio>
        <fw-radio value="card">Card</fw-radio>
        <fw-radio value="bank">Bank transfer</fw-radio>
      </fw-radio-group>
      <fw-radio-group label="Locker size" value="small" disabled>
        <fw-radio value="small">Small</fw-radio>
        <fw-radio value="large">Large</fw-radio>
      </fw-radio-group>`,
    ),
};

export const PlanPicker: Story = {
  name: "Plan picker",
  render: () => {
    const plans: Record<string, string> = {
      basic: "Basic: gym floor, 6am to 4pm. PKR 5,000 per month.",
      standard: "Standard: gym floor all day plus group classes. PKR 8,500 per month.",
      premium:
        "Premium: everything, a locker and 4 personal training sessions. PKR 14,000 per month.",
    };
    const host = canvas(
      `<fw-radio-group label="Choose a plan" name="plan" value="standard">
        <fw-radio value="basic"><strong>Basic</strong> · PKR 5,000/mo</fw-radio>
        <fw-radio value="standard"><strong>Standard</strong> · PKR 8,500/mo</fw-radio>
        <fw-radio value="premium"><strong>Premium</strong> · PKR 14,000/mo</fw-radio>
        <fw-radio value="corporate" disabled><strong>Corporate</strong> · contact sales</fw-radio>
      </fw-radio-group>
      <p id="summary" class="sb-ui-note" style="margin: 0"></p>`,
      {
        note: "Radio labels can hold markup. The summary below follows the group's <code>change</code> event.",
      },
    );
    const group = host.querySelector<FwRadioGroup>("fw-radio-group")!;
    const summary = host.querySelector("#summary")!;
    const update = () => {
      summary.textContent = plans[group.value] ?? "";
    };
    update();
    group.addEventListener("change", update);
    return logEvents(host, ["change"]);
  },
};
