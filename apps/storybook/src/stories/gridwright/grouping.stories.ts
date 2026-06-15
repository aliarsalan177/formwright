import type { Meta, StoryObj } from "@storybook/html";
import { mountAppStory } from "../../helpers/mount";
import { mountGroupingDemo } from "../../grid/demos";

const meta: Meta = {
  title: "Gridwright/Grouping",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Grouping: Story = {
  name: "Grouping + aggregation",
  render: () => {
    const shell = mountAppStory("Grouped grid", "Status → Owner with sum aggregates");
    const demo = mountGroupingDemo(shell.body, shell.toolbar, (t) => {
      shell.foot.textContent = t;
    });
    shell.setDispose(() => demo.dispose());
    return shell.wrap;
  },
};
