import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  shape: "text" | "rect" | "circle";
  lines: number;
  width: string;
  height: string;
};

const meta: Meta<Args> = {
  title: "UI/Display/Skeleton",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A shimmering placeholder in the shape of content that is still loading. It is hidden from screen readers — mark the container `aria-busy` while it loads. `import "@formwright/ui/skeleton";`',
      },
    },
  },
  argTypes: {
    shape: { control: "select", options: ["text", "rect", "circle"] },
    lines: { control: { type: "number", min: 1, max: 10 }, description: "Bars, for text" },
    width: { control: "text", description: "CSS length; a bare number is px" },
    height: { control: "text", description: "Line height for text, block height otherwise" },
  },
  args: {
    shape: "text",
    lines: 3,
    width: "",
    height: "",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => canvas(`<fw-skeleton ${attrs(args)}></fw-skeleton>`),
};

export const TextLines: Story = {
  name: "Text lines",
  render: () =>
    canvas(
      `<fw-skeleton></fw-skeleton>
      <fw-skeleton lines="3"></fw-skeleton>
      <fw-skeleton lines="5" height="0.75rem" width="70%"></fw-skeleton>`,
      { note: "The last of several lines is shorter, like the end of a paragraph." },
    ),
};

export const Shapes: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-skeleton shape="circle" width="24"></fw-skeleton>
        <fw-skeleton shape="circle" width="40"></fw-skeleton>
        <fw-skeleton shape="circle" width="64"></fw-skeleton>
      </div>
      <fw-skeleton shape="rect" height="8rem"></fw-skeleton>`,
    ),
};

export const MemberCardPlaceholder: Story = {
  name: "Member card placeholder",
  render: () => {
    const card = `
      <fw-card>
        <div style="display:flex;gap:12px;align-items:center">
          <fw-skeleton shape="circle" width="48"></fw-skeleton>
          <div style="flex:1;display:grid;gap:6px">
            <fw-skeleton width="60%" height="1rem"></fw-skeleton>
            <fw-skeleton width="40%" height="0.75rem"></fw-skeleton>
          </div>
        </div>
        <fw-skeleton shape="rect" height="4rem" style="margin-top:12px"></fw-skeleton>
        <fw-skeleton lines="2" style="margin-top:12px"></fw-skeleton>
      </fw-card>`;
    return canvas(
      `<div aria-busy="true" aria-label="Loading members" style="display:grid;gap:16px">${card}${card}</div>`,
      {
        note: "Circle, text and rect composed into the shape of a member card, inside a container marked <code>aria-busy</code>.",
      },
    );
  },
};
