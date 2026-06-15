import type { Meta, StoryObj } from "@storybook/html";
import { mountSettingsBuilderMini } from "../../mounts/settings-builder";

const meta: Meta = {
  title: "Apps/Settings Builder",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Mini: Story = {
  name: "Settings builder (mini)",
  render: () => mountSettingsBuilderMini(),
};
