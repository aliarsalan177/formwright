import type { Meta, StoryObj } from "@storybook/html";
import { mountAppStory } from "../../helpers/mount";
import { mountOwnDataDemo } from "../../grid/demos";

const meta: Meta = {
  title: "Gridwright/Your Data",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const YourData: Story = {
  name: "Your data + pagination",
  render: () => {
    const shell = mountAppStory("Your data", "Pass your own array and control pagination");
    const demo = mountOwnDataDemo(shell.body, shell.toolbar, (t) => {
      shell.foot.textContent = t;
    });
    shell.setDispose(() => demo.dispose());
    return shell.wrap;
  },
};
