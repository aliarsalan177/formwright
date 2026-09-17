import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type SliderArgs = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  showValue: boolean;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  disabled: boolean;
};

const meta: Meta<SliderArgs> = {
  title: "UI/Form Controls/Slider",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-slider>` chooses a number from a range by dragging, on top of a real range input; the value is always clamped to `min`..`max` and snapped to `step`. `import "@formwright/ui/slider";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    value: { control: "number" },
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    showValue: { control: "boolean" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Sessions per week",
    value: 3,
    min: 1,
    max: 7,
    step: 1,
    showValue: true,
    help: "",
    error: "",
    size: "md",
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<SliderArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(canvas(`<fw-slider ${attrs(args)}></fw-slider>`), ["input", "change"]),
};

export const StepMinMax: Story = {
  name: "Step, min and max",
  render: () =>
    logEvents(
      canvas(
        `<fw-slider label="Discount %" min="0" max="50" step="5" value="10" show-value help="In steps of 5, up to 50"></fw-slider>
        <fw-slider label="Target weight (kg)" min="40" max="120" step="0.5" value="72.5" show-value></fw-slider>
        <fw-slider label="Trainer rating" min="1" max="5" value="4" show-value size="sm" help="1 is lowest"></fw-slider>`,
        {
          note: "<code>input</code> fires continuously while dragging, <code>change</code> on release.",
        },
      ),
      ["change"],
    ),
};

export const States: Story = {
  render: () =>
    canvas(
      `<fw-slider label="Without show-value" value="40"></fw-slider>
      <fw-slider label="Pool capacity" value="30" show-value disabled></fw-slider>
      <fw-slider label="Late fee (PKR hundreds)" min="0" max="20" value="18" show-value error="Late fee cannot exceed PKR 1,500"></fw-slider>
      <div class="sb-ui-row" style="flex-direction: column; align-items: stretch">
        <fw-slider size="sm" label="Small" value="30"></fw-slider>
        <fw-slider size="lg" label="Large" value="70"></fw-slider>
      </div>`,
    ),
};
