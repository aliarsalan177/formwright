import type { Meta, StoryObj } from "@storybook/html";
import { mountForgeMini } from "../../mounts/forge";

const meta: Meta = {
  title: "Apps/Forge",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Mini: Story = {
  name: "Forge (mini)",
  render: () => mountForgeMini(),
};
