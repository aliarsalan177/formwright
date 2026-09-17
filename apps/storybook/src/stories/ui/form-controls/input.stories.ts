import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type InputArgs = {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  clearable: boolean;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
};

const meta: Meta<InputArgs> = {
  title: "UI/Form Controls/Input",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-input>` is one text-like field for every input type, with label, help, error, prefix/suffix slots, a clear button and a password reveal built in. `import "@formwright/ui/input";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    type: {
      control: "select",
      options: [
        "text",
        "email",
        "password",
        "number",
        "search",
        "tel",
        "url",
        "date",
        "time",
        "datetime-local",
      ],
    },
    placeholder: { control: "text" },
    value: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    clearable: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    readonly: { control: "boolean" },
  },
  args: {
    label: "Member name",
    type: "text",
    placeholder: "e.g. Bilal Ahmed",
    value: "",
    help: "As printed on the CNIC",
    error: "",
    size: "md",
    clearable: false,
    required: false,
    disabled: false,
    readonly: false,
  },
};
export default meta;

type Story = StoryObj<InputArgs>;

export const Playground: Story = {
  render: (args) => logEvents(canvas(`<fw-input ${attrs(args)}></fw-input>`), ["input", "change"]),
};

export const Types: Story = {
  render: () =>
    logEvents(
      canvas(
        `<fw-input type="email" label="Email" placeholder="member@example.com" autocomplete="email"></fw-input>
        <fw-input type="password" label="Password" help="Use the eye button to show or hide it"></fw-input>
        <fw-input type="tel" label="Phone" placeholder="0300 1234567" inputmode="tel"></fw-input>
        <fw-input type="number" label="Weight (kg)" min="30" max="250" step="0.5"></fw-input>
        <fw-input type="date" label="Joining date"></fw-input>
        <fw-input type="time" label="Preferred slot"></fw-input>`,
      ),
      ["change"],
    ),
};

export const PrefixSuffixAndClearable: Story = {
  name: "Prefix, suffix and clearable",
  render: () =>
    logEvents(
      canvas(
        `<fw-input type="number" label="Monthly fee" value="8500" min="0" step="500">
          <span slot="prefix">PKR</span>
        </fw-input>
        <fw-input type="number" label="Session length" value="60">
          <span slot="suffix">min</span>
        </fw-input>
        <fw-input type="search" placeholder="Search members" value="Hamza" clearable></fw-input>`,
        {
          note: "The clear button appears only while there is a value; clearing fires <code>input</code> and <code>change</code>.",
        },
      ),
      ["input", "change"],
    ),
};

export const HelpAndErrors: Story = {
  name: "Help, error and required",
  render: () =>
    canvas(
      `<fw-input label="CNIC" placeholder="35202-1234567-1" pattern="\\d{5}-\\d{7}-\\d" required help="13 digits with dashes"></fw-input>
      <fw-input type="tel" label="Phone" value="0300 1234567" error="This number is already registered to another member"></fw-input>
      <fw-input label="Member ID" value="GMS-1042" readonly help="Assigned automatically"></fw-input>
      <fw-input label="Trainer" value="Usman Tariq" disabled></fw-input>`,
      {
        note: "<code>error</code> shows the message, marks the field invalid and blocks form submission.",
      },
    ),
};

export const Sizes: Story = {
  render: () =>
    canvas(
      `<fw-input size="sm" label="Small" placeholder="Small"></fw-input>
      <fw-input size="md" label="Medium" placeholder="Medium"></fw-input>
      <fw-input size="lg" label="Large" placeholder="Large"></fw-input>`,
    ),
};
