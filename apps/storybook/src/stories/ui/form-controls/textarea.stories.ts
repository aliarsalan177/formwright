import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type TextareaArgs = {
  label: string;
  placeholder: string;
  value: string;
  help: string;
  error: string;
  rows: number;
  autoresize: boolean;
  maxRows: number;
  maxlength: number;
  counter: boolean;
  size: "sm" | "md" | "lg";
  resize: "vertical" | "none";
  required: boolean;
  disabled: boolean;
};

const meta: Meta<TextareaArgs> = {
  title: "UI/Form Controls/Textarea",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-textarea>` is multi-line text in the same frame as `<fw-input>`, with optional autoresize and a character counter. `import "@formwright/ui/textarea";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    value: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    rows: { control: { type: "number", min: 1 } },
    autoresize: { control: "boolean" },
    maxRows: { control: { type: "number", min: 1 } },
    maxlength: { control: { type: "number", min: 1 } },
    counter: { control: "boolean" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    resize: { control: "select", options: ["vertical", "none"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Medical notes",
    placeholder: "Injuries, conditions, anything the trainer should know",
    value: "",
    help: "",
    error: "",
    rows: 3,
    autoresize: false,
    maxRows: 8,
    maxlength: 300,
    counter: true,
    size: "md",
    resize: "vertical",
    required: false,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<TextareaArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(canvas(`<fw-textarea ${attrs(args)}></fw-textarea>`), ["input", "change"]),
};

export const Autoresize: Story = {
  render: () =>
    canvas(
      `<fw-textarea label="Workout plan" autoresize rows="2" max-rows="6" placeholder="Type several lines…"
        value="Mon: chest and triceps&#10;Wed: back and biceps"></fw-textarea>`,
      { note: 'Grows from 2 rows up to <code>max-rows="6"</code>, then scrolls.' },
    ),
};

export const Counter: Story = {
  name: "Counter with maxlength",
  render: () =>
    logEvents(
      canvas(
        `<fw-textarea label="Trainer bio" maxlength="120" counter help="Shown on the trainer's public profile"
          value="Certified strength coach with 8 years of experience."></fw-textarea>`,
        {
          note: "<code>counter</code> shows the count against <code>maxlength</code> and announces it politely.",
        },
      ),
      ["input"],
    ),
};

export const States: Story = {
  render: () =>
    canvas(
      `<fw-textarea label="Address" resize="none" required error="Required for the membership card delivery"></fw-textarea>
      <fw-textarea label="Cancellation reason" value="Relocated to Karachi" disabled></fw-textarea>`,
    ),
};
