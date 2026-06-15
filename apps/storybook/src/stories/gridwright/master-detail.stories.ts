import type { Meta, StoryObj } from "@storybook/html";
import { mountAppStory } from "../../helpers/mount";
import { mountMasterDetailDemo } from "../../grid/demos";

const meta: Meta = {
  title: "Gridwright/Master Detail",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MasterDetail: Story = {
  name: "Master / detail",
  render: () => {
    const shell = mountAppStory("Master / detail", "Expandable rows with nested grid");
    const demo = mountMasterDetailDemo(shell.body, shell.toolbar, (t) => {
      shell.foot.textContent = t;
    });
    shell.setDispose(() => demo.dispose());
    return shell.wrap;
  },
};
