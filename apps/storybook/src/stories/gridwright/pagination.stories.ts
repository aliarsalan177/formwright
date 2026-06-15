import type { Meta, StoryObj } from "@storybook/html";
import { mountAppStory } from "../../helpers/mount";
import { mountServerDemo } from "../../grid/demos";

const meta: Meta = {
  title: "Gridwright/Pagination",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ServerPagination: Story = {
  name: "Server pagination",
  render: () => {
    const shell = mountAppStory("Server mode", "Datasource returns one page at a time");
    const demo = mountServerDemo(shell.body, (t) => {
      shell.foot.textContent = t;
    });
    shell.setDispose(() => demo.dispose());
    return shell.wrap;
  },
};
