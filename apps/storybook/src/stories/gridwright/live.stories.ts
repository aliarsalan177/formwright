import type { Meta, StoryObj } from "@storybook/html";
import { mountAppStory } from "../../helpers/mount";
import { mountLiveDemo } from "../../grid/demos";

const meta: Meta = {
  title: "Gridwright/Live",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const LiveUpdates: Story = {
  name: "Live updates (5k rows)",
  render: () => {
    const shell = mountAppStory("Live grid", "Virtualized rows with real-time cell updates");
    const demo = mountLiveDemo(shell.body, shell.toolbar, (t) => {
      shell.foot.textContent = t;
    });
    shell.setDispose(() => demo.dispose());
    return shell.wrap;
  },
};
