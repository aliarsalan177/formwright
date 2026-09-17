import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type SelectArgs = {
  label: string;
  placeholder: string;
  value: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  clearable: boolean;
  required: boolean;
  disabled: boolean;
  placement: string;
};

const PLAN_OPTIONS = `
  <fw-option value="basic">Basic · PKR 5,000/mo</fw-option>
  <fw-option value="standard">Standard · PKR 8,500/mo</fw-option>
  <fw-option value="premium">Premium · PKR 14,000/mo</fw-option>
  <fw-option value="couple" disabled>Couple · sold out</fw-option>`;

const meta: Meta<SelectArgs> = {
  title: "UI/Form Controls/Select",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-select>` with `<fw-option>` children picks one value from a list; it behaves like a native select from the keyboard and opens in the top layer so it is never clipped. `import "@formwright/ui/select";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    value: { control: "select", options: ["", "basic", "standard", "premium"] },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    clearable: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    placement: {
      control: "select",
      options: ["bottom-start", "bottom", "bottom-end", "top-start", "top", "top-end"],
    },
  },
  args: {
    label: "Membership plan",
    placeholder: "Choose a plan…",
    value: "",
    help: "",
    error: "",
    size: "md",
    clearable: false,
    required: false,
    disabled: false,
    placement: "bottom-start",
  },
};
export default meta;

type Story = StoryObj<SelectArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(canvas(`<fw-select ${attrs(args)}>${PLAN_OPTIONS}</fw-select>`), [
      "input",
      "change",
      "fw-show",
      "fw-hide",
    ]),
};

export const PlaceholderAndClearable: Story = {
  name: "Placeholder and clearable",
  render: () =>
    logEvents(
      canvas(
        `<fw-select label="Trainer" placeholder="Any trainer" clearable value="usman">
          <fw-option value="usman">Usman Tariq</fw-option>
          <fw-option value="sana">Sana Malik</fw-option>
          <fw-option value="faisal">Faisal Qureshi</fw-option>
        </fw-select>
        <fw-select label="Branch" placeholder="Select a branch">
          <fw-option value="dha">DHA Phase 5</fw-option>
          <fw-option value="gulberg">Gulberg III</fw-option>
          <fw-option value="johar">Johar Town</fw-option>
        </fw-select>`,
        {
          note: "The clear button shows only while a value is chosen; clearing brings the placeholder back.",
        },
      ),
      ["change"],
    ),
};

export const DisabledOptions: Story = {
  name: "Disabled options",
  render: () =>
    logEvents(
      canvas(
        `<fw-select label="Class slot" placeholder="Pick a time">
          <fw-option value="06:00">06:00 · 4 spots left</fw-option>
          <fw-option value="07:30" disabled>07:30 · full</fw-option>
          <fw-option value="18:00">18:00 · 1 spot left</fw-option>
          <fw-option value="19:30" disabled>19:30 · full</fw-option>
        </fw-select>`,
        { note: "Disabled options are skipped by arrow keys and type-to-find." },
      ),
      ["change"],
    ),
};

export const States: Story = {
  render: () =>
    canvas(
      `<fw-select label="Payment method" placeholder="Choose…" required error="Select how the member paid">
        <fw-option value="cash">Cash</fw-option>
        <fw-option value="card">Card</fw-option>
        <fw-option value="jazzcash">JazzCash</fw-option>
      </fw-select>
      <fw-select label="Membership plan" value="standard" disabled help="Plan changes need a manager">${PLAN_OPTIONS}</fw-select>
      <div class="sb-ui-row">
        <fw-select size="sm" value="basic" aria-label="Small">${PLAN_OPTIONS}</fw-select>
        <fw-select size="lg" value="basic" aria-label="Large">${PLAN_OPTIONS}</fw-select>
      </div>`,
    ),
};
